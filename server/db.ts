import { eq, and, like, desc, asc, sql, or, lte, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, products, inventory, cartItems, orders, orderItems,
  quotations, categories, gstConfiguration, shippingRates, inventoryMovement,
  customerNotes, customerSegments, reviews, orderTracking
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function executeRaw(sql: string): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await (db as any).execute(sql);
}

// ========================
// USER FUNCTIONS
// ========================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

export async function updateUserProfile(userId: number, data: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(users).set({ ...data, updatedAt: new Date() } as any).where(eq(users.id, userId));
  return true;
}

export async function updateUserCreditLimit(userId: number, creditLimit: number, creditApproved: boolean) {
  const db = await getDb();
  if (!db) return false;
  await db.update(users).set({
    creditLimit: String(creditLimit),
    creditApproved,
    updatedAt: new Date()
  } as any).where(eq(users.id, userId));
  return true;
}

// ========================
// PRODUCT FUNCTIONS
// ========================

export async function getProductsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).where(and(eq(products.categoryId, categoryId), eq(products.isActive, true)));
}

export async function searchProducts(query: string, categoryId?: number, minPrice?: number, maxPrice?: number) {
  const db = await getDb();
  if (!db) return [];
  const searchPattern = `%${query}%`;
  const conditions: any[] = [
    eq(products.isActive, true),
    or(
      like(products.partNumber, searchPattern),
      like(products.name, searchPattern),
      like(products.description, searchPattern)
    )
  ];
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  
  // Add price range filtering - compare as DECIMAL
  if (minPrice !== undefined) {
    conditions.push(gte(sql`CAST(${products.basePrice} AS DECIMAL(10,2))`, minPrice));
  }
  if (maxPrice !== undefined) {
    conditions.push(lte(sql`CAST(${products.basePrice} AS DECIMAL(10,2))`, maxPrice));
  }
  
  return await db.select().from(products).where(and(...conditions));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProductByPartNumber(partNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.partNumber, partNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllProducts(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).where(eq(products.isActive, true)).limit(limit).offset(offset);
}

export async function getAllProductsAdmin(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt)).limit(limit).offset(offset);
}

export async function createProduct(data: any) {
  const db = await getDb();
  if (!db) return undefined;
  
  const insertData: any = {
    partNumber: data.partNumber || `PART-${Date.now()}`,
    name: data.name || 'Unnamed Product',
    description: data.description || null,
    categoryId: data.categoryId || 1,
    basePrice: String(data.basePrice || '0'),
    compatibleModels: data.compatibleModels || null,
    compatibleBrands: data.compatibleBrands || null,
    alternatePartNumbers: data.alternatePartNumbers || null,
    imageUrl: data.imageUrl || null,
    productImages: data.productImages || null,
    explodedViewUrl: data.explodedViewUrl || null,
    colorOptions: data.colorOptions || null,
    sizeOptions: data.sizeOptions || null,
    stockQty: Number(data.stockQty || 0),
    minOrderQty: Number(data.minOrderQty || 1),
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };
  
  const result = await db.insert(products).values(insertData);
  return result;
}

export async function updateProduct(id: number, data: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(products).set({ ...data, updatedAt: new Date() } as any).where(eq(products.id, id));
  return true;
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(products).set({ isActive: false, updatedAt: new Date() } as any).where(eq(products.id, id));
  return true;
}

// ========================
// CATEGORY FUNCTIONS
// ========================

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categories);
}

export async function createCategory(data: any) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.insert(categories).values(data);
}

export async function updateCategory(id: number, name: string, description?: string) {
  const db = await getDb();
  if (!db) return false;
  await db.update(categories)
    .set({
      name,
      description: description || null,
    })
    .where(eq(categories.id, id));
  return true;
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(categories).where(eq(categories.id, id));
  return true;
}

// ========================
// INVENTORY FUNCTIONS
// ========================

