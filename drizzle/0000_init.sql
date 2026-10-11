CREATE TABLE `app_meta` (
	`key` varchar(64) NOT NULL,
	`value` text NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `app_meta_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` varchar(64) NOT NULL,
	`course_id` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('quiz','exam','practical','assignment') NOT NULL,
	`due_date` varchar(10) NOT NULL,
	`status` enum('upcoming','submitted','graded','overdue') NOT NULL,
	`score` int,
	`max_score` int NOT NULL,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificate_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`certificate_id` varchar(32) NOT NULL,
	`action` enum('imported','issued','updated','revoked','expired','restored') NOT NULL,
	`reason` text,
	`actor` varchar(191) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `certificate_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` varchar(32) NOT NULL,
	`holder_name` varchar(191) NOT NULL,
	`holder_user_id` varchar(64),
	`course_id` varchar(64) NOT NULL,
	`course_title` varchar(255) NOT NULL,
	`issued_by_partner_id` varchar(64),
	`issued_by_name` varchar(191) NOT NULL,
	`issue_date` varchar(10) NOT NULL,
	`expiry_date` varchar(10),
	`status` enum('valid','expired','revoked') NOT NULL,
	`status_reason` text,
	`grade` varchar(8),
	`mode` enum('online','offline','hybrid') NOT NULL,
	`hours` int NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`phone` varchar(40),
	`subject` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`status` enum('new','read','archived') NOT NULL DEFAULT 'new',
	`ip_hash` varchar(64) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`course_id` varchar(64) NOT NULL,
	`mode` enum('online','offline','hybrid') NOT NULL,
	`enrolled_at` varchar(10) NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`completed_lessons` int NOT NULL DEFAULT 0,
	`total_lessons` int NOT NULL DEFAULT 0,
	`last_accessed_at` varchar(10) NOT NULL,
	`status` enum('active','completed','paused') NOT NULL,
	`next_lesson_title` varchar(255),
	`certificate_id` varchar(32),
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`type` enum('course','assessment','certificate','payment','system') NOT NULL,
	`created_at_iso` varchar(25) NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`href` varchar(255),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_applications` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`org_name` varchar(191) NOT NULL,
	`org_type` varchar(64) NOT NULL,
	`contact_name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`district` varchar(100) NOT NULL,
	`category_id` varchar(64),
	`mode` varchar(16),
	`about` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`ip_hash` varchar(64) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `partner_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`course_id` varchar(64) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BDT',
	`method` varchar(32) NOT NULL,
	`status` enum('paid','pending','refunded','failed') NOT NULL,
	`date` varchar(10) NOT NULL,
	`invoice_no` varchar(40) NOT NULL,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_invoice_no_unique` UNIQUE(`invoice_no`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`name` varchar(191) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`email` varchar(191) NOT NULL,
	`phone` varchar(40),
	`role` enum('student','instructor','partner','admin') NOT NULL,
	`location` varchar(191),
	`joined_at` varchar(10) NOT NULL,
	`partner_id` varchar(64),
	`instructor_id` varchar(64),
	`learning_hours` int NOT NULL DEFAULT 0,
	`weekly_hours` json,
	`password_hash` varchar(255),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification_logs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`query` varchar(64) NOT NULL,
	`found` boolean NOT NULL,
	`certificate_id` varchar(32),
	`status` varchar(16),
	`ip_hash` varchar(64) NOT NULL,
	`user_agent` varchar(255),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `verification_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `assessments_course_idx` ON `assessments` (`course_id`);--> statement-breakpoint
CREATE INDEX `certificate_events_cert_idx` ON `certificate_events` (`certificate_id`);--> statement-breakpoint
CREATE INDEX `certificates_holder_idx` ON `certificates` (`holder_user_id`);--> statement-breakpoint
CREATE INDEX `certificates_partner_idx` ON `certificates` (`issued_by_partner_id`);--> statement-breakpoint
CREATE INDEX `contact_messages_ip_idx` ON `contact_messages` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `enrollments_user_idx` ON `enrollments` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `partner_applications_ip_idx` ON `partner_applications` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `payments_user_idx` ON `payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `verification_logs_ip_idx` ON `verification_logs` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `verification_logs_cert_idx` ON `verification_logs` (`certificate_id`);