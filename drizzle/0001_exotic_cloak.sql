CREATE TABLE `cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`addedPrice` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`parentCategoryId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gst_configuration` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessName` varchar(255) NOT NULL,
	`gstNumber` varchar(20) NOT NULL,
	`businessAddress` text,
	`businessPhone` varchar(20),
	`businessEmail` varchar(320),
	`gstRate` decimal(5,2) NOT NULL DEFAULT '18',
	`invoicePrefix` varchar(10) DEFAULT 'INV',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gst_configuration_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`warehouseLocation` varchar(255),
	`quantityInStock` int NOT NULL DEFAULT 0,
	`minimumOrderQuantity` int NOT NULL DEFAULT 1,
	`reorderLevel` int NOT NULL DEFAULT 10,
	`lastRestockedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`totalPrice` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`userId` int NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	`gstAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`shippingCost` decimal(12,2) NOT NULL DEFAULT '0',
	`discountAmount` decimal(12,2) DEFAULT '0',
	`shippingAddress` text NOT NULL,
	`shippingMethod` varchar(50),
	`paymentMethod` enum('upi','bank_transfer','card','cod','razorpay') NOT NULL,
	`paymentStatus` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`razorpayOrderId` varchar(100),
	`razorpayPaymentId` varchar(100),
	`orderStatus` enum('pending','confirmed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`trackingNumber` varchar(100),
	`estimatedDeliveryDate` timestamp,
	`invoiceNumber` varchar(50),
	`invoiceUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partNumber` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`categoryId` int NOT NULL,
	`basePrice` decimal(12,2) NOT NULL,
	`compatibleModels` json,
	`compatibleBrands` json,
	`alternatePartNumbers` json,
	`imageUrl` text,
	`explodedViewUrl` text,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_partNumber_unique` UNIQUE(`partNumber`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationNumber` varchar(50) NOT NULL,
	`userId` int NOT NULL,
	`items` json,
	`totalAmount` decimal(12,2),
	`status` enum('pending','quoted','accepted','rejected','expired') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`quotedPrice` decimal(12,2),
	`expiryDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotations_quotationNumber_unique` UNIQUE(`quotationNumber`)
);
--> statement-breakpoint
CREATE TABLE `shipping_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minWeight` decimal(8,2),
	`maxWeight` decimal(8,2),
	`minDistance` int,
	`maxDistance` int,
	`baseCost` decimal(12,2) NOT NULL,
	`costPerKm` decimal(8,2),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipping_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tiered_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`minQuantity` int NOT NULL,
	`maxQuantity` int,
	`discountPercentage` decimal(5,2) NOT NULL,
	`specialPrice` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tiered_pricing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`messageType` enum('support','order_update','quotation_update','promotional') NOT NULL,
	`messageContent` text NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`sentStatus` enum('pending','sent','delivered','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','dealer','sales_rep','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `businessName` text;--> statement-breakpoint
ALTER TABLE `users` ADD `gstNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `businessAddress` text;--> statement-breakpoint
ALTER TABLE `users` ADD `businessPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `businessEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `users` ADD `creditLimit` decimal(12,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `users` ADD `usedCredit` decimal(12,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `users` ADD `creditApproved` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `assignedSalesRepId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `isVerified` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `verificationDocuments` json;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `cart_user_idx` ON `cart_items` (`userId`);--> statement-breakpoint
CREATE INDEX `cart_product_idx` ON `cart_items` (`productId`);--> statement-breakpoint
CREATE INDEX `category_name_idx` ON `categories` (`name`);--> statement-breakpoint
CREATE INDEX `inventory_product_idx` ON `inventory` (`productId`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`orderId`);--> statement-breakpoint
CREATE INDEX `order_items_product_idx` ON `order_items` (`productId`);--> statement-breakpoint
CREATE INDEX `order_user_idx` ON `orders` (`userId`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `orders` (`orderStatus`);--> statement-breakpoint
CREATE INDEX `order_number_idx` ON `orders` (`orderNumber`);--> statement-breakpoint
CREATE INDEX `part_number_idx` ON `products` (`partNumber`);--> statement-breakpoint
CREATE INDEX `product_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `category_id_idx` ON `products` (`categoryId`);--> statement-breakpoint
CREATE INDEX `quotation_user_idx` ON `quotations` (`userId`);--> statement-breakpoint
CREATE INDEX `quotation_status_idx` ON `quotations` (`status`);--> statement-breakpoint
CREATE INDEX `tiered_pricing_product_idx` ON `tiered_pricing` (`productId`);--> statement-breakpoint
CREATE INDEX `whatsapp_user_idx` ON `whatsapp_messages` (`userId`);--> statement-breakpoint
CREATE INDEX `whatsapp_order_idx` ON `whatsapp_messages` (`orderId`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);