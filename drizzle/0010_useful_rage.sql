ALTER TABLE `orders` ADD `confirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `processingAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `shippedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveredAt` timestamp;