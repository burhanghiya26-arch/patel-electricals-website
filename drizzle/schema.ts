import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with dealer and business information.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "dealer", "sales_rep", "admin"]).default("user").notNull(),
  
  // Dealer-specific fields
  businessName: text("businessName"),
  gstNumber: varchar("gstNumber", { length: 20 }),
  businessAddress: text("businessAddress"),
  businessPhone: varchar("businessPhone", { length: 20 }),
  businessEmail: varchar("businessEmail", { length: 320 }),
  
  // Credit management
  creditLimit: decimal("creditLimit", { precision: 12, scale: 2 }).default("0"),
  usedCredit: decimal("usedCredit", { precision: 12, scale: 2 }).default("0"),
  creditApproved: boolean("creditApproved").default(false),
  
  // Sales rep assignment
  assignedSalesRepId: int("assignedSalesRepId"),
  
  // Verification
  isVerified: boolean("isVerified").default(false),
  verificationDocuments: json("verificationDocuments"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  roleIdx: index("role_idx").on(table.role),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Admin Credentials (Email/Password Authentication)
 */
export const adminCredentials = mysqlTable("admin_credentials", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(), // bcrypt hashed password
  isActive: boolean("isActive").default(true).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  emailIdx: index("admin_email_idx").on(table.email),
}));

export type AdminCredential = typeof adminCredentials.$inferSelect;
export type InsertAdminCredential = typeof adminCredentials.$inferInsert;

/**
 * Product Categories
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentCategoryId: int("parentCategoryId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: index("category_name_idx").on(table.name),
}));

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Products/Spare Parts
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  partNumber: varchar("partNumber", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: int("categoryId").notNull(),
  
  // Pricing
  basePrice: decimal("basePrice", { precision: 12, scale: 2 }).notNull(),
  
  // Compatibility
  compatibleModels: json("compatibleModels"), // Array of model names/numbers
  compatibleBrands: json("compatibleBrands"), // Array of brand names
  
  // Cross-reference
  alternatePartNumbers: json("alternatePartNumbers"), // Array of alternate part numbers
  
  // Images and diagrams
  imageUrl: text("imageUrl"), // Deprecated: use productImages instead
  productImages: json("productImages"), // Array of image URLs for gallery
  explodedViewUrl: text("explodedViewUrl"),
  
  // Variations
  colorOptions: json("colorOptions"), // Array of available colors: ["Red", "Blue", "Green"]
  sizeOptions: json("sizeOptions"), // Array of available sizes: ["S", "M", "L", "XL"]
  
  // Stock management
  stockQty: int("stockQty").default(0).notNull(),
  minOrderQty: int("minOrderQty").default(1).notNull(),
  
  // Status
  isActive: boolean("isActive").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  partNumberIdx: index("part_number_idx").on(table.partNumber),
  nameIdx: index("product_name_idx").on(table.name),
  categoryIdx: index("category_id_idx").on(table.categoryId),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Inventory/Stock Management
 */
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  warehouseLocation: varchar("warehouseLocation", { length: 255 }),
  quantityInStock: int("quantityInStock").notNull().default(0),
  minimumOrderQuantity: int("minimumOrderQuantity").notNull().default(1),
  reorderLevel: int("reorderLevel").notNull().default(10),
  lastRestockedAt: timestamp("lastRestockedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdx: index("inventory_product_idx").on(table.productId),
}));

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

/**
 * Inventory Movement History
 */
export const inventoryMovement = mysqlTable("inventory_movement", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  quantityChanged: int("quantityChanged").notNull(),
  movementType: varchar("movementType", { length: 50 }).notNull(),
  reason: varchar("reason", { length: 255 }),
  previousQuantity: int("previousQuantity").notNull(),
  newQuantity: int("newQuantity").notNull(),
  performedBy: int("performedBy"),
  orderId: int("orderId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("movement_product_idx").on(table.productId),
  orderIdx: index("movement_order_idx").on(table.orderId),
  createdIdx: index("movement_created_idx").on(table.createdAt),
}));

export type InventoryMovement = typeof inventoryMovement.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovement.$inferInsert;

/**
 * Shopping Cart
 */
export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull().default(1),
  addedPrice: decimal("addedPrice", { precision: 12, scale: 2 }), // Price at time of adding
  selectedColor: varchar("selectedColor", { length: 100 }),
  selectedSize: varchar("selectedSize", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("cart_user_idx").on(table.userId),
  productIdx: index("cart_product_idx").on(table.productId),
}));

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

