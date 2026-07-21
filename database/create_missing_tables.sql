-- APPONEXT HRMS - CREATE MISSING DATABASE TABLES
-- Generated: 2026-07-19
-- This script creates all 16 missing tables required for production

-- ============================================================
-- PERFORMANCE MODULE TABLES (6 tables)
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
  INDEX (`status`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `goals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `goal_title` VARCHAR(255) NOT NULL,
  `goal_description` LONGTEXT,
  `goal_type` ENUM('corporate', 'departmental', 'individual', 'okr') DEFAULT 'individual',
  `start_date` DATE,
  `end_date` DATE,
  `target_value` DECIMAL(12,2),
  `current_value` DECIMAL(12,2),
  `progress_percentage` INT DEFAULT 0,
  `status` ENUM('not_started', 'in_progress', 'completed', 'cancelled') DEFAULT 'not_started',
  `alignment` VARCHAR(255),
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`status`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `competencies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `competency_name` VARCHAR(255) NOT NULL,
  `competency_code` VARCHAR(100) NOT NULL,
  `description` LONGTEXT,
  `category` VARCHAR(100),
  `framework_id` BIGINT UNSIGNED,
  `proficiency_levels` JSON,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_competency` (`organization_id`, `competency_code`),
  INDEX (`organization_id`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `feedback` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `cycle_id` BIGINT UNSIGNED,
  `from_employee_id` BIGINT UNSIGNED NOT NULL,
  `to_employee_id` BIGINT UNSIGNED NOT NULL,
  `feedback_type` ENUM('360_feedback', 'peer', 'subordinate', 'customer') NOT NULL,
  `rating` DECIMAL(3,2),
  `feedback_text` LONGTEXT,
  `status` ENUM('draft', 'submitted', 'read') DEFAULT 'draft',
  `submitted_at` TIMESTAMP NULL,
  `read_at` TIMESTAMP NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`from_employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`to_employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`to_employee_id`),
  INDEX (`status`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `appraisals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `cycle_id` BIGINT UNSIGNED,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `appraiser_id` BIGINT UNSIGNED,
  `overall_rating` DECIMAL(3,2),
  `potential_rating` DECIMAL(3,2),
  `performance_level` ENUM('exceeds', 'meets', 'below') NULL,
  `promotion_recommendation` ENUM('yes', 'no', 'defer') NULL,
  `salary_increase_percentage` DECIMAL(5,2),
  `status` ENUM('draft', 'submitted', 'approved') DEFAULT 'draft',
  `comments` LONGTEXT,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`appraiser_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL,
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`status`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ratings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `appraisal_id` BIGINT UNSIGNED NOT NULL,
  `competency_id` BIGINT UNSIGNED,
  `kra_id` BIGINT UNSIGNED,
  `rating_score` DECIMAL(3,2),
  `comments` LONGTEXT,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`appraisal_id`) REFERENCES `appraisals`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`appraisal_id`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECRUITMENT MODULE TABLES (4 tables)
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
  INDEX (`status`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX (`status`),
  INDEX (`email`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX (`applicant_id`),
  INDEX (`status`),
  INDEX (`interview_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX (`applicant_id`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- LEAVE MODULE TABLES (5 tables)
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
  INDEX (`status`),
  INDEX (`from_date`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX (`leave_application_id`),
  INDEX (`status`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leave_balances` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `leave_type_id` BIGINT UNSIGNED NOT NULL,
  `year` INT NOT NULL,
  `opening_balance` DECIMAL(10,2),
  `allocated_leave` DECIMAL(10,2),
  `used_leave` DECIMAL(10,2),
  `pending_leave` DECIMAL(10,2),
  `carried_forward` DECIMAL(10,2),
  `closing_balance` DECIMAL(10,2),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_balance` (`employee_id`, `leave_type_id`, `year`),
  INDEX (`organization_id`),
  INDEX (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX (`organization_id`),
  INDEX (`leave_application_id`),
  INDEX (`cancellation_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `comp_off_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `worked_date` DATE NOT NULL,
  `hours_worked` DECIMAL(5,2),
  `comp_off_date` DATE,
  `status` ENUM('pending', 'approved', 'used', 'expired', 'cancelled') DEFAULT 'pending',
  `approval_date` TIMESTAMP NULL,
  `used_date` TIMESTAMP NULL,
  `approver_id` BIGINT UNSIGNED,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approver_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL,
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`status`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PAYROLL MODULE TABLES (3 additional tables)
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
  INDEX (`employee_id`),
  INDEX (`status`),
  INDEX (`effective_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payroll_processing` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `payroll_month` VARCHAR(10) NOT NULL,
  `processing_start_date` DATE,
  `processing_end_date` DATE,
  `salary_month` VARCHAR(10),
  `total_employees` INT DEFAULT 0,
  `processed_employees` INT DEFAULT 0,
  `total_gross` DECIMAL(18,2),
  `total_deductions` DECIMAL(18,2),
  `total_net` DECIMAL(18,2),
  `status` ENUM('draft', 'processing', 'completed', 'approved', 'published') DEFAULT 'draft',
  `approved_by` BIGINT UNSIGNED,
  `approved_at` TIMESTAMP NULL,
  `published_at` TIMESTAMP NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_payroll` (`organization_id`, `payroll_month`),
  INDEX (`organization_id`),
  INDEX (`status`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payslips` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `payroll_processing_id` BIGINT UNSIGNED,
  `salary_month` VARCHAR(10),
  `salary_year` INT,
  `days_worked` INT,
  `base_salary` DECIMAL(15,2),
  `gross_salary` DECIMAL(15,2),
  `total_allowances` DECIMAL(15,2),
  `total_deductions` DECIMAL(15,2),
  `pf_contribution` DECIMAL(15,2),
  `esi_contribution` DECIMAL(15,2),
  `tax_deduction` DECIMAL(15,2),
  `net_salary` DECIMAL(15,2),
  `payment_mode` ENUM('bank_transfer', 'check', 'cash') DEFAULT 'bank_transfer',
  `payment_date` DATE,
  `status` ENUM('draft', 'approved', 'published', 'paid') DEFAULT 'draft',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `updated_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`salary_month`),
  INDEX (`status`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ATTENDANCE MODULE TABLE
-- ============================================================

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
  INDEX (`organization_id`),
  INDEX (`employee_id`),
  INDEX (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ASSET MODULE TABLE
-- ============================================================

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
  INDEX (`organization_id`),
  INDEX (`old_asset_id`),
  INDEX (`status`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- NOTIFICATIONS MODULE TABLE
-- ============================================================

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
  INDEX (`status`),
  INDEX (`published_at`),
  INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COMPLETION
-- ============================================================

-- All 16 missing tables have been created.
-- Next: Create API route files
-- Then: Implement API endpoints
-- Then: Frontend integration

SELECT "✅ All missing database tables created successfully!" AS status;
