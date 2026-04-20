CREATE TABLE `inventory_movement` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`quantityChanged` int NOT NULL,
	`movementType` varchar(50) NOT NULL,
	`reason` varchar(255),
	`previousQuantity` int NOT NULL,
	`newQuantity` int NOT NULL,
	`performedBy` int,
	`orderId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_movement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `movement_product_idx` ON `inventory_movement` (`productId`);--> statement-breakpoint
CREATE INDEX `movement_order_idx` ON `inventory_movement` (`orderId`);--> statement-breakpoint
CREATE INDEX `movement_created_idx` ON `inventory_movement` (`createdAt`);