export async function getInventoryByProductId(productId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inventory).where(eq(inventory.productId, productId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllInventory() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(inventory);
}

export async function upsertInventory(productId: number, data: any) {
  const db = await getDb();
  if (!db) return false;
  const existing = await getInventoryByProductId(productId);
  if (existing) {
    await db.update(inventory).set({ ...data, updatedAt: new Date() } as any).where(eq(inventory.id, existing.id));
  } else {
    await db.insert(inventory).values({ productId, ...data } as any);
  }
  return true;
}

// ========================
// CART FUNCTIONS
// ========================

export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(cartItems).where(eq(cartItems.userId, userId));
}

export async function addToCart(userId: number, productId: number, quantity: number, price?: number, selectedColor?: string, selectedSize?: string) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(cartItems).where(
    and(eq(cartItems.userId, userId), eq(cartItems.productId, productId))
  ).limit(1);
  if (existing.length > 0) {
    await db.update(cartItems).set({ quantity: existing[0].quantity + quantity, selectedColor: selectedColor || existing[0].selectedColor, selectedSize: selectedSize || existing[0].selectedSize, updatedAt: new Date() }).where(eq(cartItems.id, existing[0].id));
    return existing[0];
  }
  return await db.insert(cartItems).values({ productId, quantity, userId, addedPrice: price ? String(price) : undefined, selectedColor, selectedSize } as any);
}

export async function removeFromCart(cartItemId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  return true;
}

export async function clearCart(userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
  return true;
}

// ========================
// ORDER FUNCTIONS
// ========================

export async function createOrder(orderData: any): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(orders).values(orderData);
  // MySQL returns insertId in the result
  return (result as any)[0]?.insertId || (result as any).insertId || undefined;
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrdersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getAllOrders(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const orderList = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
  
  // Fetch items for each order with product names and images
  const ordersWithItems = await Promise.all(orderList.map(async (order) => {
    const items = await db.select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      productName: products.name,
      partNumber: products.partNumber,
      basePrice: products.basePrice,
      price: orderItems.unitPrice,
      productImage: products.imageUrl,
      selectedColor: orderItems.selectedColor,
      selectedSize: orderItems.selectedSize,
    }).from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));
    return { ...order, items };
  }));
  
  return ordersWithItems;
}

export async function updateOrderStatus(orderId: number, status: string, trackingNumber?: string) {
  const db = await getDb();
  if (!db) return false;
  const updateData: any = { orderStatus: status as any, updatedAt: new Date() };
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  
  // Record timestamp for each status change
  const now = new Date();
  if (status === 'confirmed') updateData.confirmedAt = now;
  else if (status === 'processing') updateData.processingAt = now;
  else if (status === 'shipped') updateData.shippedAt = now;
  else if (status === 'delivered') {
    updateData.deliveredAt = now;
    updateData.paymentStatus = 'completed';
  }
  
  await db.update(orders).set(updateData).where(eq(orders.id, orderId));
  return true;
}

export async function addOrderItems(orderId: number, items: any[]) {
  const db = await getDb();
  if (!db) return false;
  for (const item of items) {
    await db.insert(orderItems).values({ orderId, ...item });
  }
  return true;
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function setManualShippingCharge(orderId: number, shippingCharge: number) {
  const database = await getDb();
  if (!database) return false;
  await database.update(orders).set({ manualShippingCharge: shippingCharge as any, updatedAt: new Date() }).where(eq(orders.id, orderId));
  return true;
}

// ========================
// QUOTATION FUNCTIONS
// ========================

export async function createQuotation(quotationData: any) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.insert(quotations).values(quotationData);
}

export async function getQuotationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQuotationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(quotations).where(eq(quotations.userId, userId)).orderBy(desc(quotations.createdAt));
}

export async function getAllQuotations(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(quotations).orderBy(desc(quotations.createdAt)).limit(limit).offset(offset);
}

export async function updateQuotationStatus(quotationId: number, status: string, quotedPrice?: number) {
  const db = await getDb();
  if (!db) return false;
  const updateData: any = { status: status as any, updatedAt: new Date() };
  if (quotedPrice) updateData.quotedPrice = quotedPrice;
  await db.update(quotations).set(updateData).where(eq(quotations.id, quotationId));
  return true;
}

