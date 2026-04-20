-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `openId` varchar(64) NOT NULL UNIQUE,
  `name` text,
  `email` varchar(320) UNIQUE,
  `loginMethod` varchar(64),
  `role` enum('user','dealer','sales_rep','admin') NOT NULL DEFAULT 'user',
  `businessName` text,
  `gstNumber` varchar(20),
  `businessAddress` text,
  `businessPhone` varchar(20),
  `businessEmail` varchar(320),
  `creditLimit` decimal(12,2) DEFAULT 0,
  `usedCredit` decimal(12,2) DEFAULT 0,
  `creditApproved` boolean DEFAULT false,
  `assignedSalesRepId` int,
  `isVerified` boolean DEFAULT false,
  `verificationDocuments` json,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp DEFAULT CURRENT_TIMESTAMP,
  KEY `email_idx` (`email`),
  KEY `role_idx` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin credentials table
CREATE TABLE IF NOT EXISTS `admin_credentials` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email` varchar(320) NOT NULL UNIQUE,
  `passwordHash` text NOT NULL,
  `isActive` boolean NOT NULL DEFAULT true,
  `lastLoginAt` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `admin_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `description` text,
  `parentCategoryId` int,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `category_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
CREATE TABLE IF NOT EXISTS `products` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `partNumber` varchar(100) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `description` text,
  `categoryId` int NOT NULL,
  `basePrice` decimal(12,2) NOT NULL,
  `compatibleModels` json,
  `compatibleBrands` json,
  `alternatePartNumbers` json,
  `imageUrl` text,
  `productImages` json,
  `explodedViewUrl` text,
  `colorOptions` json,
  `sizeOptions` json,
  `stockQty` int NOT NULL DEFAULT 0,
  `minOrderQty` int NOT NULL DEFAULT 1,
  `isActive` boolean DEFAULT true,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `part_number_idx` (`partNumber`),
  KEY `product_name_idx` (`name`),
  KEY `category_id_idx` (`categoryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory table
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `productId` int NOT NULL,
  `warehouseLocation` varchar(255),
  `quantityInStock` int NOT NULL DEFAULT 0,
  `minimumOrderQuantity` int NOT NULL DEFAULT 1,
  `reorderLevel` int NOT NULL DEFAULT 10,
  `lastRestockedAt` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `inventory_product_idx` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory movement table
