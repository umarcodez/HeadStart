-- Database DDL Script

CREATE TABLE `budget_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `type` enum('income','expense') NOT NULL DEFAULT 'expense',
  `color` varchar(7) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `budget_categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `budget_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `budget_id` int NOT NULL,
  `category_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `budget_id` (`budget_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `budget_items_ibfk_1` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `budget_items_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `budget_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `budgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `budgets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `business_name_suggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `keywords` text,
  `generated_names` json DEFAULT NULL,
  `selected_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `business_name_suggestions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `business_plan_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `section_type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `business_plan_sections_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `business_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `business_plan_template_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `section_type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `content_template` text,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  CONSTRAINT `business_plan_template_sections_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `business_plan_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `business_plan_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `business_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `title` varchar(255) NOT NULL,
  `status` enum('draft','active','archived') DEFAULT 'draft',
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `business_plans_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `contract_milestones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `amount` decimal(10,2) NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('pending','in_progress','submitted','approved','rejected','paid') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contract_id` (`contract_id`),
  CONSTRAINT `contract_milestones_ibfk_1` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `contracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `freelancer_id` varchar(128) NOT NULL,
  `client_id` varchar(128) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `contract_type` enum('fixed_price','hourly','milestone') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('draft','sent','active','completed','cancelled','disputed') DEFAULT 'draft',
  `terms` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  KEY `freelancer_id` (`freelancer_id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `contracts_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contracts_ibfk_2` FOREIGN KEY (`freelancer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `contracts_ibfk_3` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `domain_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `domain_name` varchar(255) NOT NULL,
  `available` tinyint(1) DEFAULT NULL,
  `tld` varchar(20) DEFAULT NULL,
  `checked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `domain_name` (`domain_name`),
  CONSTRAINT `domain_availability_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `email_verification_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `email_verification_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `entrepreneur_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `company_size` varchar(50) DEFAULT NULL,
  `founding_date` date DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `bio` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `entrepreneur_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `category_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text,
  `receipt_image` varchar(255) DEFAULT NULL,
  `expense_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `budget_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `financial_goals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `target_amount` decimal(10,2) NOT NULL,
  `current_amount` decimal(10,2) DEFAULT '0.00',
  `start_date` date NOT NULL,
  `target_date` date NOT NULL,
  `is_completed` tinyint(1) DEFAULT '0',
  `category` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `financial_goals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `financial_models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `plan_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `type` enum('revenue','expense','cash_flow','break_even','valuation','custom') NOT NULL,
  `data` json DEFAULT NULL,
  `assumptions` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `financial_models_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `financial_models_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `business_plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `financial_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `report_type` enum('income_statement','cash_flow','balance_sheet','budget_variance','custom') NOT NULL,
  `report_data` json DEFAULT NULL,
  `parameters` json DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `financial_reports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `freelancer_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `bio` text,
  `hourly_rate` decimal(10,2) DEFAULT NULL,
  `availability` varchar(50) DEFAULT NULL,
  `years_of_experience` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `freelancer_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `freelancer_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `freelancer_id` varchar(128) NOT NULL,
  `reviewer_id` varchar(128) NOT NULL,
  `project_id` int NOT NULL,
  `rating` decimal(2,1) NOT NULL,
  `review` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_review` (`freelancer_id`,`reviewer_id`,`project_id`),
  KEY `reviewer_id` (`reviewer_id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `freelancer_reviews_ibfk_1` FOREIGN KEY (`freelancer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `freelancer_reviews_ibfk_2` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `freelancer_reviews_ibfk_3` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `income_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `category_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text,
  `income_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `income_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `income_records_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `budget_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `kanban_boards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `kanban_boards_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `kanban_columns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `board_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `position` int NOT NULL,
  `wip_limit` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `board_id` (`board_id`),
  CONSTRAINT `kanban_columns_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `kanban_boards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `kanban_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `column_id` int NOT NULL,
  `task_id` int NOT NULL,
  `position` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_task_position` (`column_id`,`position`),
  UNIQUE KEY `unique_task_mapping` (`task_id`),
  CONSTRAINT `kanban_tasks_ibfk_1` FOREIGN KEY (`column_id`) REFERENCES `kanban_columns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kanban_tasks_ibfk_2` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_id` int NOT NULL,
  `milestone_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` timestamp NULL DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contract_id` (`contract_id`),
  KEY `milestone_id` (`milestone_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`milestone_id`) REFERENCES `contract_milestones` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `portfolio_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `image_url` varchar(255) DEFAULT NULL,
  `project_url` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `portfolio_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `project_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `role` enum('owner','manager','member','viewer') NOT NULL DEFAULT 'member',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_project_member` (`project_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `project_members_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `project_milestones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `due_date` date DEFAULT NULL,
  `status` enum('not_started','in_progress','completed','delayed') DEFAULT 'not_started',
  `completion_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `project_milestones_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `project_skills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `skill_id` int NOT NULL,
  `importance` enum('required','preferred','nice_to_have') DEFAULT 'required',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_skill_unique` (`project_id`,`skill_id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `project_skills_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_skills_ibfk_2` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `project_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `is_public` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `project_templates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `project_user_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `user_id` varchar(128) NOT NULL,
  `permission_id` int NOT NULL,
  `granted` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_user_permission_unique` (`project_id`,`user_id`,`permission_id`),
  KEY `user_id` (`user_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `project_user_permissions_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_user_permissions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_user_permissions_ibfk_3` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `owner_id` varchar(128) NOT NULL,
  `budget` decimal(10,2) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('planning','active','on_hold','completed','cancelled') DEFAULT 'planning',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission_unique` (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `skills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `subtasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `is_completed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  CONSTRAINT `subtasks_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `tagline_suggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `business_name` varchar(255) DEFAULT NULL,
  `keywords` text,
  `generated_taglines` json DEFAULT NULL,
  `selected_tagline` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tagline_suggestions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `task_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_size` int NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `task_attachments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_attachments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `task_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `task_comments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `task_dependencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `depends_on_task_id` int NOT NULL,
  `dependency_type` enum('finish_to_start','start_to_start','finish_to_finish','start_to_finish') DEFAULT 'finish_to_start',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_dependency` (`task_id`,`depends_on_task_id`),
  KEY `depends_on_task_id` (`depends_on_task_id`),
  CONSTRAINT `task_dependencies_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_dependencies_ibfk_2` FOREIGN KEY (`depends_on_task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int DEFAULT NULL,
  `milestone_id` int DEFAULT NULL,
  `creator_id` varchar(255) NOT NULL,
  `assignee_id` varchar(255) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `status` enum('backlog','to_do','in_progress','in_review','done','cancelled') DEFAULT 'to_do',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `estimated_hours` decimal(6,2) DEFAULT NULL,
  `tags` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  KEY `milestone_id` (`milestone_id`),
  KEY `creator_id` (`creator_id`),
  KEY `assignee_id` (`assignee_id`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`milestone_id`) REFERENCES `project_milestones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_ibfk_4` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `team_invitations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `inviter_id` varchar(128) NOT NULL,
  `invitee_id` varchar(128) NOT NULL,
  `role` varchar(100) NOT NULL,
  `message` text,
  `status` enum('pending','accepted','declined','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invitation_unique` (`project_id`,`invitee_id`,`status`),
  KEY `inviter_id` (`inviter_id`),
  KEY `invitee_id` (`invitee_id`),
  CONSTRAINT `team_invitations_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_invitations_ibfk_2` FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`),
  CONSTRAINT `team_invitations_ibfk_3` FOREIGN KEY (`invitee_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `team_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `user_id` varchar(128) NOT NULL,
  `role` varchar(100) NOT NULL,
  `hourly_rate` decimal(10,2) DEFAULT NULL,
  `status` enum('invited','active','resigned','removed') DEFAULT 'invited',
  `joined_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_user_unique` (`project_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `team_members_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `template_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `estimated_hours` decimal(6,2) DEFAULT NULL,
  `relative_start_day` int DEFAULT NULL,
  `relative_due_day` int DEFAULT NULL,
  `depends_on_task_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `depends_on_task_id` (`depends_on_task_id`),
  CONSTRAINT `template_tasks_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `project_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `template_tasks_ibfk_2` FOREIGN KEY (`depends_on_task_id`) REFERENCES `template_tasks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `time_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `description` text,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `is_billable` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `time_entries_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `time_entries_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `two_factor_auth` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `otp_secret` varchar(255) DEFAULT NULL,
  `otp_enabled` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `two_factor_auth_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_skills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `skill_id` int NOT NULL,
  `proficiency_level` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_skill_unique` (`user_id`,`skill_id`),
  KEY `skill_id` (`skill_id`),
  CONSTRAINT `user_skills_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_skills_ibfk_2` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_tutorial_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `tutorial_id` int NOT NULL,
  `completed` tinyint(1) DEFAULT '0',
  `last_watched_position` int DEFAULT '0',
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_tutorial_unique` (`user_id`,`tutorial_id`),
  KEY `tutorial_id` (`tutorial_id`),
  CONSTRAINT `user_tutorial_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_tutorial_progress_ibfk_2` FOREIGN KEY (`tutorial_id`) REFERENCES `video_tutorials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` varchar(128) NOT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role_id` int DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `video_tutorials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `video_url` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `thumbnail_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

