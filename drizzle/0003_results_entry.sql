CREATE TABLE `batch_marks` (
	`student_id` int NOT NULL,
	`subject_id` varchar(64) NOT NULL,
	`marks` varchar(8),
	`grade` varchar(8),
	`grade_point` varchar(8),
	CONSTRAINT `batch_marks_student_id_subject_id_pk` PRIMARY KEY(`student_id`,`subject_id`)
);
--> statement-breakpoint
CREATE TABLE `batch_students` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`batch_id` int NOT NULL,
	`name` varchar(191) NOT NULL,
	`father_name` varchar(191),
	`mother_name` varchar(191),
	`roll_no` varchar(32),
	`reg_no` varchar(32),
	`email` varchar(191),
	`student_type` varchar(32),
	`photo` varchar(255),
	`certificate_id` varchar(32),
	`sort` int NOT NULL DEFAULT 0,
	CONSTRAINT `batch_students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificate_claims` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`certificate_id` varchar(32) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`note` text,
	`reviewed_by` varchar(64),
	`reviewed_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `certificate_claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificate_claims_user_cert_idx` UNIQUE(`user_id`,`certificate_id`)
);
--> statement-breakpoint
CREATE TABLE `result_batches` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`course_id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`course_duration` varchar(100),
	`partner_id` varchar(64),
	`status` enum('draft','submitted','published','rejected') NOT NULL DEFAULT 'draft',
	`review_note` text,
	`created_by` varchar(64) NOT NULL,
	`submitted_at` datetime,
	`published_at` datetime,
	`published_by` varchar(64),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `result_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `certificate_details` ADD `holder_email` varchar(191);--> statement-breakpoint
CREATE INDEX `batch_students_batch_idx` ON `batch_students` (`batch_id`,`sort`);--> statement-breakpoint
CREATE INDEX `certificate_claims_status_idx` ON `certificate_claims` (`status`);--> statement-breakpoint
CREATE INDEX `result_batches_partner_idx` ON `result_batches` (`partner_id`,`status`);--> statement-breakpoint
CREATE INDEX `certificate_details_email_idx` ON `certificate_details` (`holder_email`);