// ========================
// TIERED PRICING
// ========================



// ========================
// GST CONFIGURATION
// ========================

export async function getGstConfiguration() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gstConfiguration).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateGstConfiguration(data: any) {
  const db = await getDb();
  if (!db) return false;
  const existing = await getGstConfiguration();
  if (existing) {
    await db.update(gstConfiguration).set({ ...data, updatedAt: new Date() }).where(eq(gstConfiguration.id, existing.id));
  } else {
    await db.insert(gstConfiguration).values({ ...data, createdAt: new Date(), updatedAt: new Date() });
  }
  return true;
}

// ========================
// ADMIN DASHBOARD STATS
// ========================

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalUsers: 0, pendingOrders: 0, pendingQuotations: 0 };

  const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isActive, true));
  const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);
  const [revenueResult] = await db.select({ total: sql<string>`COALESCE(SUM(totalAmount), 0)` }).from(orders).where(eq(orders.paymentStatus, 'completed'));
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [pendingOrderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.orderStatus, 'pending'));
  const [pendingQuoteCount] = await db.select({ count: sql<number>`count(*)` }).from(quotations).where(eq(quotations.status, 'pending'));

  return {
    totalProducts: productCount?.count || 0,
    totalOrders: orderCount?.count || 0,
    totalRevenue: Number(revenueResult?.total || 0),
    totalUsers: userCount?.count || 0,
    pendingOrders: pendingOrderCount?.count || 0,
    pendingQuotations: pendingQuoteCount?.count || 0,
  };
}


// ========================
// ADDITIONAL HELPER FUNCTIONS
// ========================

export async function findOrCreateCategory(name: string): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  const existing = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(categories).values({ name, createdAt: new Date(), updatedAt: new Date() });
  // Get the newly created category
  const newCat = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
  return newCat.length > 0 ? newCat[0].id : 1;
}

export async function getCategoryById(id: number | null) {
  if (!id) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getShippingRates() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(shippingRates);
}

export async function updateShippingRate(id: number, data: { minDistance?: number, maxDistance?: number, baseCost?: number, isActive?: boolean }) {
  const database = await getDb();
  if (!database) return null;
  const updateData: any = { updatedAt: new Date() };
  if (data.minDistance !== undefined) updateData.minDistance = data.minDistance;
  if (data.maxDistance !== undefined) updateData.maxDistance = data.maxDistance;
  if (data.baseCost !== undefined) updateData.baseCost = data.baseCost;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  
  await database.update(shippingRates).set(updateData).where(eq(shippingRates.id, id));
  return await database.select().from(shippingRates).where(eq(shippingRates.id, id)).then(rows => rows[0]);
}

export async function calculateShippingCost(distanceKm: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const rates = await db.select().from(shippingRates).where(eq(shippingRates.isActive, true));
  if (rates.length === 0) return 0;
  
  const rate = rates[0];
  const baseCost = Number(rate.baseCost) || 0;
  const costPerKm = Number(rate.costPerKm) || 0;
  
  return baseCost + (distanceKm * costPerKm);
}


export async function updateCartItemQuantity(cartItemId: number, quantity: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(cartItems).set({ quantity, updatedAt: new Date() }).where(eq(cartItems.id, cartItemId));
  return true;
}