CREATE TABLE IF NOT EXISTS `inventory_movement` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `productId` int NOT NULL,
  `quantityChanged` int NOT NULL,
  `movementType` varchar(50) NOT NULL,
  `reason` varchar(255),
  `previousQuantity` int NOT NULL,
  `newQuantity` int NOT NULL,
  `performedBy` int,
  `orderId` int,
  `notes` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  KEY `movement_product_idx` (`productId`),
  KEY `movement_order_idx` (`orderId`),
  KEY `movement_created_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cart items table
CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `productId` int NOT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `addedPrice` decimal(12,2),
  `selectedColor` varchar(100),
  `selectedSize` varchar(100),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `cart_user_idx` (`userId`),
  KEY `cart_product_idx` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orderNumber` varchar(50) NOT NULL UNIQUE,
  `userId` int NOT NULL,
  `totalAmount` decimal(12,2) NOT NULL,
  `gstAmount` decimal(12,2) NOT NULL DEFAULT 0,
  `shippingCost` decimal(12,2) NOT NULL DEFAULT 0,
  `manualShippingCharge` decimal(12,2),
  `discountAmount` decimal(12,2) DEFAULT 0,
  `shippingAddress` text NOT NULL,
  `shippingMethod` varchar(50),
  `paymentMethod` enum('upi','bank_transfer','card','cod','razorpay','credit') NOT NULL,
  `paymentStatus` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `razorpayOrderId` varchar(100),
  `razorpayPaymentId` varchar(100),
  `orderStatus` enum('pending','confirmed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  `inventoryDeducted` boolean NOT NULL DEFAULT false,
  `trackingNumber` varchar(100),
  `estimatedDeliveryDate` timestamp NULL,
  `confirmedAt` timestamp NULL,
  `processingAt` timestamp NULL,
  `shippedAt` timestamp NULL,
  `deliveredAt` timestamp NULL,
  `invoiceNumber` varchar(50),
  `invoiceUrl` text,
  `notes` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `order_user_idx` (`userId`),
  KEY `order_status_idx` (`orderStatus`),
  KEY `order_number_idx` (`orderNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order items table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orderId` int NOT NULL,
  `productId` int NOT NULL,
  `quantity` int NOT NULL,
  `unitPrice` decimal(12,2) NOT NULL,
  `totalPrice` decimal(12,2) NOT NULL,
  `selectedColor` varchar(100),
  `selectedSize` varchar(100),
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  KEY `order_items_order_idx` (`orderId`),
  KEY `order_items_product_idx` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order tracking table
CREATE TABLE IF NOT EXISTS `order_tracking` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orderId` int NOT NULL,
  `trackingNumber` varchar(100),
  `status` varchar(50) NOT NULL,
  `location` varchar(255),
  `estimatedDelivery` timestamp NULL,
  `lastUpdated` timestamp DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  KEY `tracking_order_idx` (`orderId`),
  KEY `tracking_number_idx` (`trackingNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quotations table
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `quotationNumber` varchar(50) NOT NULL UNIQUE,
  `userId` int NOT NULL,
  `items` json NOT NULL,
  `totalAmount` decimal(12,2) NOT NULL,
  `status` enum('draft','sent','accepted','rejected','expired') DEFAULT 'draft',
  `expiryDate` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `quotation_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews table
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `productId` int NOT NULL,
  `userId` int NOT NULL,
  `orderId` int,
  `rating` int NOT NULL,
  `title` varchar(255),
  `comment` text,
  `isVerified` boolean DEFAULT false,
  `helpfulCount` int DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `review_product_idx` (`productId`),
  KEY `review_user_idx` (`userId`),
  KEY `review_order_idx` (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shipping rates table
CREATE TABLE IF NOT EXISTS `shipping_rates` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `pinCode` varchar(10) NOT NULL,
  `zone` varchar(50),
  `baseRate` decimal(12,2) NOT NULL,
  `perKgRate` decimal(12,2),
  `deliveryDays` int,
  `isActive` boolean DEFAULT true,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pin code zones table
CREATE TABLE IF NOT EXISTS `pin_code_zones` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `pinCode` varchar(10) NOT NULL UNIQUE,
  `zone` varchar(50) NOT NULL,
  `state` varchar(100),
  `city` varchar(100),
  `baseShippingCost` decimal(12,2),
  `estimatedDays` int,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `pincode_zone_idx` (`pinCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- GST configuration table
CREATE TABLE IF NOT EXISTS `gst_configuration` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `gstRate` decimal(5,2) NOT NULL,
  `applicableFrom` timestamp DEFAULT CURRENT_TIMESTAMP,
  `applicableTo` timestamp NULL,
  `categoryId` int,
  `description` text,
  `isActive` boolean DEFAULT true,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer notes table
CREATE TABLE IF NOT EXISTS `customer_notes` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `orderId` int,
  `noteType` varchar(50),
  `content` text NOT NULL,
  `createdBy` int,
  `isPrivate` boolean DEFAULT false,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `notes_user_idx` (`userId`),
  KEY `notes_order_idx` (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer segments table
CREATE TABLE IF NOT EXISTS `customer_segments` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `segmentName` varchar(100) NOT NULL,
  `totalOrders` int DEFAULT 0,
  `totalSpent` decimal(12,2) DEFAULT 0,
  `lastOrderDate` timestamp NULL,
  `tier` enum('bronze','silver','gold','platinum') DEFAULT 'bronze',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `segment_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WhatsApp messages table
CREATE TABLE IF NOT EXISTS `whatsapp_messages` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `phoneNumber` varchar(20),
  `messageType` varchar(50),
  `content` text,
  `status` enum('pending','sent','delivered','failed') DEFAULT 'pending',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `whatsapp_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
INSERT INTO `admin_credentials` (`email`, `passwordHash`, `isActive`) 
VALUES ('burhanghiya26@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', true)
ON DUPLICATE KEY UPDATE `email`=`email`;
