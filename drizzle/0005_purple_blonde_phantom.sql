ALTER TABLE `products` ADD `productImages` json;--> statement-breakpoint
ALTER TABLE `products` ADD `stockQty` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `minOrderQty` int DEFAULT 1 NOT NULL;