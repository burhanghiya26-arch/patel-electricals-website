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
  passwordHash: text("passwordHash"),
  role: mysqlEnum("role", ["user", "dealer", "sales_rep", "admin"]).default("user").notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0").notNull(),

  businessName: text("businessName"),
  gstNumber: varchar("gstNumber", { length: 20 }),
  businessAddress: text("businessAddress"),
  businessPhone: varchar("businessPhone", { length: 20 }),
  businessEmail: varchar("businessEmail", { length: 320 }),

  creditLimit: decimal("creditLimit", { precision: 12, scale: 2 }).default("0"),
  usedCredit: decimal("usedCredit", { precision: 12, scale: 2 }).default("0"),
  creditApproved: boolean("creditApproved").default(false),

  assignedSalesRepId: int("assignedSalesRepId"),

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

export const adminCredentials = mysqlTable("admin_credentials", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  emailIdx: index("admin_email_idx").on(table.email),
}));

export type AdminCredential = typeof adminCredentials.$inferSelect;
export type InsertAdminCredential = typeof adminCredentials.$inferInsert;

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

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  partNumber: varchar("partNumber", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: int("categoryId").notNull(),

  keyFeatures: json("keyFeatures"),
  specifications: json("specifications"),

  seoMetaDescription: text("seoMetaDescription"),
  seoKeywords: text("seoKeywords"),

  basePrice: decimal("basePrice", { precision: 12, scale: 2 }).notNull(),
  counterPrice: decimal("counterPrice", { precision: 12, scale: 2 }),
  defaultUnit: varchar("defaultUnit", { length: 20 }).notNull().default("piece"),
  wholesalePrice: decimal("wholesalePrice", { precision: 12, scale: 2 }),

  // Har product ke ek unit par salesman ko milne wala fixed commission.
  salesmanCommissionPerUnit: decimal("salesmanCommissionPerUnit", { precision: 12, scale: 2 }).notNull().default("0"),

  purchaseCost: decimal("purchaseCost", { precision: 12, scale: 2 }),
  wholesaleMinQty: int("wholesaleMinQty").default(1).notNull(),
  wholesaleOnly: boolean("wholesaleOnly").default(false).notNull(),
  shippingWeightKg: decimal("shippingWeightKg", { precision: 8, scale: 3 }),

  compatibleModels: json("compatibleModels"),
  compatibleBrands: json("compatibleBrands"),

  alternatePartNumbers: json("alternatePartNumbers"),

  imageUrl: text("imageUrl"),
  productImages: json("productImages"),
  explodedViewUrl: text("explodedViewUrl"),

  colorOptions: json("colorOptions"),
  sizeOptions: json("sizeOptions"),

  stockQty: int("stockQty").default(0).notNull(),
  minOrderQty: int("minOrderQty").default(1).notNull(),

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

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull().default(1),
  addedPrice: decimal("addedPrice", { precision: 12, scale: 2 }),
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

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  userId: int("userId").notNull(),

  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingCost: decimal("shippingCost", { precision: 12, scale: 2 }).notNull().default("0"),
  manualShippingCharge: decimal("manualShippingCharge", { precision: 12, scale: 2 }),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0"),

  shippingAddress: text("shippingAddress").notNull(),
  shippingMethod: varchar("shippingMethod", { length: 50 }),
  shopName: varchar("shopName", { length: 255 }),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  salesmanShopId: int("salesmanShopId"),
  createdBySalesRepId: int("createdBySalesRepId"),
  salesmanCommissionRate: decimal("salesmanCommissionRate", { precision: 5, scale: 2 }),
  salesmanCommissionAmount: decimal("salesmanCommissionAmount", { precision: 12, scale: 2 }),
  // This only records that the admin has settled the commission. It does not
  // initiate any bank/UPI payment.
  salesmanCommissionPaidAt: timestamp("salesmanCommissionPaidAt"),

  paymentMethod: mysqlEnum("paymentMethod", ["upi", "bank_transfer", "card", "cod", "razorpay", "credit"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  razorpayOrderId: varchar("razorpayOrderId", { length: 100 }),
  razorpayPaymentId: varchar("razorpayPaymentId", { length: 100 }),
  razorpayFee: decimal("razorpayFee", { precision: 12, scale: 2 }),

  orderStatus: mysqlEnum("orderStatus", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  inventoryDeducted: boolean("inventoryDeducted").default(false).notNull(),

  trackingNumber: varchar("trackingNumber", { length: 100 }),
  estimatedDeliveryDate: timestamp("estimatedDeliveryDate"),

  confirmedAt: timestamp("confirmedAt"),
  processingAt: timestamp("processingAt"),
  shippedAt: timestamp("shippedAt"),
  deliveredAt: timestamp("deliveredAt"),

  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  invoiceUrl: text("invoiceUrl"),

  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("order_user_idx").on(table.userId),
  statusIdx: index("order_status_idx").on(table.orderStatus),
  orderNumberIdx: index("order_number_idx").on(table.orderNumber),
  salesmanShopIdx: index("order_salesman_shop_idx").on(table.salesmanShopId),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const salesmanShops = mysqlTable("salesman_shops", {
  id: int("id").autoincrement().primaryKey(),
  shopName: varchar("shopName", { length: 255 }).notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }).notNull(),
  shippingAddress: text("shippingAddress").notNull(),
  notes: text("notes"),
  createdBySalesRepId: int("createdBySalesRepId").notNull(),
  lastBookedBySalesRepId: int("lastBookedBySalesRepId"),
  lastBookedAt: timestamp("lastBookedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  shopNameIdx: index("salesman_shops_name_idx").on(table.shopName),
  phoneIdx: index("salesman_shops_phone_idx").on(table.customerPhone),
  lastBookedIdx: index("salesman_shops_last_booked_idx").on(table.lastBookedAt),
}));

export type SalesmanShop = typeof salesmanShops.$inferSelect;
export type InsertSalesmanShop = typeof salesmanShops.$inferInsert;

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  purchaseCost: decimal("purchaseCost", { precision: 12, scale: 2 }),

  // Order book hote samay product ki commission save hogi.
  // Percentage configured on the product, saved at order-booking time.
  salesmanCommissionPercent: decimal("salesmanCommissionPercent", { precision: 5, scale: 2 }),
  // Calculated rupees for one unit and for this full order line.
  salesmanCommissionPerUnit: decimal("salesmanCommissionPerUnit", { precision: 12, scale: 2 }),
  salesmanCommissionAmount: decimal("salesmanCommissionAmount", { precision: 12, scale: 2 }),

  selectedColor: varchar("selectedColor", { length: 100 }),
  selectedSize: varchar("selectedSize", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("order_items_order_idx").on(table.orderId),
  productIdx: index("order_items_product_idx").on(table.productId),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

export const counterSales = mysqlTable("counter_sales", {
  id: int("id").autoincrement().primaryKey(),
  billNumber: varchar("billNumber", { length: 50 }).notNull().unique(),
  saleType: mysqlEnum("saleType", ["counter", "repair", "site_work"]).notNull().default("counter"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  customerAddress: text("customerAddress"),
  customerEmail: varchar("customerEmail", { length: 320 }),
  workDescription: text("workDescription"),
  deliveryDate: varchar("deliveryDate", { length: 10 }),
  quotationNumber: varchar("quotationNumber", { length: 100 }),
  listedAmount: decimal("listedAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }).notNull().default("0"),
  grossProfit: decimal("grossProfit", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: decimal("amountPaid", { precision: 12, scale: 2 }).notNull().default("0"),
  balanceDue: decimal("balanceDue", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "upi", "card", "bank_transfer", "credit"]).notNull().default("cash"),
  paymentStatus: mysqlEnum("paymentStatus", ["paid", "partial", "pending"]).notNull().default("paid"),
  showDiscount: boolean("showDiscount").notNull().default(false),
  notes: text("notes"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  billNumberIdx: index("counter_sales_bill_number_idx").on(table.billNumber),
  createdAtIdx: index("counter_sales_created_at_idx").on(table.createdAt),
  customerPhoneIdx: index("counter_sales_customer_phone_idx").on(table.customerPhone),
}));

export const counterSaleItems = mysqlTable("counter_sale_items", {
  id: int("id").autoincrement().primaryKey(),
  counterSaleId: int("counterSaleId").notNull(),
  productId: int("productId"),
  sourceType: mysqlEnum("sourceType", ["shop_stock", "outside_material", "repair_labour", "fitting_charge"]).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("piece"),
  quantity: int("quantity").notNull().default(1),
  listedRate: decimal("listedRate", { precision: 12, scale: 2 }).notNull().default("0"),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull().default("0"),
  purchaseCost: decimal("purchaseCost", { precision: 12, scale: 2 }).notNull().default("0"),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }).notNull().default("0"),
  profit: decimal("profit", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  saleIdx: index("counter_sale_items_sale_idx").on(table.counterSaleId),
  productIdx: index("counter_sale_items_product_idx").on(table.productId),
}));

export type CounterSale = typeof counterSales.$inferSelect;
export type InsertCounterSale = typeof counterSales.$inferInsert;
export type CounterSaleItem = typeof counterSaleItems.$inferSelect;
export type InsertCounterSaleItem = typeof counterSaleItems.$inferInsert;

export const returnRequests = mysqlTable("return_requests", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  userId: int("userId").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["requested", "approved", "rejected", "completed"]).default("requested").notNull(),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orderIdx: index("return_requests_order_idx").on(table.orderId),
  userIdx: index("return_requests_user_idx").on(table.userId),
  statusIdx: index("return_requests_status_idx").on(table.status),
}));