// Distance-based shipping calculation using Google Maps
// Calculates distance from warehouse to customer address and applies per-km charge
export async function calculateShippingByDistance(customerAddress: string) {
  const { makeRequest } = await import('./_core/map');
  const WAREHOUSE_LOCATION = "Udhana, Surat - 394210, India";

  try {
    // Use Distance Matrix API to get distance
    const result = await makeRequest<any>(
      "/maps/api/distancematrix/json",
      {
        origins: WAREHOUSE_LOCATION,
        destinations: customerAddress,
        mode: "driving",
        units: "metric"
      }
    );

    if (result.status !== "OK" || !result.rows || result.rows.length === 0) {
      console.error("Distance Matrix API error:", result);
      return 0;
    }

    const element = result.rows[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      console.error("Distance calculation failed:", element);
      return 0;
    }

    // Distance in meters, convert to km
    const distanceKm = Math.round(element.distance.value / 1000);

    // Get per-km shipping configuration
    const db = await getDb();
    if (!db) return 0;
    
    const config = await db.select().from(shippingRates).limit(1);
    if (config.length === 0) {
      console.error(`No shipping configuration found`);
      return 0;
    }

    const baseCost = Number(config[0].baseCost) || 0;
    const costPerKm = Number(config[0].costPerKm) || 0;
    
    // Calculate: Base Cost + (Distance × Cost Per Km)
    const shippingCost = baseCost + (distanceKm * costPerKm);
    return shippingCost;
  } catch (error) {
    console.error("Error calculating shipping distance:", error);
    return 0;
  }
}

// Per-kilometer shipping configuration
export async function getShippingConfig() {
  const db = await getDb();
  if (!db) return { baseCost: 0, costPerKm: 0 };
  
  const config = await db.select().from(shippingRates).limit(1);
  if (config.length === 0) {
    return { baseCost: 0, costPerKm: 0, freeShippingThreshold: 1000 };
  }
  
  return {
    baseCost: Number(config[0].baseCost) || 0,
    costPerKm: Number(config[0].costPerKm) || 0,
    freeShippingThreshold: Number(config[0].minDistance) || 1000,
  };
}

export async function updateShippingConfig(baseCost: number, costPerKm: number, freeShippingThreshold: number) {
  const db = await getDb();
  if (!db) return false;
  
  // Update first record with new config
  const existing = await db.select().from(shippingRates).limit(1);
  
  if (existing.length > 0) {
    await db.update(shippingRates)
      .set({ baseCost: String(baseCost), costPerKm: String(costPerKm), minDistance: freeShippingThreshold, updatedAt: new Date() })
      .where(eq(shippingRates.id, existing[0].id));
  } else {
    // Create first config if doesn't exist
    await db.insert(shippingRates).values({
      minDistance: freeShippingThreshold,
      maxDistance: 1000,
      baseCost: String(baseCost),
      costPerKm: String(costPerKm),
      isActive: true,
    });
  }
  
  return true;
}


// ========================
// INVENTORY DEDUCTION
// ========================

