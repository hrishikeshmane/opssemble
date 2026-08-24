CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'github' NOT NULL,
	`host` text DEFAULT 'github.com' NOT NULL,
	`owner` text NOT NULL,
	`repository` text NOT NULL,
	`provider_repository_id` text,
	`remote_url` text NOT NULL,
	`clone_path` text NOT NULL,
	`default_branch` text,
	`status` text DEFAULT 'cloning' NOT NULL,
	`last_error` text,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_provider_repository_unique` ON `projects` (`provider`,`host`,`owner`,`repository`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_clone_path_unique` ON `projects` (`clone_path`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