/**
 * Orders
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  userId: int("userId").notNull(),
  
  // Order details
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingCost: decimal("shippingCost", { precision: 12, scale: 2 }).notNull().default("0"),
  manualShippingCharge: decimal("manualShippingCharge", { precision: 12, scale: 2 }),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0"),
  
  // Shipping
  shippingAddress: text("shippingAddress").notNull(),
  shippingMethod: varchar("shippingMethod", { length: 50 }),
  
  // Payment
  paymentMethod: mysqlEnum("paymentMethod", ["upi", "bank_transfer", "card", "cod", "razorpay", "credit"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  razorpayOrderId: varchar("razorpayOrderId", { length: 100 }),
  razorpayPaymentId: varchar("razorpayPaymentId", { length: 100 }),
  
  // Order status
  orderStatus: mysqlEnum("orderStatus", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  inventoryDeducted: boolean("inventoryDeducted").default(false).notNull(),
  
  // Tracking
  trackingNumber: varchar("trackingNumber", { length: 100 }),
  estimatedDeliveryDate: timestamp("estimatedDeliveryDate"),
  
  // Status timestamps
  confirmedAt: timestamp("confirmedAt"),
  processingAt: timestamp("processingAt"),
  shippedAt: timestamp("shippedAt"),
  deliveredAt: timestamp("deliveredAt"),
  
  // GST Invoice
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  invoiceUrl: text("invoiceUrl"),
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("order_user_idx").on(table.userId),
  statusIdx: index("order_status_idx").on(table.orderStatus),
  orderNumberIdx: index("order_number_idx").on(table.orderNumber),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order Items (Line items in an order)
 */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  selectedColor: varchar("selectedColor", { length: 100 }),
  selectedSize: varchar("selectedSize", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("order_items_order_idx").on(table.orderId),
  productIdx: index("order_items_product_idx").on(table.productId),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Quotations
 */
export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  quotationNumber: varchar("quotationNumber", { length: 50 }).notNull().unique(),
  userId: int("userId").notNull(),
  
  // Quotation details
  items: json("items"), // Array of {productId, quantity, requestedPrice}
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }),
  
  // Status
  status: mysqlEnum("status", ["pending", "quoted", "accepted", "rejected", "expired"]).default("pending").notNull(),
  
  // Admin notes
  adminNotes: text("adminNotes"),
  quotedPrice: decimal("quotedPrice", { precision: 12, scale: 2 }),
  
  // Expiry
  expiryDate: timestamp("expiryDate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("quotation_user_idx").on(table.userId),
  statusIdx: index("quotation_status_idx").on(table.status),
}));

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

/**
 * WhatsApp Messages/Support
 */
export const whatsappMessages = mysqlTable("whatsapp_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  
  // Message details
  messageType: mysqlEnum("messageType", ["support", "order_update", "quotation_update", "promotional"]).notNull(),
  messageContent: text("messageContent").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  
  // Status
  sentStatus: mysqlEnum("sentStatus", ["pending", "sent", "delivered", "failed"]).default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("whatsapp_user_idx").on(table.userId),
  orderIdx: index("whatsapp_order_idx").on(table.orderId),
}));

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

/**
 * Shipping Calculator Configuration
 */
