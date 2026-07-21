-- APPONEXT HRMS - DEPENDENCY FIX
-- Create tables with proper dependency ordering

-- ============================================================
-- PERFORMANCE MODULE - performance_reviews (needs only org/emp)
-- ============================================================

CREATE TABLE IF NOT EXISTS `performance_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `cycle_id` BIGINT UNSIGNED,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `reviewer_id` BIGINT UNSIGNED,
  `review_type` ENUM('self', 'manager', '360_feedback', 'peer', 'subordinate') NOT NULL,
  `overall_rating` DECIMAL(3,2),
  `status` ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
  `submission_date` TIMESTAMP NULL,
  `review_comments` LONGTEXT,
  `ratings_json` JSON,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL,
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECRUITMENT MODULE - job_openings (needs only org)
-- ============================================================

CREATE TABLE IF NOT EXISTS `job_openings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `job_title` VARCHAR(255) NOT NULL,
  `job_code` VARCHAR(100) NOT NULL,
  `department_id` BIGINT UNSIGNED,
  `description` LONGTEXT,
  `responsibilities` LONGTEXT,
  `requirements` LONGTEXT,
  `position_count` INT DEFAULT 1,
  `filled_count` INT DEFAULT 0,
  `salary_min` DECIMAL(15,2),
  `salary_max` DECIMAL(15,2),
  `job_type` ENUM('full_time', 'part_time', 'contract', 'intern') DEFAULT 'full_time',
  `status` ENUM('draft', 'published', 'closed') DEFAULT 'draft',
  `published_at` TIMESTAMP NULL,
  `closed_at` TIMESTAMP NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_job` (`organization_id`, `job_code`),
  INDEX (`organization_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- LEAVE MODULE - leave_applications (needs leave_types)
-- ============================================================

CREATE TABLE IF NOT EXISTS `leave_applications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `leave_type_id` BIGINT UNSIGNED NOT NULL,
  `from_date` DATE NOT NULL,
  `to_date` DATE NOT NULL,
  `duration_days` DECIMAL(5,2),
  `half_day` BOOLEAN DEFAULT FALSE,
  `reason` LONGTEXT,
  `status` ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  `approval_notes` LONGTEXT,
  `is_emergency` BOOLEAN DEFAULT FALSE,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECRUITMENT - job_applicants (depends on job_openings)
-- ============================================================

CREATE TABLE IF NOT EXISTS `job_applicants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `job_opening_id` BIGINT UNSIGNED NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20),
  `resume_url` VARCHAR(512),
  `cover_letter` LONGTEXT,
  `current_company` VARCHAR(255),
  `current_designation` VARCHAR(255),
  `current_salary` DECIMAL(15,2),
  `expected_salary` DECIMAL(15,2),
  `years_of_experience` INT,
  `qualification` VARCHAR(255),
  `status` ENUM('applied', 'screened', 'shortlisted', 'interview', 'offer', 'rejected', 'hired', 'closed') DEFAULT 'applied',
  `rating` DECIMAL(3,2),
  `source` VARCHAR(100),
  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`job_opening_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECRUITMENT - interview_schedules (depends on job_applicants)
-- ============================================================

CREATE TABLE IF NOT EXISTS `interview_schedules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `applicant_id` BIGINT UNSIGNED NOT NULL,
  `job_opening_id` BIGINT UNSIGNED NOT NULL,
  `interview_type` ENUM('phone_screen', 'technical', 'hr', 'manager', 'final') NOT NULL,
  `round_number` INT DEFAULT 1,
  `interviewer_id` BIGINT UNSIGNED,
  `interview_date` DATETIME,
  `duration_minutes` INT,
  `feedback` LONGTEXT,
  `rating` DECIMAL(3,2),
  `status` ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`applicant_id`) REFERENCES `job_applicants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`applicant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECRUITMENT - offer_letters (depends on job_applicants)
-- ============================================================