export async function deductInventoryForOrder(orderId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot deduct inventory: database not available"); return false; }

  try {
    // Get order items
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    
    if (items.length === 0) {
      console.warn("[Inventory] No items found for order", orderId);
      return false;
    }

    // Deduct inventory for each item
    for (const item of items) {
      const currentInventory = await db.select().from(inventory).where(eq(inventory.productId, item.productId));
      
      if (currentInventory.length > 0) {
        const inv = currentInventory[0];
        const newQuantity = Math.max(0, inv.quantityInStock - item.quantity);
        
        await db.update(inventory)
          .set({ quantityInStock: newQuantity, updatedAt: new Date() })
          .where(eq(inventory.id, inv.id));
      }
    }

    // Mark order as inventory deducted
    await db.update(orders)
      .set({ inventoryDeducted: true, updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    return true;
  } catch (error) {
    console.error("[Inventory] Error deducting inventory:", error);
    return false;
  }
}

export async function restoreInventoryForOrder(orderId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot restore inventory: database not available"); return false; }

  try {
    // Get order items
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    
    if (items.length === 0) {
      console.warn("[Inventory] No items found for order", orderId);
      return false;
    }

    // Restore inventory for each item
    for (const item of items) {
      const currentInventory = await db.select().from(inventory).where(eq(inventory.productId, item.productId));
      
      if (currentInventory.length > 0) {
        const inv = currentInventory[0];
        const newQuantity = inv.quantityInStock + item.quantity;
        
        await db.update(inventory)
          .set({ quantityInStock: newQuantity, updatedAt: new Date() })
          .where(eq(inventory.id, inv.id));
      }
    }

    // Mark order as inventory not deducted
    await db.update(orders)
      .set({ inventoryDeducted: false, updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    return true;
  } catch (error) {
    console.error("[Inventory] Error restoring inventory:", error);
    return false;
  }
}


// ========================
// ADVANCED ANALYTICS
// ========================

export async function getRevenueByDate(days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const result = await db.select({
    date: sql<string>`DATE(createdAt)`,
    revenue: sql<string>`COALESCE(SUM(totalAmount), 0)`,
    orderCount: sql<number>`COUNT(*)`,
  }).from(orders)
    .where(sql`createdAt >= ${startDate} AND paymentStatus = 'completed'`)
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);
  
  return result;
}

export async function getTopProducts(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    productId: orderItems.productId,
    productName: products.name,
    partNumber: products.partNumber,
    totalSold: sql<number>`SUM(${orderItems.quantity})`,
    revenue: sql<string>`SUM(${orderItems.totalPrice})`,
  }).from(orderItems)
    .innerJoin(products, sql`${orderItems.productId} = ${products.id}`)
    .groupBy(orderItems.productId, products.name, products.partNumber)
    .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
    .limit(limit);
  
  return result;
}

export async function getOrderStatusBreakdown() {
  const db = await getDb();
  if (!db) return {};
  
  const result = await db.select({
    status: orders.orderStatus,
    count: sql<number>`COUNT(*)`,
  }).from(orders)
    .groupBy(orders.orderStatus);
  
  const breakdown: Record<string, number> = {};
  result.forEach(r => {
    breakdown[r.status] = r.count;
  });
  
  return breakdown;
}

export async function getPaymentMethodBreakdown() {
  const db = await getDb();
  if (!db) return {};
  
  const result = await db.select({
    method: orders.paymentMethod,
    count: sql<number>`COUNT(*)`,
    revenue: sql<string>`SUM(totalAmount)`,
  }).from(orders)
    .where(eq(orders.paymentStatus, 'completed'))
    .groupBy(orders.paymentMethod);
  
  const breakdown: Record<string, { count: number; revenue: number }> = {};
  result.forEach(r => {
    breakdown[r.method] = { count: r.count, revenue: Number(r.revenue || 0) };
  });
  
  return breakdown;
}

export async function getLowStockProducts(threshold: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    id: products.id,
    name: products.name,
    partNumber: products.partNumber,
    basePrice: products.basePrice,
    stock: inventory.quantityInStock,
    moq: inventory.minimumOrderQuantity,
  }).from(products)
    .innerJoin(inventory, sql`${products.id} = ${inventory.productId}`)
    .where(sql`${inventory.quantityInStock} <= ${threshold} AND ${products.isActive} = true`)
    .orderBy(sql`${inventory.quantityInStock} ASC`);
  
  return result;
}

export async function getCustomerMetrics() {
  const db = await getDb();
  if (!db) return { newCustomers: 0, repeatCustomers: 0, totalRevenue: 0 };
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [newCustomers] = await db.select({ count: sql<number>`COUNT(DISTINCT userId)` })
    .from(orders)
    .where(sql`createdAt >= ${thirtyDaysAgo}`);
  
  const [repeatCustomers] = await db.select({ count: sql<number>`COUNT(DISTINCT userId)` })
    .from(orders)
    .where(sql`userId IN (SELECT userId FROM orders GROUP BY userId HAVING COUNT(*) > 1)`);
  
  const [revenue] = await db.select({ total: sql<string>`COALESCE(SUM(totalAmount), 0)` })
    .from(orders)
    .where(sql`createdAt >= ${thirtyDaysAgo} AND paymentStatus = 'completed'`);
  
  return {
    newCustomers: newCustomers?.count || 0,
    repeatCustomers: repeatCustomers?.count || 0,
    totalRevenue: Number(revenue?.total || 0),
  };
}