export const shippingRates = mysqlTable("shipping_rates", {
  id: int("id").autoincrement().primaryKey(),
  minWeight: decimal("minWeight", { precision: 8, scale: 2 }),
  maxWeight: decimal("maxWeight", { precision: 8, scale: 2 }),
  minDistance: int("minDistance"), // in km
  maxDistance: int("maxDistance"),
  baseCost: decimal("baseCost", { precision: 12, scale: 2 }).notNull(),
  costPerKm: decimal("costPerKm", { precision: 8, scale: 2 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShippingRate = typeof shippingRates.$inferSelect;
export type InsertShippingRate = typeof shippingRates.$inferInsert;

/**
 * GST Configuration
 */
export const gstConfiguration = mysqlTable("gst_configuration", {
  id: int("id").autoincrement().primaryKey(),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  gstNumber: varchar("gstNumber", { length: 20 }).notNull(),
  businessAddress: text("businessAddress"),
  businessPhone: varchar("businessPhone", { length: 20 }),
  businessEmail: varchar("businessEmail", { length: 320 }),
  gstRate: decimal("gstRate", { precision: 5, scale: 2 }).notNull().default("18"),
  invoicePrefix: varchar("invoicePrefix", { length: 10 }).default("INV"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GstConfiguration = typeof gstConfiguration.$inferSelect;
export type InsertGstConfiguration = typeof gstConfiguration.$inferInsert;

/**
 * PIN Code Shipping Zones
 */
export const pinCodeZones = mysqlTable("pin_code_zones", {
  id: int("id").autoincrement().primaryKey(),
  pinCodeStart: varchar("pinCodeStart", { length: 6 }).notNull(),
  pinCodeEnd: varchar("pinCodeEnd", { length: 6 }).notNull(),
  zone: varchar("zone", { length: 50 }).notNull(),
  areaName: varchar("areaName", { length: 100 }).notNull(),
  shippingCost: decimal("shippingCost", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  pinCodeIdx: index("pin_code_start_idx").on(table.pinCodeStart),
}));

export type PinCodeZone = typeof pinCodeZones.$inferSelect;
export type InsertPinCodeZone = typeof pinCodeZones.$inferInsert;

/**
 * Customer Notes - Track admin communication and interactions with customers
 */
export const customerNotes = mysqlTable("customer_notes", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  adminId: int("adminId").notNull().references(() => users.id, { onDelete: "restrict" }),
  noteType: mysqlEnum("noteType", ["call", "email", "meeting", "follow_up", "issue", "feedback", "other"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  isInternal: boolean("isInternal").default(true), // Only visible to admin
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  customerIdIdx: index("customer_notes_customer_idx").on(table.customerId),
  adminIdIdx: index("customer_notes_admin_idx").on(table.adminId),
  createdAtIdx: index("customer_notes_created_idx").on(table.createdAt),
}));

export type CustomerNote = typeof customerNotes.$inferSelect;
export type InsertCustomerNote = typeof customerNotes.$inferInsert;

/**
 * Customer Segments - Categorize customers for targeting and analysis
 */
export const customerSegments = mysqlTable("customer_segments", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  segment: mysqlEnum("segment", ["vip", "regular", "inactive", "new", "at_risk", "high_value"]).notNull(),
  reason: text("reason"), // Why they're in this segment
  totalSpent: decimal("totalSpent", { precision: 12, scale: 2 }).default("0"),
  orderCount: int("orderCount").default(0),
  lastOrderDate: timestamp("lastOrderDate"),
  avgOrderValue: decimal("avgOrderValue", { precision: 12, scale: 2 }).default("0"),
  daysSinceLastOrder: int("daysSinceLastOrder"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  customerIdIdx: index("customer_segments_customer_idx").on(table.customerId),
  segmentIdx: index("customer_segments_segment_idx").on(table.segment),
}));

export type CustomerSegment = typeof customerSegments.$inferSelect;
export type InsertCustomerSegment = typeof customerSegments.$inferInsert;


/**
 * Product Reviews - Customer reviews and ratings for products
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  rating: int("rating").notNull(), // 1-5 stars
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isApproved: boolean("isApproved").default(false), // Admin moderation
  helpfulCount: int("helpfulCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdIdx: index("reviews_product_idx").on(table.productId),
  customerIdIdx: index("reviews_customer_idx").on(table.customerId),
  orderIdIdx: index("reviews_order_idx").on(table.orderId),
  approvedIdx: index("reviews_approved_idx").on(table.isApproved),
  ratingIdx: index("reviews_rating_idx").on(table.rating),
}));
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Order Tracking - Track order status changes with timestamps
 */
export const orderTracking = mysqlTable("order_tracking", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]).notNull(),
  statusChangedBy: int("statusChangedBy").references(() => users.id, { onDelete: "set null" }), // Admin who changed status
  notes: text("notes"), // Additional notes for this status change
  estimatedDeliveryDate: timestamp("estimatedDeliveryDate"),
  trackingNumber: varchar("trackingNumber", { length: 100 }), // Courier tracking number
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index("order_tracking_order_idx").on(table.orderId),
  statusIdx: index("order_tracking_status_idx").on(table.status),
  createdAtIdx: index("order_tracking_created_idx").on(table.createdAt),
}));
export type OrderTracking = typeof orderTracking.$inferSelect;
export type InsertOrderTracking = typeof orderTracking.$inferInsert;


