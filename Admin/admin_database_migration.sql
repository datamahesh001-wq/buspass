-- Admin-side tables for the Bus Pass Management System.
-- Run this on the existing buspass_db schema; this migration does not drop data.
USE buspass_db;

-- Admin-created bus stops managed from Admin > Bus Stops.
CREATE TABLE IF NOT EXISTS admin_bus_stops (
    id INT NOT NULL AUTO_INCREMENT,
    stop_code VARCHAR(50) NULL,
    stop_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NULL,
    location VARCHAR(255) NULL,
    route_codes VARCHAR(255) NULL,
    daily_services INT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_bus_stops_code (stop_code),
    KEY idx_admin_bus_stops_name (stop_name),
    KEY idx_admin_bus_stops_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin route catalogue/publication state; routes remains the canonical
-- route table used by existing student applications.
CREATE TABLE IF NOT EXISTS admin_routes (
    id INT NOT NULL AUTO_INCREMENT,
    route_code VARCHAR(50) NOT NULL,
    from_stop VARCHAR(150) NOT NULL,
    to_stop VARCHAR(150) NOT NULL,
    distance_km DECIMAL(10,2) NOT NULL DEFAULT 0,
    bus_type VARCHAR(100) NULL,
    route_status ENUM('published', 'unpublished') NOT NULL DEFAULT 'published',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_routes_code (route_code),
    KEY idx_admin_routes_status (route_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin plan/rate catalogue. Existing pass_types and pass_plans continue to
-- serve the application flow; these tables hold admin-screen configuration.
CREATE TABLE IF NOT EXISTS admin_plan_bands (
    id INT NOT NULL AUTO_INCREMENT,
    band_code VARCHAR(50) NULL,
    band_name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_plan_bands_code (band_code),
    KEY idx_admin_plan_bands_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_plan_rates (
    id INT NOT NULL AUTO_INCREMENT,
    pass_type_id INT NULL,
    plan_label VARCHAR(100) NOT NULL,
    distance_min_km DECIMAL(10,2) NOT NULL DEFAULT 0,
    distance_max_km DECIMAL(10,2) NOT NULL DEFAULT 0,
    monthly_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    three_month_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    half_year_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    yearly_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_admin_plan_rates_type_distance (pass_type_id, distance_min_km, distance_max_km),
    KEY idx_admin_plan_rates_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin profile metadata links to the existing users account; credentials
-- remain stored in users.password and should be hashed by the application.
CREATE TABLE IF NOT EXISTS admin_profiles (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(20) NULL,
    designation VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_profiles_user (user_id),
    CONSTRAINT fk_admin_profiles_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The following existing tables already back other admin screens:
-- users/admin role, student_details, employee_details, pass_applications,
-- application_submission_details, application_verifications, documents,
-- payments, bus_passes, pass_history, pass_types, pass_plans, routes,
-- support_requests, password_resets.
