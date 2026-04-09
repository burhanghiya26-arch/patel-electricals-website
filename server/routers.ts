import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { sendOrderConfirmationWhatsApp, sendOrderTrackingWhatsApp } from "./_core/whatsappNotification";
import { generateInvoicePDF } from "./_core/invoiceGenerator";
import { generateShippingLabel } from "./_core/shippingLabelGenerator";
import { authenticateAdmin, createAdminAccount, verifyAdminToken } from "./_core/adminAuth";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  admin: router({
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const result = await authenticateAdmin(input.email, input.password);
        if (!result.success) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: result.error || 'Authentication failed' });
        }
        
        // Set admin session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, result.token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
        
        return { success: true, token: result.token };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    setupAdmin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
      .mutation(async ({ input }) => {
        // This should only work if no admin exists yet (first time setup)
        const result = await createAdminAccount(input.email, input.password);
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error || 'Failed to create admin account' });
        }
        return { success: true };
      }),
  }),

  products: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20), offset: z.number().min(0).default(0) }))
      .query(async ({ input }) => db.getAllProducts(input.limit, input.offset)),

    search: publicProcedure
      .input(z.object({ 
        query: z.string().min(1), 
        categoryId: z.number().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional()
      }))
      .query(async ({ input }) => db.searchProducts(input.query, input.categoryId, input.minPrice, input.maxPrice)),

    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const product = await db.getProductById(input);
        if (!product) throw new TRPCError({ code: 'NOT_FOUND' });
        const inventory = await db.getInventoryByProductId(input);
        return { product, inventory };
      }),

    getByCategory: publicProcedure
      .input(z.number())
      .query(async ({ input }) => db.getProductsByCategory(input)),

    getCategories: publicProcedure.query(async () => db.getAllCategories()),

    getInventory: publicProcedure.query(async () => db.getAllInventory()),

    create: adminProcedure
      .input(z.object({
        partNumber: z.string(), name: z.string(), description: z.string().optional(),
        categoryName: z.string().default("General"),
        basePrice: z.number(),
        compatibleModels: z.array(z.string()).optional(),
        compatibleBrands: z.array(z.string()).optional(),
        alternatePartNumbers: z.array(z.string()).optional(),
        imageUrl: z.string().optional(), explodedViewUrl: z.string().optional(),
        productImages: z.array(z.string()).optional(),
        colorOptions: z.array(z.string()).optional(),
        sizeOptions: z.array(z.string()).optional(),
        stock: z.number().optional(), moq: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { stock, moq, categoryName, productImages, colorOptions, sizeOptions, ...rest } = input;
        // Find or create category by name
        const categoryId = await db.findOrCreateCategory(categoryName);
        const productData = {
          ...rest,
          categoryId,
          basePrice: String(input.basePrice),
          compatibleModels: input.compatibleModels || null,
          compatibleBrands: input.compatibleBrands || null,
          alternatePartNumbers: input.alternatePartNumbers || null,
          productImages: productImages || null,
          colorOptions: colorOptions || null,
          sizeOptions: sizeOptions || null,
        };
        await db.createProduct(productData);
        const productResult = await db.getProductByPartNumber(input.partNumber);
        if (productResult) {
          await db.upsertInventory(productResult.id, {
            quantityInStock: stock || 0,
            minimumOrderQuantity: moq || 1,
            reorderLevel: 10,
          });
        }
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(), description: z.string().optional(),
          basePrice: z.number().optional(), isActive: z.boolean().optional(),
          partNumber: z.string().optional(), categoryName: z.string().optional(),
          imageUrl: z.string().optional(), productImages: z.array(z.string()).optional(),
          colorOptions: z.array(z.string()).optional(),
          sizeOptions: z.array(z.string()).optional(),
          stock: z.number().optional(), moq: z.number().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const { categoryName, stock, moq, productImages, colorOptions, sizeOptions, ...restData } = input.data;
        const updateData: any = { ...restData };
        if (updateData.basePrice) updateData.basePrice = String(updateData.basePrice);
        if (productImages) updateData.productImages = productImages;
        if (colorOptions) updateData.colorOptions = colorOptions;
        if (sizeOptions) updateData.sizeOptions = sizeOptions;
        if (categoryName) {
          updateData.categoryId = await db.findOrCreateCategory(categoryName);
        }
        await db.updateProduct(input.id, updateData);
        // Update inventory if stock/moq provided
        if (stock !== undefined || moq !== undefined) {
          const invData: any = {};
          if (stock !== undefined) invData.quantityInStock = stock;
          if (moq !== undefined) invData.minimumOrderQuantity = moq;
          await db.upsertInventory(input.id, invData);
        }
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.deleteProduct(input);
        return { success: true };
      }),

    adminList: adminProcedure
      .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        const prods = await db.getAllProductsAdmin(input.limit, input.offset);
        // Attach inventory info to each product
        const result = await Promise.all(prods.map(async (p) => {
          const inv = await db.getInventoryByProductId(p.id);
          const cat = await db.getCategoryById(p.categoryId);
          return { ...p, inventory: inv, categoryName: cat?.name || "General" };
        }));
        return result;
      }),
  }),

  // Image upload endpoint
  upload: router({
    image: adminProcedure
      .input(z.object({ base64: z.string(), filename: z.string(), contentType: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, 'base64');
        const ext = input.filename.split('.').pop() || 'jpg';
        const key = `products/${nanoid()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),
  }),

  cart: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const items = await db.getCartItems(ctx.user.id);
      return await Promise.all(items.map(async (item) => {
        const product = await db.getProductById(item.productId);
        const inv = await db.getInventoryByProductId(item.productId);
        return { ...item, product, inventory: inv };
      }));
    }),

    add: protectedProcedure
      .input(z.object({ productId: z.number(), quantity: z.number().min(1), selectedColor: z.string().optional(), selectedSize: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const product = await db.getProductById(input.productId);
        if (!product) throw new TRPCError({ code: 'NOT_FOUND' });
        return await db.addToCart(ctx.user.id, input.productId, input.quantity, Number(product.basePrice), input.selectedColor, input.selectedSize);
      }),

    updateQuantity: protectedProcedure
      .input(z.object({ cartItemId: z.number(), quantity: z.number().min(1) }))
      .mutation(async ({ input }) => {
        await db.updateCartItemQuantity(input.cartItemId, input.quantity);
        return { success: true };
      }),

    remove: protectedProcedure.input(z.number()).mutation(async ({ input }) => db.removeFromCart(input)),
    clear: protectedProcedure.mutation(async ({ ctx }) => db.clearCart(ctx.user.id)),
  }),

  orders: router({
    list: protectedProcedure.query(async ({ ctx }) => db.getOrdersByUserId(ctx.user.id)),

    getById: protectedProcedure.input(z.number()).query(async ({ ctx, input }) => {
      const order = await db.getOrderById(input);
      if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
      if (order.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      const items = await db.getOrderItems(input);
      // Attach product info to each item
      const itemsWithProduct = await Promise.all(items.map(async (item) => {
        const product = await db.getProductById(item.productId);
        return { ...item, product };
      }));
      return { order, items: itemsWithProduct };
    }),

    create: protectedProcedure
      .input(z.object({
        shippingAddress: z.string(),
        paymentMethod: z.enum(['upi', 'bank_transfer', 'card', 'cod', 'razorpay', 'credit']),
        shippingPincode: z.string().optional(),
        shippingCost: z.number().optional().default(0),
        customerPhone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const cartItemsList = await db.getCartItems(ctx.user.id);
        if (cartItemsList.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cart is empty' });

        let totalAmount = 0;
        const orderItemsData = [];
        for (const item of cartItemsList) {
          const product = await db.getProductById(item.productId);
          if (!product) continue;
          const inventory = await db.getInventoryByProductId(item.productId);
          const availableStock = inventory?.quantityInStock || 0;
          if (availableStock < item.quantity) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `${product.name} has only ${availableStock} units available, but you requested ${item.quantity}` });
          }
          const itemTotal = Number(product.basePrice) * item.quantity;
          totalAmount += itemTotal;
          orderItemsData.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: String(Number(product.basePrice)),
            totalPrice: String(itemTotal),
            selectedColor: item.selectedColor || undefined,
            selectedSize: item.selectedSize || undefined,
          });
        }

        const orderNumber = `ORD-${Date.now()}`;

        // Create order with PENDING status - admin must confirm
        const orderId = await db.createOrder({
          orderNumber, userId: ctx.user.id,
          totalAmount: String(totalAmount + input.shippingCost), gstAmount: String(0),
          shippingCost: String(input.shippingCost), shippingAddress: input.shippingAddress,
          paymentMethod: input.paymentMethod,
          paymentStatus: 'pending',
          orderStatus: 'pending', // Always start as pending
          notes: null,
        });

        // Update totalAmount in return to include shipping
        const finalTotal = totalAmount + input.shippingCost;

        // Add order items
        if (orderId) {
          await db.addOrderItems(orderId, orderItemsData);
        }

        await db.clearCart(ctx.user.id);

        // Send WhatsApp order confirmation (fire and forget)
        const user = await db.getUserById(ctx.user.id);
        const phoneNumber = input.customerPhone || user?.businessPhone || "918780657095";
        if (phoneNumber) {
          sendOrderConfirmationWhatsApp({
            customerPhone: phoneNumber,
            customerName: user?.name || "Valued Customer",
            orderId: String(orderId),
            orderNumber,
            totalAmount: finalTotal,
            items: orderItemsData.map((item) => ({
              name: `Product #${item.productId}`,
              quantity: item.quantity,
              price: Number(item.unitPrice),
            })),
            shippingAddress: input.shippingAddress,
          }).catch((err) => console.error("Failed to send WhatsApp notification:", err));
        }

        return { orderNumber, totalAmount: finalTotal, orderId };
      }),

    getAllOrders: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        const ordersList = await db.getAllOrders(input.limit, input.offset);
        const result = await Promise.all(ordersList.map(async (order) => {
          const user = await db.getUserById(order.userId);
          const items = await db.getOrderItems(order.id);
          const itemsWithProduct = await Promise.all(items.map(async (item) => {
            const product = await db.getProductById(item.productId);
            return { ...item, productName: product?.name, partNumber: product?.partNumber, productImage: product?.imageUrl, basePrice: product?.basePrice };
          }));
          return { ...order, userName: user?.name || user?.email || 'Unknown', items: itemsWithProduct };
        }));
        return result;
      }),

    updateStatus: adminProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
        trackingNumber: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateOrderStatus(input.orderId, input.status, input.trackingNumber);
        
        // Automatically deduct inventory when order is confirmed or delivered
        if (input.status === 'confirmed' || input.status === 'delivered') {
          await db.deductInventoryForOrder(input.orderId);
        }
        
        // Restore inventory when order is cancelled
        if (input.status === 'cancelled') {
          await db.restoreInventoryForOrder(input.orderId);
        }
        
        // Send WhatsApp tracking update
        const order = await db.getOrderById(input.orderId);
        if (order) {
          const user = await db.getUserById(order.userId);
          const phoneNumber = user?.businessPhone || "918780657095";
          if (phoneNumber) {
            sendOrderTrackingWhatsApp({
              customerPhone: phoneNumber,
              customerName: user?.name || "Valued Customer",
              orderId: String(input.orderId),
              orderNumber: order.orderNumber,
              status: input.status,
              trackingNumber: input.trackingNumber,
              estimatedDelivery: input.status === 'shipped' ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN') : undefined,
            }).catch((err) => console.error("Failed to send WhatsApp tracking update:", err));
          }
        }
        
        return { success: true };
      }),

    generateInvoice: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input: orderId }) => {
        const order = await db.getOrderById(orderId);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        if (order.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this order' });
        }

        const items = await db.getOrderItems(orderId);
        const itemsWithProduct = await Promise.all(items.map(async (item) => {
          const product = await db.getProductById(item.productId);
          return {
            name: product?.name || 'Unknown Product',
            quantity: item.quantity,
            price: Number(item.unitPrice),
            total: Number(item.totalPrice),
          };
        }));

        const user = await db.getUserById(order.userId);
        const subtotal = itemsWithProduct.reduce((sum, item) => sum + item.total, 0);
        const tax = 0;
        const total = subtotal + tax + Number(order.shippingCost);

        const invoiceData = {
          orderId,
          orderNumber: order.orderNumber,
          customerName: user?.name || 'Customer',
          customerEmail: user?.email || 'N/A',
          customerPhone: user?.businessPhone || 'N/A',
          shippingAddress: order.shippingAddress,
          items: itemsWithProduct,
          subtotal,
          tax,
          total,
          orderDate: new Date(order.createdAt),
          paymentMethod: order.paymentMethod,
          orderStatus: order.orderStatus,
        };

        const pdfBuffer = await generateInvoicePDF(invoiceData);
        const timestamp = Date.now();
        const fileName = `Invoice-${order.orderNumber}-${timestamp}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, 'application/pdf');

        return { url, fileName };
      }),

    generateShippingLabel: adminProcedure
      .input(z.number())
      .mutation(async ({ input: orderId }) => {
        const order = await db.getOrderById(orderId);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });

        const items = await db.getOrderItems(orderId);
        const itemsWithProduct = await Promise.all(items.map(async (item) => {
          const product = await db.getProductById(item.productId);
          return {
            name: product?.name || 'Unknown Product',
            quantity: item.quantity,
            partNumber: product?.partNumber,
          };
        }));

        const user = await db.getUserById(order.userId);
        
        // Parse address properly - format: "Street, City, State - Zip"
        const addressParts = order.shippingAddress.split(',');
        const streetAddress = addressParts[0]?.trim() || 'N/A';
        const city = addressParts[1]?.trim() || 'N/A';
        const stateZip = addressParts[2]?.trim() || '';
        const [state, zip] = stateZip.split('-').map(s => s.trim());

        const labelData = {
          orderId,
          orderNumber: order.orderNumber,
          customerName: user?.name || 'Customer',
          customerPhone: user?.businessPhone || 'N/A',
          shippingAddress: streetAddress,
          shippingCity: city,
          shippingState: state || 'N/A',
          shippingZip: zip || 'N/A',
          items: itemsWithProduct,
          totalAmount: String(order.totalAmount),
          shopName: 'Patel Electricals',
          shopPhone: '8780657095',
          shopEmail: 'burhanghiya26@gmail.com',
          shopAddress: 'Udhana Asha Nagar, Surat - 394210',
        };

        const pdfBuffer = await generateShippingLabel(labelData);
        const timestamp = Date.now();
        const fileName = `ShippingLabel-${order.orderNumber}-${timestamp}.pdf`;
        const { url } = await storagePut(fileName, pdfBuffer, 'application/pdf');

        return { url, fileName };
      }),
  }),

  quotations: router({
    list: protectedProcedure.query(async ({ ctx }) => db.getQuotationsByUserId(ctx.user.id)),

    getById: protectedProcedure.input(z.number()).query(async ({ ctx, input }) => {
      const quotation = await db.getQuotationById(input);
      if (!quotation) throw new TRPCError({ code: 'NOT_FOUND' });
      if (quotation.userId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'NOT_FOUND' });
      return quotation;
    }),

    create: protectedProcedure
      .input(z.object({
        items: z.array(z.object({ productId: z.number(), quantity: z.number(), requestedPrice: z.number().optional() })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let totalAmount = 0;
        for (const item of input.items) {
          const product = await db.getProductById(item.productId);
          if (product) totalAmount += Number(product.basePrice) * item.quantity;
        }
        const quotationNumber = `QT-${Date.now()}`;
        await db.createQuotation({
          quotationNumber, userId: ctx.user.id,
          items: JSON.stringify(input.items), totalAmount: String(totalAmount),
          status: 'pending', expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          adminNotes: input.notes || null,
        });
        return { quotationNumber };
      }),

    getAllQuotations: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => db.getAllQuotations(input.limit, input.offset)),

    update: adminProcedure
      .input(z.object({
        quotationId: z.number(),
        status: z.enum(['pending', 'quoted', 'accepted', 'rejected', 'expired']),
        quotedPrice: z.number().optional(),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => db.updateQuotationStatus(input.quotationId, input.status, input.quotedPrice)),
  }),

  users: router({
    profile: protectedProcedure.query(async ({ ctx }) => ctx.user),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(), businessName: z.string().optional(),
        businessPhone: z.string().optional(), businessAddress: z.string().optional(),
        gstNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    getAllDealers: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => db.getAllUsers(input.limit, input.offset)),

    updateCreditLimit: adminProcedure
      .input(z.object({ userId: z.number(), creditLimit: z.number(), creditApproved: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateUserCreditLimit(input.userId, input.creditLimit, input.creditApproved);
        return { success: true };
      }),
  }),

  adminDashboard: router({
    stats: adminProcedure.query(async () => db.getDashboardStats()),

    revenueChart: adminProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ input }) => db.getRevenueByDate(input.days)),

    topProducts: adminProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => db.getTopProducts(input.limit)),

    orderStatusBreakdown: adminProcedure.query(async () => db.getOrderStatusBreakdown()),

    paymentMethodBreakdown: adminProcedure.query(async () => db.getPaymentMethodBreakdown()),

    lowStockProducts: adminProcedure
      .input(z.object({ threshold: z.number().default(10) }))
      .query(async ({ input }) => db.getLowStockProducts(input.threshold)),

    customerMetrics: adminProcedure.query(async () => db.getCustomerMetrics()),

    inventory: adminProcedure.query(async () => db.getAllInventoryWithStatus()),

    inventoryMovementHistory: adminProcedure
      .input(z.object({ productId: z.number().optional(), limit: z.number().default(100) }))
      .query(async ({ input }) => db.getInventoryMovementHistory(input.productId, input.limit)),

    lowStockSummary: adminProcedure.query(async () => db.getLowStockSummary()),

    adjustInventory: adminProcedure
      .input(z.object({
        productId: z.number(),
        quantityChange: z.number(),
        movementType: z.enum(['purchase', 'sale', 'adjustment', 'return', 'damage']),
        reason: z.string().optional(),
        orderId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.adjustInventory(
          input.productId,
          input.quantityChange,
          input.movementType,
          input.reason,
          ctx.user?.id,
          input.orderId,
          input.notes
        );
        return result || { success: false };
      }),

    updateReorderLevel: adminProcedure
      .input(z.object({ productId: z.number(), reorderLevel: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateReorderLevel(input.productId, input.reorderLevel);
        return { success: true };
      }),

    updateInventory: adminProcedure
      .input(z.object({ productId: z.number(), quantity: z.number(), moq: z.number().optional() }))
      .mutation(async ({ input }) => {
        await db.upsertInventory(input.productId, {
          quantityInStock: input.quantity,
          ...(input.moq ? { minimumOrderQuantity: input.moq } : {}),
        });
        return { success: true };
      }),

    // Shipping configuration
    getShippingRates: adminProcedure.query(async () => db.getShippingRates()),

    updateShippingRate: adminProcedure
      .input(z.object({
        id: z.number(),
        minDistance: z.number().optional(),
        maxDistance: z.number().optional(),
        baseCost: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const updated = await db.updateShippingRate(input.id, {
          minDistance: input.minDistance,
          maxDistance: input.maxDistance,
          baseCost: input.baseCost,
          isActive: input.isActive,
        });
        return updated || { success: false };
      }),

    calculateShipping: publicProcedure
      .input(z.object({ distanceKm: z.number() }))
      .query(async ({ input }) => {
        const cost = await db.calculateShippingCost(input.distanceKm);
        return { shippingCost: cost };
      }),

    calculateShippingByDistance: publicProcedure
      .input(z.object({ address: z.string().min(1) }))
      .query(async ({ input }) => {
        const cost = await db.calculateShippingByDistance(input.address);
        return { shippingCost: cost };
      }),

    setManualShippingCharge: adminProcedure
      .input(z.object({
        orderId: z.number(),
        shippingCharge: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        const success = await db.setManualShippingCharge(input.orderId, input.shippingCharge);
        return { success };
      }),

    getShippingConfig: adminProcedure.query(async () => db.getShippingConfig()),

    updateShippingConfig: adminProcedure
      .input(z.object({
        baseCost: z.number().min(0),
        costPerKm: z.number().min(0),
        freeShippingThreshold: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        const success = await db.updateShippingConfig(input.baseCost, input.costPerKm, input.freeShippingThreshold);
        return { success };
      }),

    customers: adminProcedure
      .input(z.object({
        search: z.string().optional(),
        segment: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => db.getAllCustomers(input)),

    customerDetail: adminProcedure
      .input(z.number())
      .query(async ({ input }) => db.getCustomerDetail(input)),

    customerAnalytics: adminProcedure
      .input(z.number())
      .query(async ({ input }) => db.getCustomerAnalytics(input)),

    addCustomerNote: adminProcedure
      .input(z.object({
        customerId: z.number(),
        noteType: z.enum(['call', 'email', 'meeting', 'follow_up', 'issue', 'feedback', 'other']),
        subject: z.string().optional(),
        content: z.string(),
        isInternal: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) throw new TRPCError({ code: 'UNAUTHORIZED' });
        await db.addCustomerNote(input.customerId, ctx.user.id, {
          noteType: input.noteType,
          subject: input.subject,
          content: input.content,
          isInternal: input.isInternal,
        });
        return { success: true };
      }),

    updateCustomerSegment: adminProcedure
      .input(z.object({
        customerId: z.number(),
        segment: z.enum(['vip', 'regular', 'inactive', 'new', 'at_risk', 'high_value']),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateCustomerSegment(input.customerId, input.segment, input.reason);
        return { success: true };
      }),

    customersBySegment: adminProcedure
      .input(z.enum(['vip', 'regular', 'inactive', 'new', 'at_risk', 'high_value']))
      .query(async ({ input }) => db.getCustomersBySegment(input)),

    customerNotes: adminProcedure
      .input(z.object({
        customerId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => db.getCustomerNotes(input.customerId, input.limit)),

    getAllCategories: adminProcedure
      .query(async () => db.getAllCategories()),

    createCategory: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createCategory({
          name: input.name,
          description: input.description || null,
          createdAt: new Date(),
        });
        return { success: true };
      }),

    updateCategory: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.updateCategory(input.id, input.name, input.description);
        return { success };
      }),

     deleteCategory: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const success = await db.deleteCategory(input);
        return { success };
      }),

    getLowStockAlerts: adminProcedure.query(async () => {
      const { getLowStockAlerts } = await import("./_core/inventorySync");
      return getLowStockAlerts();
    }),

    getInventorySyncStatus: adminProcedure.query(async () => {
      const { getInventorySyncStatus } = await import("./_core/inventorySync");
      return getInventorySyncStatus();
    }),

    bulkUpdateInventory: adminProcedure
      .input(z.array(z.object({
        productId: z.number(),
        quantityInStock: z.number().min(0),
      })))
      .mutation(async ({ input }) => {
        const { bulkUpdateInventory } = await import("./_core/inventorySync");
        const results = await bulkUpdateInventory(input);
        return { success: true, updatedCount: results.length, results };
      }),

    resetStats: adminProcedure.mutation(async () => {
      try {
        await db.executeRaw(`DELETE FROM order_items`);
        await db.executeRaw(`DELETE FROM order_tracking`);
        await db.executeRaw(`DELETE FROM orders`);
        await db.executeRaw(`DELETE FROM quotations`);
        await db.executeRaw(`DELETE FROM cart_items`);
        await db.executeRaw(`DELETE FROM reviews`);
        await db.executeRaw(`UPDATE inventory SET quantityInStock = 100, reorderLevel = 10`);
        return { success: true, message: "All stats have been reset" };
      } catch (error) {
        console.error("Reset stats error:", error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to reset stats' });
      }
    }),
  }),

  reviews: router({
    create: protectedProcedure
      .input(z.object({
        productId: z.number(),
        orderId: z.number(),
        rating: z.number().min(1).max(5),
        title: z.string().min(1).max(255),
        content: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createReview({
          productId: input.productId,
          customerId: ctx.user.id,
          orderId: input.orderId,
          rating: input.rating,
          title: input.title,
          content: input.content,
        });
        return { success: true };
      }),

    getProductReviews: publicProcedure
      .input(z.number())
      .query(async ({ input }) => db.getProductReviews(input, true)),

    getProductRating: publicProcedure
      .input(z.number())
      .query(async ({ input }) => db.getProductRating(input)),

    getCustomerReviews: protectedProcedure
      .query(async ({ ctx }) => db.getCustomerReviews(ctx.user.id)),

    approveReview: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const success = await db.approveReview(input);
        return { success };
      }),

    deleteReview: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const success = await db.deleteReview(input);
        return { success };
      }),

    getAllReviews: adminProcedure
      .query(async () => db.getAllReviews()),
  }),

  orderTracking: router({
    getTimeline: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const order = await db.getOrderById(input);
        if (!order || (order.userId !== ctx.user.id && ctx.user.role !== 'admin')) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return db.getOrderTimeline(input);
      }),

    getTracking: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const order = await db.getOrderById(input);
        if (!order || (order.userId !== ctx.user.id && ctx.user.role !== 'admin')) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return db.getOrderTracking(input);
      }),

    updateStatus: adminProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.string(),
        notes: z.string().optional(),
        trackingNumber: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.updateOrderStatus(input.orderId, input.status, input.trackingNumber);
        await db.createOrderTracking({
          orderId: input.orderId,
          status: input.status,
          statusChangedBy: ctx.user.id,
          notes: input.notes,
          trackingNumber: input.trackingNumber,
        });
        return { success };
      }),
  }),

});
export type AppRouter = typeof appRouter;