// ========================
// INVENTORY MANAGEMENT
// ========================

export async function adjustInventory(
  productId: number,
  quantityChange: number,
  movementType: 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage',
  reason?: string,
  performedBy?: number,
  orderId?: number,
  notes?: string
) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get current inventory
    const [current] = await db.select().from(inventory).where(eq(inventory.productId, productId));
    if (!current) throw new Error("Product inventory not found");

    const previousQty = current.quantityInStock;
    const newQty = Math.max(0, previousQty + quantityChange);

    // Update inventory
    await db.update(inventory)
      .set({ quantityInStock: newQty, updatedAt: new Date() })
      .where(eq(inventory.productId, productId));

    // Log movement
    await db.insert(inventoryMovement).values({
      productId,
      quantityChanged: quantityChange,
      movementType,
      reason,
      previousQuantity: previousQty,
      newQuantity: newQty,
      performedBy,
      orderId,
      notes,
    });

    return { previousQty, newQty, success: true };
  } catch (error) {
    console.error("[Inventory] Adjustment failed:", error);
    return null;
  }
}

export async function getInventoryWithMovement(productId: number) {
  const db = await getDb();
  if (!db) return null;

  const [inv] = await db.select().from(inventory).where(eq(inventory.productId, productId));
  if (!inv) return null;

  const movements = await db.select()
    .from(inventoryMovement)
    .where(eq(inventoryMovement.productId, productId))
    .orderBy(desc(inventoryMovement.createdAt))
    .limit(50);

  return { inventory: inv, movements };
}

export async function getAllInventoryWithStatus() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    id: inventory.id,
    productId: inventory.productId,
    productName: products.name,
    partNumber: products.partNumber,
    quantityInStock: inventory.quantityInStock,
    minimumOrderQuantity: inventory.minimumOrderQuantity,
    reorderLevel: inventory.reorderLevel,
    warehouseLocation: inventory.warehouseLocation,
    lastRestockedAt: inventory.lastRestockedAt,
    status: sql`CASE 
      WHEN ${inventory.quantityInStock} = 0 THEN 'out_of_stock'
      WHEN ${inventory.quantityInStock} <= ${inventory.reorderLevel} THEN 'low_stock'
      ELSE 'in_stock'
    END`,
  }).from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .where(eq(products.isActive, true))
    .orderBy(inventory.quantityInStock);

  return result;
}

export async function getInventoryMovementHistory(productId?: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  const baseQuery = db.select({
    id: inventoryMovement.id,
    productId: inventoryMovement.productId,
    productName: products.name,
    partNumber: products.partNumber,
    quantityChanged: inventoryMovement.quantityChanged,
    movementType: inventoryMovement.movementType,
    reason: inventoryMovement.reason,
    previousQuantity: inventoryMovement.previousQuantity,
    newQuantity: inventoryMovement.newQuantity,
    performedBy: inventoryMovement.performedBy,
    orderId: inventoryMovement.orderId,
    notes: inventoryMovement.notes,
    createdAt: inventoryMovement.createdAt,
  }).from(inventoryMovement)
    .innerJoin(products, eq(inventoryMovement.productId, products.id));

  if (productId) {
    return baseQuery.where(eq(inventoryMovement.productId, productId))
      .orderBy(desc(inventoryMovement.createdAt))
      .limit(limit);
  }

  return baseQuery.orderBy(desc(inventoryMovement.createdAt)).limit(limit);
}

export async function getLowStockSummary() {
  const db = await getDb();
  if (!db) return { total: 0, critical: 0, low: 0 };

  const [result] = await db.select({
    total: sql<number>`COUNT(*)`,
    critical: sql<number>`SUM(CASE WHEN ${inventory.quantityInStock} = 0 THEN 1 ELSE 0 END)`,
    low: sql<number>`SUM(CASE WHEN ${inventory.quantityInStock} > 0 AND ${inventory.quantityInStock} <= ${inventory.reorderLevel} THEN 1 ELSE 0 END)`,
  }).from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .where(eq(products.isActive, true));

  return {
    total: result?.total || 0,
    critical: result?.critical || 0,
    low: result?.low || 0,
  };
}

