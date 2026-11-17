CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`plan_id` text,
	`title` text NOT NULL,
	`status` text DEFAULT '待接待' NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`quote` text,
	`staff_read_at` text
);
--> statement-breakpoint
CREATE INDEX `conversations_owner_idx` ON `conversations` (`owner`);--> statement-breakpoint
CREATE TABLE `image_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`provider_id` text,
	`prompt` text NOT NULL,
	`status` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`document` text NOT NULL,
	`thumbnail` text,
	`created_at` text NOT NULL,
	`public_id` text,
	`parent_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_public_id_unique` ON `plans` (`public_id`);--> statement-breakpoint
CREATE INDEX `plans_owner_idx` ON `plans` (`owner`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