CREATE TABLE IF NOT EXISTS `offer_letters` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `applicant_id` BIGINT UNSIGNED NOT NULL,
  `job_opening_id` BIGINT UNSIGNED NOT NULL,
  `offer_code` VARCHAR(100) NOT NULL,
  `salary_offered` DECIMAL(15,2),
  `currency` VARCHAR(5) DEFAULT 'INR',
  `joining_date` DATE,
  `probation_period_days` INT DEFAULT 90,
  `designation` VARCHAR(255),
  `department` VARCHAR(255),
  `manager_id` BIGINT UNSIGNED,
  `offer_letter_url` VARCHAR(512),
  `status` ENUM('draft', 'sent', 'accepted', 'rejected', 'withdrawn') DEFAULT 'draft',
  `sent_at` TIMESTAMP NULL,
  `accepted_at` TIMESTAMP NULL,
  `valid_till` DATE,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`applicant_id`) REFERENCES `job_applicants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_offer` (`organization_id`, `offer_code`),
  INDEX (`organization_id`),
  INDEX (`applicant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- LEAVE - leave_approvals (depends on leave_applications)
-- ============================================================

CREATE TABLE IF NOT EXISTS `leave_approvals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `leave_application_id` BIGINT UNSIGNED NOT NULL,
  `approver_id` BIGINT UNSIGNED NOT NULL,
  `approval_level` INT DEFAULT 1,
  `status` ENUM('pending', 'approved', 'rejected', 'delegated') DEFAULT 'pending',
  `approval_date` TIMESTAMP NULL,
  `rejection_reason` LONGTEXT,
  `comments` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`leave_application_id`) REFERENCES `leave_applications`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approver_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`leave_application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- LEAVE - leave_cancellations (depends on leave_applications)
-- ============================================================

CREATE TABLE IF NOT EXISTS `leave_cancellations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `leave_application_id` BIGINT UNSIGNED NOT NULL,
  `cancelled_by` BIGINT UNSIGNED NOT NULL,
  `cancellation_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reason` LONGTEXT,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`leave_application_id`) REFERENCES `leave_applications`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cancelled_by`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REMAINING TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS `salary_structure` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `structure_name` VARCHAR(255),
  `effective_from` DATE,
  `effective_to` DATE NULL,
  `base_salary` DECIMAL(15,2),
  `allowances_json` JSON,
  `deductions_json` JSON,
  `gross_salary` DECIMAL(15,2),
  `net_salary` DECIMAL(15,2),
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attendance_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `date` DATE,
  `check_in_time` TIME,
  `check_out_time` TIME,
  `total_duration_minutes` INT,
  `break_duration_minutes` INT,
  `work_duration_minutes` INT,
  `is_night_shift` BOOLEAN DEFAULT FALSE,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_session` (`employee_id`, `date`),
  INDEX (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `asset_replacements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `old_asset_id` BIGINT UNSIGNED NOT NULL,
  `new_asset_id` BIGINT UNSIGNED,
  `replacement_date` DATE,
  `reason` LONGTEXT,
  `old_condition` VARCHAR(100),
  `new_condition` VARCHAR(100),
  `cost_difference` DECIMAL(15,2),
  `status` ENUM('requested', 'approved', 'completed') DEFAULT 'requested',
  `approved_by` BIGINT UNSIGNED,
  `approved_at` TIMESTAMP NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`old_asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`new_asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL,
  INDEX (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `announcements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `banner_image_url` VARCHAR(512),
  `announcement_type` ENUM('general', 'urgent', 'celebration', 'policy', 'hr') DEFAULT 'general',
  `target_audience` ENUM('all', 'department', 'role', 'specific_users') DEFAULT 'all',
  `target_data` JSON,
  `status` ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  `published_at` TIMESTAMP NULL,
  `expires_at` TIMESTAMP NULL,
  `priority` ENUM('low', 'medium', 'high') DEFAULT 'medium',
  `view_count` INT DEFAULT 0,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT "✅ ALL DEPENDENCY TABLES CREATED SUCCESSFULLY" AS status;