export async function updateReorderLevel(productId: number, newReorderLevel: number) {
  const db = await getDb();
  if (!db) return false;

  await db.update(inventory)
    .set({ reorderLevel: newReorderLevel, updatedAt: new Date() })
    .where(eq(inventory.productId, productId));

  return true;
}


// ========================
// CUSTOMER MANAGEMENT FUNCTIONS
// ========================

export async function getAllCustomers(filters?: {
  search?: string;
  segment?: string;
  role?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      businessName: users.businessName,
      businessPhone: users.businessPhone,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(and(
      or(eq(users.role, "user"), eq(users.role, "dealer")),
      filters?.search ? or(
        like(users.name, `%${filters.search}%`),
        like(users.email, `%${filters.search}%`),
        like(users.businessName, `%${filters.search}%`)
      ) : undefined
    ))
    .limit(limit)
    .offset(offset);
}

export async function getCustomerDetail(customerId: number) {
  const db = await getDb();
  if (!db) return null;

  const customerList = await db
    .select()
    .from(users)
    .where(eq(users.id, customerId))
    .limit(1);

  const customer = customerList.length > 0 ? customerList[0] : null;
  if (!customer) return null;

  // Get customer orders
  const customerOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      totalAmount: orders.totalAmount,
      orderStatus: orders.orderStatus,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, customerId))
    .orderBy(desc(orders.createdAt))
    .limit(20);

  // Get customer segment
  const segmentList = await db
    .select()
    .from(customerSegments)
    .where(eq(customerSegments.customerId, customerId))
    .limit(1);
  const segment = segmentList.length > 0 ? segmentList[0] : null;

  // Get recent notes
  const notes = await db
    .select()
    .from(customerNotes)
    .where(eq(customerNotes.customerId, customerId))
    .orderBy(desc(customerNotes.createdAt))
    .limit(10);

  return {
    ...customer,
    orders: customerOrders,
    segment,
    notes,
  };
}

export async function getCustomerAnalytics(customerId: number) {
  const db = await getDb();
  if (!db) return null;

  const orderList = await db
    .select({
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, customerId));

  const totalSpent = orderList.reduce((sum, o) => sum + parseFloat(o.totalAmount.toString()), 0);
  const orderCount = orderList.length;
  const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
  const lastOrderDate = orderList.length > 0 ? orderList[0].createdAt : null;
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    totalSpent,
    orderCount,
    avgOrderValue,
    lastOrderDate,
    daysSinceLastOrder,
  };
}

export async function addCustomerNote(
  customerId: number,
  adminId: number,
  noteData: {
    noteType: string;
    subject?: string;
    content: string;
    isInternal?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(customerNotes).values({
    customerId,
    adminId,
    noteType: noteData.noteType as any,
    subject: noteData.subject,
    content: noteData.content,
    isInternal: noteData.isInternal ?? true,
  });

  return result;
}

export async function updateCustomerSegment(
  customerId: number,
  segment: string,
  reason?: string
) {
  const db = await getDb();
  if (!db) return false;

  const analytics = await getCustomerAnalytics(customerId);
  if (!analytics) return false;

  const result = await db
    .insert(customerSegments)
    .values({
      customerId,
      segment: segment as any,
      reason,
      totalSpent: String(analytics.totalSpent) as any,
      orderCount: analytics.orderCount,
      lastOrderDate: analytics.lastOrderDate,
      avgOrderValue: String(analytics.avgOrderValue) as any,
      daysSinceLastOrder: analytics.daysSinceLastOrder,
    })
    .onDuplicateKeyUpdate({
      set: {
        segment: segment as any,
        reason,
        totalSpent: String(analytics.totalSpent) as any,
        orderCount: analytics.orderCount,
        lastOrderDate: analytics.lastOrderDate,
        avgOrderValue: String(analytics.avgOrderValue) as any,
        daysSinceLastOrder: analytics.daysSinceLastOrder,
        updatedAt: new Date(),
      },
    });

  return true;
}

export async function getCustomersBySegment(segment: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      businessName: users.businessName,
      segment: customerSegments.segment,
      totalSpent: customerSegments.totalSpent,
      orderCount: customerSegments.orderCount,
    })
    .from(customerSegments)
    .innerJoin(users, eq(customerSegments.customerId, users.id))
    .where(eq(customerSegments.segment, segment as any));
}

