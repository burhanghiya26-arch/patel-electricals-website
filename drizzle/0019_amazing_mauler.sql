CREATE TABLE `order_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`status` enum('pending','confirmed','processing','shipped','delivered','cancelled','returned') NOT NULL,
	`statusChangedBy` int,
	`notes` text,
	`estimatedDeliveryDate` timestamp,
	`trackingNumber` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`customerId` int NOT NULL,
	`orderId` int NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`isApproved` boolean DEFAULT false,
	`helpfulCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `order_tracking` ADD CONSTRAINT `order_tracking_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_tracking` ADD CONSTRAINT `order_tracking_statusChangedBy_users_id_fk` FOREIGN KEY (`statusChangedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `order_tracking_order_idx` ON `order_tracking` (`orderId`);--> statement-breakpoint
CREATE INDEX `order_tracking_status_idx` ON `order_tracking` (`status`);--> statement-breakpoint
CREATE INDEX `order_tracking_created_idx` ON `order_tracking` (`createdAt`);--> statement-breakpoint
CREATE INDEX `reviews_product_idx` ON `reviews` (`productId`);--> statement-breakpoint
CREATE INDEX `reviews_customer_idx` ON `reviews` (`customerId`);--> statement-breakpoint
CREATE INDEX `reviews_order_idx` ON `reviews` (`orderId`);--> statement-breakpoint
CREATE INDEX `reviews_approved_idx` ON `reviews` (`isApproved`);--> statement-breakpoint
CREATE INDEX `reviews_rating_idx` ON `reviews` (`rating`);