-- =========================================================
-- BUSPASS DATABASE
-- Andhra Pradesh Bus Pass Application
-- =========================================================

DROP DATABASE IF EXISTS buspass_db;

CREATE DATABASE buspass_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE buspass_db;


-- =========================================================
-- 1. USERS
-- Login + Signup + Profile
-- =========================================================

CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,

    student_id VARCHAR(20) NOT NULL,

    full_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(10) NOT NULL,
    email VARCHAR(100) NOT NULL,

    password VARCHAR(255) NOT NULL,

    date_of_birth DATE NULL,

    user_type ENUM('student', 'employee', 'admin')
        NOT NULL DEFAULT 'student',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY unique_student_id (student_id),
    -- Mobile and email are validated by the application during signup.
    -- They are intentionally not UNIQUE at DB level so Profile Edit can save
    -- the values entered by the current user without a database constraint popup.
    KEY idx_mobile (mobile),
    KEY idx_email (email)
);


-- =========================================================
-- 2. STUDENT DETAILS
-- Student Details Screen
-- =========================================================

CREATE TABLE student_details (
    id INT NOT NULL AUTO_INCREMENT,

    user_id INT NOT NULL,

    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NULL,

    gender VARCHAR(20),
    student_category VARCHAR(30),

    mobile VARCHAR(10),
    email VARCHAR(100),

    aadhaar_number VARCHAR(20),

    college_name VARCHAR(150),
    class_course VARCHAR(150),

    father_name VARCHAR(100),
    mother_name VARCHAR(100),

    contact_number VARCHAR(10),

    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    pin_code VARCHAR(10),

    permanent_address VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY unique_student_details_user (user_id),

    CONSTRAINT fk_student_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 3. EMPLOYEE DETAILS
-- Employee Details Screen
-- =========================================================

CREATE TABLE employee_details (
    id INT NOT NULL AUTO_INCREMENT,

    user_id INT NOT NULL,

    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NULL,

    gender VARCHAR(20),

    mobile VARCHAR(10),
    email VARCHAR(100),

    organization_name VARCHAR(150),
    employee_id VARCHAR(100),

    department VARCHAR(100),
    designation VARCHAR(100),

    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    pin_code VARCHAR(10),

    permanent_address VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY unique_employee_details_user (user_id),

    CONSTRAINT fk_employee_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    UNIQUE KEY unique_employee_id (employee_id)
);


-- =========================================================
-- 4. ROUTES
-- Student Route + Employee Route
-- =========================================================

CREATE TABLE routes (
    id INT NOT NULL AUTO_INCREMENT,

    from_stop VARCHAR(150) NOT NULL,
    to_stop VARCHAR(150) NOT NULL,

    distance_km DECIMAL(10,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);


-- =========================================================
-- 5. PASS TYPES
-- Student Pass / Employee Pass
-- =========================================================

CREATE TABLE pass_types (
    id INT NOT NULL AUTO_INCREMENT,

    pass_type_name VARCHAR(100) NOT NULL,

    description VARCHAR(255),

    user_type ENUM('student', 'employee') NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);


-- =========================================================
-- 6. BUS TYPES
-- Route Selection Screen
-- =========================================================

CREATE TABLE bus_types (
    id INT NOT NULL AUTO_INCREMENT,

    bus_type_name VARCHAR(100) NOT NULL,

    service_type VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);


-- =========================================================
-- 7. PASS PLANS
-- Student Plan + Employee Plan
-- =========================================================

CREATE TABLE pass_plans (
    id INT NOT NULL AUTO_INCREMENT,

    pass_type_id INT NOT NULL,

    plan_name VARCHAR(100) NOT NULL,

    validity_days INT NOT NULL,

    amount DECIMAL(10,2) NOT NULL,

    description VARCHAR(255),

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_plan_pass_type
        FOREIGN KEY (pass_type_id)
        REFERENCES pass_types(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 8. APPLICATIONS
-- Connects Student/Employee + Route + Plan
-- =========================================================

CREATE TABLE pass_applications (
    id INT NOT NULL AUTO_INCREMENT,

    user_id INT NOT NULL,

    pass_type_id INT NOT NULL,

    route_id INT NULL,

    bus_type_id INT NULL,

    plan_id INT NULL,

    application_status ENUM(
        'draft',
        'submitted',
        'document_pending',
        'approved',
        'rejected',
        'payment_pending',
        'paid',
        'completed'
    ) DEFAULT 'draft',

    rejection_reason TEXT NULL,
    rejected_at DATETIME NULL,
    resubmitted_from_application_id INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_application_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_application_pass_type
        FOREIGN KEY (pass_type_id)
        REFERENCES pass_types(id),

    CONSTRAINT fk_application_route
        FOREIGN KEY (route_id)
        REFERENCES routes(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_application_bus
        FOREIGN KEY (bus_type_id)
        REFERENCES bus_types(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_application_plan
        FOREIGN KEY (plan_id)
        REFERENCES pass_plans(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 8A. APPLICATION SUBMISSION SNAPSHOTS
-- Stores the exact applicant details submitted for each application.
-- This prevents later profile edits from changing an older application.
-- =========================================================

CREATE TABLE application_submission_details (
    id INT NOT NULL AUTO_INCREMENT,
    application_id INT NOT NULL,
    user_id INT NOT NULL,
    user_type VARCHAR(20) NULL,
    student_category VARCHAR(30) NULL,
    full_name VARCHAR(100) NULL,
    mobile VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    date_of_birth DATE NULL,
    gender VARCHAR(30) NULL,
    id_number VARCHAR(100) NULL,
    organization_name VARCHAR(150) NULL,
    college_name VARCHAR(150) NULL,
    class_course VARCHAR(150) NULL,
    academic_year VARCHAR(30) NULL,
    father_name VARCHAR(100) NULL,
    mother_name VARCHAR(100) NULL,
    contact_number VARCHAR(20) NULL,
    employee_id VARCHAR(100) NULL,
    department VARCHAR(100) NULL,
    designation VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    pin_code VARCHAR(20) NULL,
    permanent_address VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_application_snapshot (application_id),
    KEY idx_snapshot_user (user_id),
    CONSTRAINT fk_snapshot_application FOREIGN KEY (application_id) REFERENCES pass_applications(id) ON DELETE CASCADE
);


-- =========================================================
-- 9. DOCUMENTS
-- Student Documents + Employee Documents
-- =========================================================

CREATE TABLE documents (
    id INT NOT NULL AUTO_INCREMENT,

    application_id INT NOT NULL,

    document_type ENUM(
        'passport_photo',
        'student_id',
        'employee_id',
        'aadhaar',
        'company_proof',
        'employment_proof',
        'address_proof'
    ) NOT NULL,

    file_name VARCHAR(255),
    file_path VARCHAR(500),
    preview_data LONGTEXT,

    document_status ENUM(
        'pending',
        'uploaded',
        'verified',
        'rejected'
    ) DEFAULT 'pending',

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY unique_application_document (application_id, document_type),

    CONSTRAINT fk_document_application
        FOREIGN KEY (application_id)
        REFERENCES pass_applications(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 10. PAYMENTS
-- Payment Screen + Payment Success
-- =========================================================

CREATE TABLE payments (
    id INT NOT NULL AUTO_INCREMENT,

    application_id INT NOT NULL,

    transaction_id VARCHAR(100) NOT NULL,

    amount DECIMAL(10,2) NOT NULL,

    payment_method ENUM(
        'upi',
        'card',
        'net_banking'
    ) NOT NULL,

    payment_status ENUM(
        'pending',
        'success',
        'failed',
        'refunded'
    ) DEFAULT 'pending',

    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY unique_transaction_id (transaction_id),

    CONSTRAINT fk_payment_application
        FOREIGN KEY (application_id)
        REFERENCES pass_applications(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 11. BUS PASSES
-- Active Pass + Expired Pass
-- =========================================================

CREATE TABLE bus_passes (
    id INT NOT NULL AUTO_INCREMENT,

    application_id INT NOT NULL,

    payment_id INT NULL,

    pass_id VARCHAR(50) NOT NULL,

    holder_name VARCHAR(100) NOT NULL,

    pass_type VARCHAR(100) NOT NULL,

    college_or_organization VARCHAR(150),

    course_or_designation VARCHAR(100),

    route_from VARCHAR(150),
    route_to VARCHAR(150),

    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,

    pass_status ENUM(
        'active',
        'expired',
        'cancelled'
    ) DEFAULT 'active',

    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY unique_pass_id (pass_id),

    CONSTRAINT fk_pass_application
        FOREIGN KEY (application_id)
        REFERENCES pass_applications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_pass_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(id)
        ON DELETE SET NULL
);


-- =========================================================
-- 12. PASS HISTORY
-- History Screen
-- =========================================================

CREATE TABLE pass_history (
    id INT NOT NULL AUTO_INCREMENT,

    user_id INT NOT NULL,

    pass_id INT NOT NULL,

    status VARCHAR(50),

    amount DECIMAL(10,2),

    valid_from DATE,
    valid_to DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_history_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_history_pass
        FOREIGN KEY (pass_id)
        REFERENCES bus_passes(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 13. PASSWORD RESET
-- Forgot Password
-- =========================================================

CREATE TABLE password_resets (
    id INT NOT NULL AUTO_INCREMENT,

    user_id INT NOT NULL,

    reset_token VARCHAR(255) NOT NULL,

    expires_at DATETIME NOT NULL,

    used BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_reset_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 14. SUPPORT / FEEDBACK
-- Profile → Help & Support
-- =========================================================

CREATE TABLE support_requests (
    id INT NOT NULL AUTO_INCREMENT,

    user_id INT NOT NULL,

    subject VARCHAR(150),
    message TEXT,

    status ENUM(
        'open',
        'in_progress',
        'resolved',
        'closed'
    ) DEFAULT 'open',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_support_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================================================
-- INSERT DEFAULT PASS TYPES
-- =========================================================

INSERT INTO pass_types
(pass_type_name, description, user_type)
VALUES
(
    'Student Pass',
    'For School & College Students',
    'student'
),
(
    'Employee Pass',
    'For Government & Private Employees',
    'employee'
);


-- =========================================================
-- INSERT BUS TYPES
-- =========================================================

INSERT INTO bus_types
(bus_type_name, service_type)
VALUES
('Ordinary', 'Regular Service'),
('Express', 'Limited Stop Service');


-- =========================================================
-- STUDENT PLANS
-- =========================================================

INSERT INTO pass_plans
(pass_type_id, plan_name, validity_days, amount, description)
VALUES

(
    1,
    'Monthly Pass',
    30,
    600.00,
    'Validity for 30 days from the date of issue'
),

(
    1,
    '3 Monthly Pass',
    90,
    1600.00,
    'Valid for 3 months from the date of issue'
),

(
    1,
    'Half-Yearly Pass',
    180,
    3300.00,
    'Valid for 6 months from the date of issue'
),

(
    1,
    'Yearly Pass',
    365,
    5500.00,
    'Validity for 12 months from the date of issue'
);


-- =========================================================
-- EMPLOYEE PLANS
-- =========================================================

INSERT INTO pass_plans
(pass_type_id, plan_name, validity_days, amount, description)
VALUES

(
    2,
    'Monthly Pass',
    30,
    450.00,
    'Validity for 30 days from the date of issue'
),

(
    2,
    'Quarterly Pass',
    90,
    1250.00,
    'Valid for 3 months from the date of issue'
),

(
    2,
    'Half-Yearly Pass',
    180,
    2400.00,
    'Valid for 6 months from the date of issue'
),

(
    2,
    'Yearly Pass',
    365,
    4500.00,
    'Validity for 12 months from the date of issue'
);


-- =========================================================
-- SAMPLE ROUTES
-- =========================================================

INSERT INTO routes
(from_stop, to_stop, distance_km)
VALUES
(
    'Yanam Bus Stop',
    'Kakinada Complex',
    27
),
(
    'Yanam Bus Stand',
    'Kakinada Bus Stand',
    27
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_users_mobile
ON users(mobile);

CREATE INDEX idx_users_email
ON users(email);

CREATE INDEX idx_application_user
ON pass_applications(user_id);

CREATE INDEX idx_application_status
ON pass_applications(application_status);

CREATE INDEX idx_documents_application
ON documents(application_id);

CREATE INDEX idx_payments_application
ON payments(application_id);

CREATE INDEX idx_payment_status
ON payments(payment_status);

CREATE INDEX idx_pass_user
ON pass_applications(user_id);

CREATE INDEX idx_pass_status
ON bus_passes(pass_status);

CREATE INDEX idx_pass_valid_to
ON bus_passes(valid_to);

CREATE INDEX idx_history_user
ON pass_history(user_id);


-- =========================================================
-- CHECK DATABASE
-- =========================================================

SHOW TABLES;