export async function getCustomerNotes(customerId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: customerNotes.id,
      noteType: customerNotes.noteType,
      subject: customerNotes.subject,
      content: customerNotes.content,
      adminName: users.name,
      createdAt: customerNotes.createdAt,
    })
    .from(customerNotes)
    .innerJoin(users, eq(customerNotes.adminId, users.id))
    .where(eq(customerNotes.customerId, customerId))
    .orderBy(desc(customerNotes.createdAt))
    .limit(limit);
}

// ========================
// REVIEWS & RATINGS
// ========================

export async function createReview(input: {
  productId: number;
  customerId: number;
  orderId: number;
  rating: number;
  title: string;
  content: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.insert(reviews).values(input);
}

export async function getProductReviews(productId: number, approvedOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(reviews.productId, productId)];
  if (approvedOnly) conditions.push(eq(reviews.isApproved, true));
  return await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      content: reviews.content,
      customerName: users.name,
      createdAt: reviews.createdAt,
      helpfulCount: reviews.helpfulCount,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.customerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(reviews.createdAt));
}

export async function getProductRating(productId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      avgRating: sql<number>`AVG(${reviews.rating})`,
      totalReviews: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isApproved, true)));
  return result[0];
}

export async function getCustomerReviews(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: reviews.id,
      productId: reviews.productId,
      productName: products.name,
      rating: reviews.rating,
      title: reviews.title,
      content: reviews.content,
      isApproved: reviews.isApproved,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(eq(reviews.customerId, customerId))
    .orderBy(desc(reviews.createdAt));
}

export async function approveReview(reviewId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(reviews).set({ isApproved: true }).where(eq(reviews.id, reviewId));
  return true;
}

export async function deleteReview(reviewId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(reviews).where(eq(reviews.id, reviewId));
  return true;
}

export async function getAllReviews() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: reviews.id,
      productId: reviews.productId,
      productName: products.name,
      customerId: reviews.customerId,
      customerName: users.name,
      rating: reviews.rating,
      title: reviews.title,
      content: reviews.content,
      isApproved: reviews.isApproved,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .innerJoin(users, eq(reviews.customerId, users.id))
    .orderBy(desc(reviews.createdAt));
}

// ========================
// ORDER TRACKING
// ========================

export async function createOrderTracking(input: {
  orderId: number;
  status: string;
  statusChangedBy?: number;
  notes?: string;
  estimatedDeliveryDate?: Date;
  trackingNumber?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.insert(orderTracking).values(input as any);
}

export async function getOrderTracking(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: orderTracking.id,
      status: orderTracking.status,
      notes: orderTracking.notes,
      estimatedDeliveryDate: orderTracking.estimatedDeliveryDate,
      trackingNumber: orderTracking.trackingNumber,
      createdAt: orderTracking.createdAt,
      changedByName: users.name,
    })
    .from(orderTracking)
    .leftJoin(users, eq(orderTracking.statusChangedBy, users.id))
    .where(eq(orderTracking.orderId, orderId))
    .orderBy(desc(orderTracking.createdAt));
}



export async function getOrderTimeline(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      status: orderTracking.status,
      createdAt: orderTracking.createdAt,
      notes: orderTracking.notes,
      trackingNumber: orderTracking.trackingNumber,
      estimatedDeliveryDate: orderTracking.estimatedDeliveryDate,
    })
    .from(orderTracking)
    .where(eq(orderTracking.orderId, orderId))
    .orderBy(asc(orderTracking.createdAt));
}

