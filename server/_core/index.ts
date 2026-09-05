import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import mysql from "mysql2/promise";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerChatRoutes } from "./chat";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeDefaultAdmin } from "./adminInit";

const CATALOG_SITE_URL = "https://patelspares.com";

async function ensureProductContentColumns(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] Product content columns were not checked because DATABASE_URL is unavailable");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const columns = [
    { name: "keyFeatures", definition: "JSON NULL" },
    { name: "specifications", definition: "JSON NULL" },
    { name: "seoMetaDescription", definition: "TEXT NULL" },
    { name: "seoKeywords", definition: "TEXT NULL" },
  ];

  try {
    for (const column of columns) {
      try {
        await connection.execute(`ALTER TABLE \`products\` ADD COLUMN \`${column.name}\` ${column.definition}`);
        console.log(`[Database] Added products.${column.name}`);
      } catch (error: any) {
        // MySQL/MariaDB error 1060 means the column was already added.
        if (error?.code !== "ER_DUP_FIELDNAME" && error?.errno !== 1060) throw error;
      }
    }
  } finally {
    await connection.end();
  }
}

function escapeCatalogCsv(value: unknown): string {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function getCatalogImageUrl(product: any): string {
  if (Array.isArray(product.productImages)) {
    const firstImage = product.productImages.find((image: unknown) => typeof image === "string" && image.trim());
    if (firstImage) return firstImage;
  }

  if (typeof product.productImages === "string") {
    try {
      const images = JSON.parse(product.productImages);
      if (Array.isArray(images)) {
        const firstImage = images.find((image: unknown) => typeof image === "string" && image.trim());
        if (firstImage) return firstImage;
      }
    } catch {
      // Fall back to the legacy single-image field below.
    }
  }

  return typeof product.imageUrl === "string" ? product.imageUrl : "";
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Keep existing product data intact while adding the fields used by the
  // Product Details and SEO feature.
  await ensureProductContentColumns();

  // Initialize default admin account if needed
  await initializeDefaultAdmin().catch(err => {
    console.warn('[Server] Failed to initialize admin:', err.message);
  });

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Public Meta Commerce product feed. Meta refreshes this URL to keep the
  // Instagram catalog aligned with the active products on patelspares.com.
  app.get("/catalog-feed.csv", async (_req, res) => {
    try {
      const db = await import("../db");
      const products = await db.getAllProducts(1000, 0);
      const headers = [
        "id",
        "title",
        "description",
        "availability",
        "condition",
        "price",
        "link",
        "image_link",
        "brand",
        "mpn",
      ];

      const rows = products
        .filter((product: any) => getCatalogImageUrl(product))
        .map((product: any) => {
          const quantity = Number(product.quantityInStock ?? product.stockQty ?? 0);
          const price = Number(product.basePrice ?? 0);
          return [
            product.id,
            product.name,
            product.description || product.name,
            quantity > 0 ? "in stock" : "out of stock",
            "new",
            `${Number.isFinite(price) ? price.toFixed(2) : "0.00"} INR`,
            `${CATALOG_SITE_URL}/products/${product.id}`,
            getCatalogImageUrl(product),
            "Patel Electricals",
            product.partNumber || product.id,
          ]
            .map(escapeCatalogCsv)
            .join(",");
        });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=600");
      res.send([headers.join(","), ...rows].join("\n"));
    } catch (error) {
      console.error("[CatalogFeed] Failed to generate product feed", error);
      res.status(500).send("Unable to generate catalog feed");
    }
  });

  // Chat API with streaming and tool calling
  registerChatRoutes(app);
  // Invoice download endpoint with proper headers for mobile
  app.get('/api/download-invoice/:orderId', async (req, res) => {
    try {
      const orderId = Number(req.params.orderId);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: 'Invalid order ID' });
      }
      
      // Get order from database
      const db = await import('../db');
      const order = await db.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Get order items
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
      
      // Get user
      const user = await db.getUserById(order.userId);
      const subtotal = itemsWithProduct.reduce((sum, item) => sum + item.total, 0);
      const tax = 0;
      const total = subtotal + tax + Number(order.shippingCost);
      
      // Generate invoice
      const { generateInvoicePDF } = await import('./invoiceGenerator');
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
      
      // Set proper headers for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Invoice download error:', error);
      res.status(500).json({ error: 'Failed to generate invoice' });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
