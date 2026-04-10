import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerChatRoutes } from "./chat";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

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
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
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