export type ReturnRequest = typeof returnRequests.$inferSelect;
export type InsertReturnRequest = typeof returnRequests.$inferInsert;

export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  quotationNumber: varchar("quotationNumber", { length: 50 }).notNull().unique(),
  userId: int("userId").notNull(),
  items: json("items"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }),
  status: mysqlEnum("status", ["pending", "quoted", "accepted", "rejected", "expired"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  quotedPrice: decimal("quotedPrice", { precision: 12, scale: 2 }),
  expiryDate: timestamp("expiryDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("quotation_user_idx").on(table.userId),
  statusIdx: index("quotation_status_idx").on(table.status),
}));

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;

export const whatsappMessages = mysqlTable("whatsapp_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  messageType: mysqlEnum("messageType", ["support", "order_update", "quotation_update", "promotional"]).notNull(),
  messageContent: text("messageContent").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  sentStatus: mysqlEnum("sentStatus", ["pending", "sent", "delivered", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("whatsapp_user_idx").on(table.userId),
  orderIdx: index("whatsapp_order_idx").on(table.orderId),
}));

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

export const shippingRates = mysqlTable("shipping_rates", {
  id: int("id").autoincrement().primaryKey(),
  minWeight: decimal("minWeight", { precision: 8, scale: 2 }),
  maxWeight: decimal("maxWeight", { precision: 8, scale: 2 }),
  minDistance: int("minDistance"),
  maxDistance: int("maxDistance"),
  baseCost: decimal("baseCost", { precision: 12, scale: 2 }).notNull(),
  costPerKm: decimal("costPerKm", { precision: 8, scale: 2 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShippingRate = typeof shippingRates.$inferSelect;
export type InsertShippingRate = typeof shippingRates.$inferInsert;

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

export const customerNotes = mysqlTable("customer_notes", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  adminId: int("adminId").notNull().references(() => users.id, { onDelete: "restrict" }),
  noteType: mysqlEnum("noteType", ["call", "email", "meeting", "follow_up", "issue", "feedback", "other"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  isInternal: boolean("isInternal").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  customerIdIdx: index("customer_notes_customer_idx").on(table.customerId),
  adminIdIdx: index("customer_notes_admin_idx").on(table.adminId),
  createdAtIdx: index("customer_notes_created_idx").on(table.createdAt),
}));

export type CustomerNote = typeof customerNotes.$inferSelect;
export type InsertCustomerNote = typeof customerNotes.$inferInsert;

export const customerSegments = mysqlTable("customer_segments", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  segment: mysqlEnum("segment", ["vip", "regular", "inactive", "new", "at_risk", "high_value"]).notNull(),
  reason: text("reason"),
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

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  customerId: int("customerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  rating: int("rating").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isApproved: boolean("isApproved").default(false),
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

export const orderTracking = mysqlTable("order_tracking", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]).notNull(),
  statusChangedBy: int("statusChangedBy").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  estimatedDeliveryDate: timestamp("estimatedDeliveryDate"),
  trackingNumber: varchar("trackingNumber", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index("order_tracking_order_idx").on(table.orderId),
  statusIdx: index("order_tracking_status_idx").on(table.status),
  createdAtIdx: index("order_tracking_created_idx").on(table.createdAt),
}));

export type OrderTracking = typeof orderTracking.$inferSelect;
export type InsertOrderTracking = typeof orderTracking.$inferInsert;
