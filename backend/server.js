require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();

const mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Serve the complete BusPass frontend from the same backend so the project
// can be opened through http://localhost:5000 instead of opening HTML files
// directly from the file system.
const FRONTEND_ROOT = path.join(__dirname, "..");
app.use(express.static(FRONTEND_ROOT));


// ==========================================
// MYSQL CONNECTION
// ==========================================

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "mahesh@2006",
    database: process.env.DB_NAME || "buspass_db"
});


db.connect((err) => {

    if (err) {

        console.log("❌ Database Connection Failed");
        console.log(err);

    } else {

        console.log("✅ MySQL Connected Successfully");
        ensureProfileEditableColumns();
        ensureApplicationWorkflowColumns();
        ensureStudentCategoryColumn();
        ensureApplicationDetailColumns();
        ensureDocumentPreviewColumn();
        ensureApplicationSubmissionSnapshotTable();
        ensureManagementTables();
        ensurePlanAmountColumn();
        ensurePassDistanceColumn();

    }

});

// Profile editing must be able to save the email/mobile entered by the user.
// Signup still performs its own duplicate check, but existing databases created
// with UNIQUE email/mobile indexes need a one-time migration.
function ensureApplicationWorkflowColumns() {
    const migrations = [
        "ALTER TABLE pass_applications ADD COLUMN rejection_reason TEXT NULL",
        "ALTER TABLE pass_applications ADD COLUMN rejected_at DATETIME NULL",
        "ALTER TABLE pass_applications ADD COLUMN resubmitted_from_application_id INT NULL"
    ];

    const run = (index = 0) => {
        if (index >= migrations.length) return;
        db.query(migrations[index], (err) => {
            // Error 1060 simply means the column already exists. Keep the
            // existing database and continue with the remaining migrations.
            if (err && err.errno !== 1060) console.log("Application workflow migration warning:", err.message);
            run(index + 1);
        });
    };
    run();
}

function ensureStudentCategoryColumn() {
    db.query(
        "ALTER TABLE student_details ADD COLUMN student_category VARCHAR(30) NULL",
        (err) => {
            if (err && err.errno !== 1060) console.log("Student category migration warning:", err.message);
        }
    );
}

function ensureApplicationDetailColumns() {
    [
        "ALTER TABLE student_details ADD COLUMN class_course VARCHAR(150) NULL",
        "ALTER TABLE application_submission_details ADD COLUMN class_course VARCHAR(150) NULL",
        "ALTER TABLE student_details ADD COLUMN academic_year VARCHAR(30) NULL",
        "ALTER TABLE application_submission_details ADD COLUMN academic_year VARCHAR(30) NULL",
        "ALTER TABLE documents ADD UNIQUE KEY unique_application_document (application_id, document_type)"
    ].forEach(sql => db.query(sql, err => {
            // Existing columns/indexes are expected on databases already migrated.
                if (err && err.errno !== 1060) console.log("Application detail migration warning:", err.message);
    }));
}

function ensureDocumentPreviewColumn() {
    db.query(
        "ALTER TABLE documents ADD COLUMN preview_data LONGTEXT NULL",
        (err) => {
            if (err && err.errno !== 1060) console.log("Document preview migration warning:", err.message);
        }
    );
}

// Admin-managed routes / bus stops / distance plan rates live in MySQL.
// These idempotent statements only create missing tables; existing data is
// never dropped or modified.
function ensureManagementTables() {
    const statements = [
        `CREATE TABLE IF NOT EXISTS routes (
            id INT NOT NULL AUTO_INCREMENT,
            route_code VARCHAR(50) NOT NULL,
            from_stop VARCHAR(150) NOT NULL,
            to_stop VARCHAR(150) NOT NULL,
            distance_km DECIMAL(10,2) NULL DEFAULT 0.00,
            bus_type_id INT NULL,
            route_status ENUM('published','unpublished') NULL DEFAULT 'published',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_route_code (route_code)
        )`,
        `CREATE TABLE IF NOT EXISTS bus_stops (
            id INT NOT NULL AUTO_INCREMENT,
            stop_code VARCHAR(50) NULL,
            stop_name VARCHAR(150) NOT NULL,
            city VARCHAR(100) NULL,
            location VARCHAR(255) NULL,
            route_codes VARCHAR(255) NULL,
            daily_services INT NULL DEFAULT 0,
            status ENUM('active','inactive') NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_stop_name (stop_name)
        )`,
        `CREATE TABLE IF NOT EXISTS admin_plan_rates (
            id INT NOT NULL AUTO_INCREMENT,
            pass_type_id INT NULL,
            plan_label VARCHAR(100) NOT NULL,
            distance_min_km DECIMAL(10,2) NOT NULL DEFAULT 0,
            distance_max_km DECIMAL(10,2) NOT NULL DEFAULT 0,
            monthly_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            three_month_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            half_year_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            yearly_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )`
    ];

    // Run creation statements in order. The route migrations must run only
    // after an older database's routes table has been confirmed to exist.
    const runCreate = (index = 0) => {
        if (index >= statements.length) return migrateRoutes();
        db.query(statements[index], err => {
            if (err) console.log("Management table migration warning:", err.message);
            runCreate(index + 1);
        });
    };

    const migrateRoutes = () => {
        const routeMigrations = [
            "ALTER TABLE routes ADD COLUMN route_code VARCHAR(50) NULL",
            "ALTER TABLE routes ADD COLUMN bus_type_id INT NULL",
            "ALTER TABLE routes ADD COLUMN route_status ENUM('published','unpublished') NULL DEFAULT 'published'",
            "ALTER TABLE routes ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        ];
        const run = (index = 0) => {
            if (index >= routeMigrations.length) return backfillRoutes();
            db.query(routeMigrations[index], err => {
                // 1060 = column already exists. That is expected on a current DB.
                if (err && err.errno !== 1060) console.log("Route table migration warning:", err.message);
                run(index + 1);
            });
        };
        run();
    };

    const backfillRoutes = () => {
        db.query("UPDATE routes SET route_status = 'published' WHERE route_status IS NULL", err => {
            if (err) console.log("Route status migration warning:", err.message);
            db.query("UPDATE routes SET route_code = CONCAT('LEGACY-', id) WHERE route_code IS NULL OR route_code = ''", codeErr => {
                if (codeErr) console.log("Route code migration warning:", codeErr.message);
            });
        });
    };

    runCreate();
}

// The selected plan amount displayed to the user is the authoritative amount.
// It is stored on the application so payments and admin views always agree.
function ensurePlanAmountColumn() {
    db.query(
        "ALTER TABLE pass_applications ADD COLUMN plan_amount DECIMAL(10,2) NULL",
        (err) => {
            if (err && err.errno !== 1060) console.log("Plan amount migration warning:", err.message);
        }
    );
}

// Keep an issued-pass distance snapshot so Admin pass edits can be displayed
// on the user's digital pass without mutating a shared route.
function ensurePassDistanceColumn() {
    db.query(
        "ALTER TABLE bus_passes ADD COLUMN distance_km DECIMAL(10,2) NULL AFTER route_to",
        (err) => {
            if (err && err.errno !== 1060) console.log("Pass distance migration warning:", err.message);
        }
    );
}

// Keep a permanent copy of the exact details submitted for each application.
// User profile/detail tables can change later, but an application must continue
// to show the values that were submitted for that specific application.
function ensureApplicationSubmissionSnapshotTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS application_submission_details (
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
            CONSTRAINT fk_snapshot_application FOREIGN KEY (application_id)
                REFERENCES pass_applications(id) ON DELETE CASCADE
        )`;

    db.query(sql, (err) => {
        if (err) {
            console.log("Application snapshot migration warning:", err.message);
            return;
        }

        db.query("ALTER TABLE application_submission_details ADD COLUMN student_category VARCHAR(30) NULL", (columnErr) => {
            if (columnErr && columnErr.errno !== 1060) console.log("Application category migration warning:", columnErr.message);
        });
        db.query("ALTER TABLE application_submission_details ADD COLUMN class_course VARCHAR(150) NULL", (columnErr) => {
            if (columnErr && columnErr.errno !== 1060) console.log("Application class-course migration warning:", columnErr.message);
        });
        db.query("ALTER TABLE application_submission_details ADD COLUMN academic_year VARCHAR(30) NULL", (columnErr) => {
            if (columnErr && columnErr.errno !== 1060) console.log("Application academic-year migration warning:", columnErr.message);
        });

        // Backfill older applications once. New applications are saved with a
        // snapshot at route selection time. INSERT IGNORE leaves existing
        // snapshots untouched.
        const backfill = `
            INSERT IGNORE INTO application_submission_details
                (application_id, user_id, user_type, full_name, mobile, email, date_of_birth, gender,
                 id_number, organization_name, college_name, father_name, mother_name, contact_number,
                 employee_id, department, designation, city, district, state, pin_code, permanent_address)
            SELECT
                pa.id, u.id, u.user_type, u.full_name, u.mobile, u.email,
                COALESCE(sd.date_of_birth, ed.date_of_birth),
                COALESCE(sd.gender, ed.gender),
                COALESCE(sd.aadhaar_number, ed.employee_id),
                ed.organization_name, sd.college_name, sd.father_name, sd.mother_name, sd.contact_number,
                ed.employee_id, ed.department, ed.designation,
                COALESCE(sd.city, ed.city), COALESCE(sd.district, ed.district), COALESCE(sd.state, ed.state),
                COALESCE(sd.pin_code, ed.pin_code), COALESCE(sd.permanent_address, ed.permanent_address)
            FROM pass_applications pa
            JOIN users u ON u.id = pa.user_id
            LEFT JOIN student_details sd ON sd.user_id = pa.user_id
            LEFT JOIN employee_details ed ON ed.user_id = pa.user_id`;
                db.query(backfill, (backfillErr) => {
            if (backfillErr) console.log("Application snapshot backfill warning:", backfillErr.message);
        });
    });
}

function ensureProfileEditableColumns() {
    db.query("SHOW INDEX FROM users", (indexErr, indexes) => {
        if (indexErr) {
            console.log("Profile index check skipped:", indexErr.message);
            return;
        }

        const uniqueMobile = indexes.some(i => i.Key_name === "unique_mobile" && i.Non_unique === 0);
        const uniqueEmail = indexes.some(i => i.Key_name === "unique_email" && i.Non_unique === 0);
        const steps = [];

        if (uniqueMobile) steps.push("ALTER TABLE users DROP INDEX unique_mobile, ADD INDEX idx_mobile (mobile)");
        if (uniqueEmail) steps.push("ALTER TABLE users DROP INDEX unique_email, ADD INDEX idx_email (email)");

        const runNext = (i = 0) => {
            if (i >= steps.length) return;
            db.query(steps[i], (err) => {
                if (err) console.log("Profile index migration warning:", err.message);
                runNext(i + 1);
            });
        };

        runNext();
    });
}


// ==========================================
// SIGNUP API
// ==========================================

app.post("/signup", async (req, res) => {

    const {
        fullname,
        mobile,
        email,
        password
    } = req.body;


    // --------------------------------------
    // EMPTY FIELD VALIDATION
    // --------------------------------------

    if (!fullname || !mobile || !email || !password) {

        return res.status(400).json({
            success: false,
            message: "Please fill all fields."
        });

    }


    // --------------------------------------
    // CLEAN DATA
    // --------------------------------------

    const cleanFullname = fullname.trim();
    const cleanMobile = mobile.trim();
    const cleanEmail = email.trim().toLowerCase();


    // --------------------------------------
    // EMAIL VALIDATION
    // --------------------------------------

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailPattern.test(cleanEmail)) {

        return res.status(400).json({
            success: false,
            message: "Please enter a valid email address."
        });

    }


    // --------------------------------------
    // MOBILE VALIDATION
    // --------------------------------------

    const mobilePattern = /^[0-9]{10}$/;


    if (!mobilePattern.test(cleanMobile)) {

        return res.status(400).json({
            success: false,
            message: "Please enter a valid 10-digit mobile number."
        });

    }


    // --------------------------------------
    // PASSWORD VALIDATION
    // --------------------------------------

    if (password.length < 6) {

        return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters."
        });
    }


    try {

        // --------------------------------------
        // CHECK EMAIL OR MOBILE
        // --------------------------------------

        db.query(
            "SELECT id FROM users WHERE email = ? OR mobile = ?",
            [cleanEmail, cleanMobile],
            async (err, result) => {

                if (err) {

                    console.log("Database Error:", err);

                    return res.status(500).json({
                        success: false,
                        message: "Database Error."
                    });

                }


                // --------------------------------------
                // ACCOUNT ALREADY EXISTS
                // --------------------------------------

                if (result.length > 0) {

                    return res.status(400).json({
                        success: false,
                        message: "Email or Mobile Number already registered."
                    });

                }


                // --------------------------------------
                // HASH PASSWORD
                // --------------------------------------

                const hashedPassword =
                    await bcrypt.hash(password, 10);


                // --------------------------------------
                // CREATE STUDENT ID
                // --------------------------------------

                const studentId =
                    "STU" +
                    Date.now().toString().slice(-6);


                // --------------------------------------
                // INSERT USER
                // --------------------------------------

                db.query(

                    `INSERT INTO users
                    (
            student_id,
            full_name,
                        mobile,
                        email,
                        password,
                        user_type
                    )
                    VALUES (?, ?, ?, ?, ?, ?)`,

                    [
                        studentId,
                        cleanFullname,
                        cleanMobile,
                        cleanEmail,
                        hashedPassword,
                        "student"
                    ],

                    (err, result) => {

                        if (err) {

                            console.log("Registration Error:", err);

                            return res.status(500).json({
                                success: false,
                                message: "Registration Failed."
                            });

                        }


                        return res.status(200).json({

                            success: true,

                            message:
                                "Account Created Successfully.",

                            student_id:
                                studentId

                        });

                    }

                );

            }

        );

    }

    catch (error) {

        console.log("Signup Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error."
        });

    }

});


// ==========================================
// LOGIN API
// ==========================================

app.post("/login", (req, res) => {

    const {
        identifier,
        password
    } = req.body;


    // ======================================
    // EMPTY VALIDATION
    // ======================================

    if (!identifier || !password) {

        return res.status(400).json({

            success: false,

            message:
                "Please enter your Student ID, Email or Mobile Number and password."

        });

    }


    // ======================================
    // CLEAN INPUT
    // ======================================

    const value = identifier.trim();

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const mobilePattern =
        /^[0-9]{10}$/;

    const studentIdPattern =
        /^STU[0-9]{6}$/i;


    const isEmail =
        emailPattern.test(value);

    const isMobile =
        mobilePattern.test(value);

    const isStudentId =
        studentIdPattern.test(value);


    // ======================================
    // WRONG FORMAT
    // ======================================

    if (!isEmail && !isMobile && !isStudentId) {

        return res.status(400).json({

            success: false,

            message:
                "Please enter a valid Student ID, Email or 10-digit Mobile Number."

        });

    }


    // ======================================
    // FIND USER
    // ======================================

    let query = "";
    let queryValue = value;


    if (isEmail) {

        query =
            "SELECT * FROM users WHERE LOWER(email) = LOWER(?)";

    }

    else if (isMobile) {

        query =
            "SELECT * FROM users WHERE mobile = ?";

    }

    else {

        query =
            "SELECT * FROM users WHERE UPPER(student_id) = UPPER(?)";

    }


    db.query(

        query,

        [queryValue],

        async (err, result) => {

            if (err) {

                console.log("Login Database Error:", err);

                return res.status(500).json({

                    success: false,

                    message: "Database Error."

                });

            }


            // ==================================
            // USER NOT FOUND
            // ==================================

            if (result.length === 0) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid Student ID / Email / Mobile Number or Password."

                });

            }


            // Password is used to select the correct account when Profile Edit
            // has resulted in the same email/mobile being present on more than one
            // account. Student ID remains unique and therefore still returns one row.
            let user = null;

            try {
                for (const candidate of result) {
                    if (await bcrypt.compare(password, candidate.password)) {
                        user = candidate;
                        break;
                    }
                }

                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid Student ID / Email / Mobile Number or Password."
                    });
                }


                // ==================================
                // LOGIN SUCCESS
                // ==================================

                return res.status(200).json({

                    success: true,

                    message:
                        "Login Successfully!",

                    user: {

                        id: user.id,

                        student_id:
                            user.student_id,

                        full_name:
                            user.full_name,

                        email:
                            user.email,

                        mobile:
                            user.mobile,

                        date_of_birth:
                            user.date_of_birth,

                        user_type:
                            user.user_type

                    }

                });

            }

            catch (error) {

                console.log("Password Verification Error:", error);

                return res.status(500).json({

                    success: false,

                    message:
                        "Password Verification Failed."

                });

            }

        }

    );

});


// ==========================================
// APPLICATION DATA APIs
// ==========================================

function getPassTypeId(passType, callback) {
    db.query("SELECT id FROM pass_types WHERE pass_type_name = ?", [passType], (err, result) => {
        callback(err, result[0] && result[0].id);
    });
}

// A browser-held application id is only a convenience.  Every workflow read
// and write below verifies that the application belongs to the supplied user.
function findOwnedApplication(applicationId, userId, callback) {
    db.query(
        "SELECT pa.*, pt.pass_type_name FROM pass_applications pa JOIN pass_types pt ON pt.id = pa.pass_type_id WHERE pa.id = ? AND pa.user_id = ? LIMIT 1",
        [Number(applicationId), Number(userId)],
        (err, rows) => callback(err, rows && rows[0])
    );
}

function saveDetailsSnapshot(applicationId, userId, passType, details, callback) {
    if (!applicationId) return callback(null);
    findOwnedApplication(applicationId, userId, (ownerErr, application) => {
        if (ownerErr || !application) return callback(ownerErr || new Error("Application not found."));
        if (application.pass_type_name !== passType) return callback(new Error("Pass type does not match application."));
        const employee = passType === "Employee Pass";
        const sql = `INSERT INTO application_submission_details
            (application_id, user_id, user_type, full_name, mobile, email, date_of_birth, gender, id_number,
             organization_name, college_name, class_course, academic_year, father_name, mother_name, contact_number,
             employee_id, department, designation, city, district, state, pin_code, permanent_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), mobile=VALUES(mobile), email=VALUES(email),
             date_of_birth=VALUES(date_of_birth), gender=VALUES(gender), id_number=VALUES(id_number),
             organization_name=VALUES(organization_name), college_name=VALUES(college_name), class_course=VALUES(class_course), academic_year=VALUES(academic_year),
             father_name=VALUES(father_name), mother_name=VALUES(mother_name), contact_number=VALUES(contact_number),
             employee_id=VALUES(employee_id), department=VALUES(department), designation=VALUES(designation),
             city=VALUES(city), district=VALUES(district), state=VALUES(state), pin_code=VALUES(pin_code), permanent_address=VALUES(permanent_address)`;
        const values = employee
            ? [applicationId, userId, "employee", details.fullName, details.mobile, details.email, details.dateOfBirth || null, details.gender || null, details.employeeId || null, details.organization || null, null, null, null, null, details.contactNumber || null, details.employeeId || null, details.department || null, details.designation || null, details.city || null, details.district || null, details.state || null, details.pinCode || null, details.permanentAddress || null]
            : [applicationId, userId, "student", details.fullName, details.mobile, details.email, details.dateOfBirth || null, details.gender || null, details.aadhaar || null, null, details.collegeName || null, details.classCourse || null, details.academicYear || null, details.fatherName || null, details.motherName || null, details.contactNumber || null, null, null, null, details.city || null, details.district || null, details.state || null, details.pinCode || null, details.permanentAddress || null];
        db.query(sql, values, callback);
    });
}

// Start a fresh application draft for each new application flow.
app.post("/api/applications/current", (req, res) => {
    const userId = Number(req.body.userId);
    const passType = String(req.body.passType || "").trim();
    if (!userId || !passType) return res.status(400).json({ success: false, message: "User and pass type are required." });
    getPassTypeId(passType, (err, passTypeId) => {
        if (err || !passTypeId) return res.status(400).json({ success: false, message: "Invalid pass type." });
        db.query("SELECT id FROM users WHERE id = ? LIMIT 1", [userId], (userErr, users) => {
            if (userErr) return res.status(500).json({ success: false, message: "Could not check user." });
            if (!users.length) return res.status(404).json({ success: false, message: "User not found." });
            // A new application must be a new draft. Do not reuse an older draft,
            // because the user expects every fresh form to start empty and receive
            // its own application record.
        db.query("INSERT INTO pass_applications (user_id, pass_type_id, application_status) VALUES (?, ?, 'draft')", [userId, passTypeId], (insertErr, result) => {
            if (insertErr) return res.status(500).json({ success: false, message: "Could not start application." });
            res.json({ success: true, applicationId: result.insertId, passType });
        });
        });
    });
});

app.get("/api/applications/current", (req, res) => {
    const userId = Number(req.query.userId);
    const applicationId = Number(req.query.applicationId);
    if (!userId) return res.status(400).json({ success: false, message: "userId is required." });
    const where = applicationId ? "pa.id = ? AND pa.user_id = ?" : "pa.user_id = ?";
    const values = applicationId ? [applicationId, userId] : [userId];
    db.query(`SELECT pa.id AS application_id, pa.application_status, pt.pass_type_name, pa.route_id, pa.bus_type_id, pa.plan_id,
                     r.from_stop, r.to_stop, r.distance_km, bt.bus_type_name, pp.plan_name,
                     COALESCE(pa.plan_amount, pp.amount) AS amount, pp.validity_days
              FROM pass_applications pa JOIN pass_types pt ON pt.id = pa.pass_type_id
              LEFT JOIN routes r ON r.id = pa.route_id LEFT JOIN bus_types bt ON bt.id = pa.bus_type_id
              LEFT JOIN pass_plans pp ON pp.id = pa.plan_id WHERE ${where}
              ORDER BY (pa.application_status = 'draft') DESC, pa.updated_at DESC, pa.id DESC LIMIT 1`, values,
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: "Could not load application." });
            res.json({ success: true, application: rows[0] || null });
        });
});

app.get("/api/applications/:id/data", (req, res) => {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ success: false, message: "userId is required." });
    findOwnedApplication(req.params.id, userId, (err, application) => {
        if (err) return res.status(500).json({ success: false, message: "Could not load application." });
        if (!application) return res.status(404).json({ success: false, message: "Application not found." });
        db.query("SELECT * FROM application_submission_details WHERE application_id = ? LIMIT 1", [application.id], (detailErr, details) => {
            if (detailErr) return res.status(500).json({ success: false, message: "Could not load application details." });
            db.query("SELECT document_type, file_name, preview_data, document_status FROM documents WHERE application_id = ? ORDER BY uploaded_at DESC", [application.id], (documentErr, documents) => {
                if (documentErr) return res.status(500).json({ success: false, message: "Could not load documents." });
                res.json({ success: true, application, details: details[0] || null, documents });
            });
        });
    });
});

app.get("/api/details", (req, res) => {
    const { userId, passType } = req.query;
    if (!userId || !passType) return res.status(400).json({ success: false, message: "userId and passType are required." });
    const table = passType === "Employee Pass" ? "employee_details" : "student_details";
    db.query(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [userId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Could not load details." });
        res.json({ success: true, details: result[0] || null });
    });
});

app.get("/api/profile", (req, res) => {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ success: false, message: "userId is required." });

    db.query(
        "SELECT id, student_id, full_name, mobile, email, date_of_birth, user_type FROM users WHERE id = ? LIMIT 1",
        [userId],
        (err, users) => {
            if (err) return res.status(500).json({ success: false, message: "Could not load profile." });
            if (!users.length) return res.status(404).json({ success: false, message: "User not found." });

            const user = users[0];
            const table = user.user_type === "employee" ? "employee_details" : "student_details";

            db.query(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [userId], (detailErr, details) => {
                if (detailErr) return res.status(500).json({ success: false, message: "Could not load profile details." });
                res.json({
                    success: true,
                    profile: {
                        id: user.id,
                        student_id: user.student_id,
                        full_name: user.full_name,
                        mobile: user.mobile,
                        email: user.email,
                        date_of_birth: user.date_of_birth,
                        user_type: user.user_type,
                        details: details[0] || null
                    }
                });
            });
        }
    );
});

app.put("/api/profile", (req, res) => {
    const userId = Number(req.body.userId);
    const fullName = String(req.body.fullName || "").trim();
    const mobile = String(req.body.mobile || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!userId || !fullName || !mobile || !email) {
        return res.status(400).json({ success: false, message: "Name, mobile number and email are required." });
    }
    if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ success: false, message: "Enter a valid 10-digit mobile number." });
    }
    if (!validEmail(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    db.query(
        "SELECT id, user_type FROM users WHERE id = ? LIMIT 1",
        [userId],
        (userErr, users) => {
            if (userErr) return res.status(500).json({ success: false, message: "Could not check account." });
            if (!users.length) return res.status(404).json({ success: false, message: "User not found." });

            // Profile Edit is intentionally allowed to save the email/mobile
            // entered by this user without the "already in use" profile error.
            // New-account signup still performs its own duplicate validation.
            const userType = users[0].user_type;
            const table = userType === "employee" ? "employee_details" : "student_details";

            db.beginTransaction((txErr) => {
                if (txErr) return res.status(500).json({ success: false, message: "Could not start profile update." });

                db.query(
                    "UPDATE users SET full_name = ?, mobile = ?, email = ? WHERE id = ?",
                    [fullName, mobile, email, userId],
                    (updateErr, result) => {
                        if (updateErr || !result.affectedRows) {
                            return db.rollback(() => res.status(updateErr ? 500 : 404).json({
                                success: false,
                                message: updateErr ? "Could not update profile." : "User not found."
                            }));
                        }

                        // Keep Student/Employee details synchronized with the profile.
                        db.query(
                            `UPDATE ${table} SET full_name = ?, mobile = ?, email = ? WHERE user_id = ?`,
                            [fullName, mobile, email, userId],
                            (detailErr) => {
                                if (detailErr) {
                                    return db.rollback(() => res.status(500).json({
                                        success: false,
                                        message: "Profile changed could not be synchronized with details."
                                    }));
                                }

                                db.commit((commitErr) => {
                                    if (commitErr) {
                                        return db.rollback(() => res.status(500).json({
                                            success: false,
                                            message: "Could not save profile changes."
                                        }));
                                    }

                                    res.json({
                                        success: true,
                                        message: "Profile updated successfully in MySQL.",
                                        profile: {
                                            id: userId,
                                            full_name: fullName,
                                            mobile,
                                            email,
                                            user_type: userType
                                        }
                                    });
                                });
                            }
                        );
                    }
                );
            });
        }
    );
});

app.post("/api/details", (req, res) => {
    const { userId, passType, details, applicationId } = req.body;
    const numericUserId = Number(userId);
    const numericApplicationId = Number(applicationId);
    if (!numericUserId || !Number.isSafeInteger(numericApplicationId) || numericApplicationId <= 0 || !passType || !details) {
        return res.status(400).json({ success: false, message: "User, application, pass type and details are required." });
    }

    const employee = passType === "Employee Pass";
    const table = employee ? "employee_details" : "student_details";
    const cleanName = String(details.fullName || "").trim();
    const cleanMobile = String(details.mobile || "").trim();
    const cleanEmail = String(details.email || "").trim().toLowerCase();

    if (!cleanName || !/^\d{10}$/.test(cleanMobile) || !validEmail(cleanEmail)) {
        return res.status(400).json({ success: false, message: "Please enter valid name, 10-digit mobile number and email." });
    }

    const columns = employee
        ? "full_name, date_of_birth, gender, mobile, email, organization_name, employee_id, department, designation, city, district, state, pin_code, permanent_address"
        : "full_name, date_of_birth, gender, mobile, email, aadhaar_number, college_name, class_course, academic_year, father_name, mother_name, contact_number, city, district, state, pin_code, permanent_address";
    const values = employee
        ? [cleanName, details.dateOfBirth || null, details.gender, cleanMobile, cleanEmail, details.organization, details.employeeId, details.department, details.designation, details.city, details.district, details.state, details.pinCode, details.permanentAddress]
        : [cleanName, details.dateOfBirth || null, details.gender, cleanMobile, cleanEmail, details.aadhaar, details.collegeName, details.classCourse, details.academicYear, details.fatherName, details.motherName, details.contactNumber, details.city, details.district, details.state, details.pinCode, details.permanentAddress];

    // Verify ownership before changing the shared profile/detail records.
    findOwnedApplication(numericApplicationId, numericUserId, (applicationErr, application) => {
        if (applicationErr) return res.status(500).json({ success: false, message: "Could not check application." });
        if (!application) return res.status(404).json({ success: false, message: "Application not found for this user." });
        if (application.pass_type_name !== passType) return res.status(400).json({ success: false, message: "Pass type does not match this application." });

    db.query("SELECT id, user_type FROM users WHERE id = ? LIMIT 1", [numericUserId], (userErr, users) => {
        if (userErr) return res.status(500).json({ success: false, message: "Could not check account." });
        if (!users.length) return res.status(404).json({ success: false, message: "User not found." });

        db.query(
            "SELECT id FROM users WHERE (LOWER(email) = LOWER(?) OR mobile = ?) AND id <> ? LIMIT 1",
            [cleanEmail, cleanMobile, numericUserId],
            (conflictErr, conflicts) => {
                if (conflictErr) return res.status(500).json({ success: false, message: "Could not validate account details." });
                if (conflicts.length) return res.status(409).json({ success: false, message: "That email address or mobile number belongs to another account." });

                db.beginTransaction((txErr) => {
                    if (txErr) return res.status(500).json({ success: false, message: "Could not start details update." });

                    db.query(
                        "UPDATE users SET full_name = ?, mobile = ?, email = ? WHERE id = ?",
                        [cleanName, cleanMobile, cleanEmail, numericUserId],
                        (userUpdateErr) => {
                            if (userUpdateErr) return db.rollback(() => res.status(500).json({ success: false, message: "Could not update account details." }));

                            db.query(`SELECT id FROM ${table} WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [numericUserId], (findErr, existing) => {
                                if (findErr) return db.rollback(() => res.status(500).json({ success: false, message: "Could not check existing details." }));

                                const finish = (action, id) => {
                                    saveDetailsSnapshot(numericApplicationId, numericUserId, passType, { ...details, fullName: cleanName, mobile: cleanMobile, email: cleanEmail }, snapshotErr => {
                                        if (snapshotErr) return db.rollback(() => res.status(500).json({ success: false, message: "Could not link details to this application." }));
                                        db.commit((commitErr) => {
                                            if (commitErr) return db.rollback(() => res.status(500).json({ success: false, message: "Could not save details." }));
                                            res.json({ success: true, id, action, applicationId: numericApplicationId, message: "Details saved successfully in MySQL." });
                                        });
                                    });
                                };

                                if (existing[0]) {
                                    const assignments = columns.split(", ").map(column => `${column} = ?`).join(", ");
                                    db.query(`UPDATE ${table} SET ${assignments} WHERE id = ?`, [...values, existing[0].id], (updateErr) => {
                                        if (updateErr) return db.rollback(() => res.status(500).json({ success: false, message: "Could not update details." }));
                                        finish("updated", existing[0].id);
                                    });
                                    return;
                                }

                                db.query(`INSERT INTO ${table} (user_id, ${columns}) VALUES (?, ${values.map(() => "?").join(", ")})`, [numericUserId, ...values], (insertErr, result) => {
                                    if (insertErr) return db.rollback(() => res.status(500).json({ success: false, message: "Could not save details." }));
                                    finish("created", result.insertId);
                                });
                            });
                        }
                    );
                });
            }
        );
    });
    });
});

app.get("/api/plans", (req, res) => {
    getPassTypeId(req.query.passType, (err, passTypeId) => {
        if (err || !passTypeId) return res.status(400).json({ success: false, message: "Invalid pass type." });
        db.query("SELECT id, plan_name, validity_days, amount, description FROM pass_plans WHERE pass_type_id = ? AND is_active = TRUE ORDER BY validity_days", [passTypeId], (queryErr, result) => {
            if (queryErr) return res.status(500).json({ success: false, message: "Could not load plans." });
            res.json({ success: true, plans: result });
        });
    });
});

app.post("/api/plans/select", (req, res) => {
    const { applicationId, userId, planId, planName, amount, validityDays } = req.body;
    if (!applicationId || !userId || (!planId && !planName)) return res.status(400).json({ success: false, message: "Application, user and plan are required." });
    findOwnedApplication(applicationId, userId, (ownerErr, application) => {
        if (ownerErr) return res.status(500).json({ success: false, message: "Could not check application." });
        if (!application) return res.status(404).json({ success: false, message: "Application not found." });
        const planSql = planId
            ? "SELECT id, plan_name, amount, validity_days FROM pass_plans WHERE id = ? AND pass_type_id = ? AND is_active = TRUE LIMIT 1"
            : "SELECT id, plan_name, amount, validity_days FROM pass_plans WHERE plan_name = ? AND pass_type_id = ? AND is_active = TRUE LIMIT 1";
        db.query(planSql, [planId || planName, application.pass_type_id], (planErr, plans) => {
            if (planErr) return res.status(500).json({ success: false, message: "Could not load plan." });
            if (!plans.length) return res.status(400).json({ success: false, message: "Invalid plan for this pass type." });
            const plan = plans[0];
            // The amount shown to the user (possibly the admin distance-band price)
            // is the authoritative payment amount and is stored on the application.
            const effectiveAmount = Number(amount) > 0 ? Number(amount) : Number(plan.amount || 0);
            const effectiveValidity = Number(validityDays) > 0 ? Number(validityDays) : Number(plan.validity_days || 30);
            db.query(
                "UPDATE pass_applications SET plan_id = ?, plan_amount = ?, application_status = 'payment_pending' WHERE id = ? AND user_id = ? AND application_status IN ('draft', 'payment_pending')",
                [plan.id, effectiveAmount, application.id, userId],
                (updateErr, updateResult) => {
                    if (updateErr) return res.status(500).json({ success: false, message: "Could not save plan." });
                    if (!updateResult.affectedRows) return res.status(404).json({ success: false, message: "Application is not available for plan selection." });
                    res.json({ success: true, plan: { ...plan, amount: effectiveAmount, validity_days: effectiveValidity } });
                }
            );
        });
    });
});

app.get("/api/history", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: "userId is required." });

    const query = `
        SELECT
            pa.id AS application_id,
            pt.pass_type_name,
            pa.application_status,
            pa.rejection_reason,
            pa.rejected_at,
            pa.resubmitted_from_application_id,
            pa.created_at,
            pa.updated_at,
            COALESCE(bp.holder_name, asd.full_name, u.full_name) AS submitted_full_name,
            COALESCE(asd.id_number, sd.aadhaar_number, ed.employee_id) AS submitted_id_number,
            asd.student_category AS submitted_student_category,
            asd.academic_year AS submitted_academic_year,
            COALESCE(CASE WHEN pt.pass_type_name = 'Student Pass' THEN bp.college_or_organization END, asd.college_name, sd.college_name) AS submitted_college_name,
            COALESCE(CASE WHEN pt.pass_type_name = 'Employee Pass' THEN bp.college_or_organization END, asd.organization_name, ed.organization_name) AS submitted_organization_name,
            COALESCE(asd.employee_id, ed.employee_id) AS submitted_employee_id,
            COALESCE(asd.department, ed.department) AS submitted_department,
            COALESCE(CASE WHEN pt.pass_type_name = 'Employee Pass' THEN bp.course_or_designation END, asd.designation, ed.designation) AS submitted_designation,
            COALESCE(CASE WHEN pt.pass_type_name = 'Student Pass' THEN bp.course_or_designation END, asd.class_course, sd.class_course) AS submitted_class_course,
            COALESCE(bp.route_from, r.from_stop) AS from_stop,
            COALESCE(bp.route_to, r.to_stop) AS to_stop,
            COALESCE(bp.distance_km, r.distance_km) AS distance_km,
            bp.pass_id,
            bt.bus_type_name,
            pp.plan_name,
            pp.validity_days,
            COALESCE(pa.plan_amount, pp.amount) AS plan_amount,
            pay.transaction_id,
            pay.amount AS paid_amount,
            pay.payment_date,
            pay.payment_status,
            photo_doc.preview_data AS passport_photo,
            bp.valid_from,
            bp.valid_to,
            bp.pass_status
        FROM pass_applications pa
        JOIN users u ON u.id = pa.user_id
        JOIN pass_types pt ON pt.id = pa.pass_type_id
        LEFT JOIN routes r ON r.id = pa.route_id
        LEFT JOIN bus_types bt ON bt.id = pa.bus_type_id
        LEFT JOIN pass_plans pp ON pp.id = pa.plan_id
        LEFT JOIN payments pay ON pay.application_id = pa.id AND pay.payment_status = 'success'
        LEFT JOIN documents photo_doc ON photo_doc.application_id = pa.id AND photo_doc.document_type = 'passport_photo'
        LEFT JOIN bus_passes bp ON bp.application_id = pa.id
        LEFT JOIN application_submission_details asd ON asd.application_id = pa.id
        LEFT JOIN student_details sd ON sd.user_id = pa.user_id
        LEFT JOIN employee_details ed ON ed.user_id = pa.user_id
        WHERE pa.user_id = ?
        ORDER BY pa.created_at DESC, pa.id DESC`;

    db.query(query, [userId], (err, history) => {
        if (err) return res.status(500).json({ success: false, message: "Could not load pass history." });
        res.json({ success: true, history });
    });
});

app.post("/api/routes", (req, res) => {
    const { userId, passType, fromStop, toStop, busType, applicationId } = req.body;
    const numericUserId = Number(userId);
    if (!numericUserId || !passType || !fromStop || !toStop || !busType) {
        return res.status(400).json({ success: false, message: "Route details are required." });
    }

    const employee = passType === "Employee Pass";

    getPassTypeId(passType, (err, passTypeId) => {
        if (err || !passTypeId) return res.status(400).json({ success: false, message: "Invalid pass type." });
        db.query("SELECT id FROM bus_types WHERE bus_type_name = ? LIMIT 1", [busType], (busErr, busResult) => {
            if (busErr || !busResult[0]) return res.status(400).json({ success: false, message: "Invalid bus type." });

            // Read the exact details the user just submitted. These values are
            // copied into an application-specific snapshot below so later
            // profile edits cannot change an older application.
            const detailSql = employee
                ? `SELECT u.id AS user_id, u.user_type, u.full_name AS u_full_name, u.mobile AS u_mobile, u.email AS u_email,
                          ed.full_name, ed.date_of_birth, ed.gender, ed.mobile, ed.email,
                          ed.organization_name, ed.employee_id, ed.department, ed.designation,
                          ed.city, ed.district, ed.state, ed.pin_code, ed.permanent_address
                   FROM users u LEFT JOIN employee_details ed ON ed.user_id = u.id
                   WHERE u.id = ? LIMIT 1`
                : `SELECT u.id AS user_id, u.user_type, u.full_name AS u_full_name, u.mobile AS u_mobile, u.email AS u_email,
                          sd.full_name, sd.date_of_birth, sd.gender, sd.mobile, sd.email,
                          sd.aadhaar_number, sd.college_name, sd.class_course, sd.academic_year, sd.father_name, sd.mother_name,
                          sd.contact_number, sd.city, sd.district, sd.state, sd.pin_code, sd.permanent_address
                   FROM users u LEFT JOIN student_details sd ON sd.user_id = u.id
                   WHERE u.id = ? LIMIT 1`;

            db.query(detailSql, [numericUserId], (detailErr, detailRows) => {
                if (detailErr) return res.status(500).json({ success: false, message: "Could not load submitted applicant details." });
                if (!detailRows[0]) return res.status(404).json({ success: false, message: "User account was not found." });
                const d = detailRows[0];
                const expectedUserType = employee ? "employee" : "student";
                if (d.user_type !== expectedUserType) {
                    return res.status(403).json({ success: false, message: "Pass type does not match applicant account." });
                }

                const findPublishedRoute = (callback) => {
                    const routeSql = `
                        SELECT r.id, r.distance_km FROM routes r
                        WHERE r.from_stop = ? AND r.to_stop = ? AND r.route_status = 'published'
                        ORDER BY r.id LIMIT 1`;
                    db.query(routeSql, [fromStop, toStop], (findErr, existing) => {
                        if (findErr) return callback(findErr);
                        if (!existing[0]) return callback(new Error("Selected route is no longer available. Please choose an active route from the Transport Office."));
                        callback(null, existing[0].id, Number(existing[0].distance_km || 0));
                    });
                };

                findPublishedRoute((routeErr, routeId, managedDistanceKm) => {
                    if (routeErr) {
                        const unavailable = /no longer available/i.test(routeErr.message || "");
                        return res.status(unavailable ? 400 : 500).json({ success: false, message: unavailable ? routeErr.message : "Could not save route." });
                    }

                    const snapshotValues = employee
                        ? [numericUserId, d.user_type || "employee", d.full_name || d.u_full_name, d.mobile || d.u_mobile,
                           d.email || d.u_email, d.date_of_birth || null, d.gender || null, d.employee_id || null,
                           d.organization_name || null, null, null, null, null, null, null, d.employee_id || null, d.department || null, d.designation || null,
                           d.city || null, d.district || null, d.state || null, d.pin_code || null, d.permanent_address || null]
                        : [numericUserId, d.user_type || "student", d.full_name || d.u_full_name, d.mobile || d.u_mobile,
                           d.email || d.u_email, d.date_of_birth || null, d.gender || null, d.aadhaar_number || null,
                           null, d.college_name || null, d.class_course || null, d.academic_year || null, d.father_name || null, d.mother_name || null, d.contact_number || null,
                           null, null, null, d.city || null, d.district || null, d.state || null, d.pin_code || null, d.permanent_address || null];

                    const saveSnapshot = (targetApplicationId, callback) => {
                        const snapshotSql = `
                            INSERT INTO application_submission_details
                                (application_id, user_id, user_type, full_name, mobile, email, date_of_birth, gender,
                                 id_number, organization_name, college_name, class_course, academic_year, father_name, mother_name, contact_number,
                                 employee_id, department, designation, city, district, state, pin_code, permanent_address)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                user_id = VALUES(user_id), user_type = VALUES(user_type), full_name = VALUES(full_name),
                                mobile = VALUES(mobile), email = VALUES(email), date_of_birth = VALUES(date_of_birth),
                                gender = VALUES(gender), id_number = VALUES(id_number), organization_name = VALUES(organization_name),
                                college_name = VALUES(college_name), class_course = VALUES(class_course), academic_year = VALUES(academic_year), father_name = VALUES(father_name), mother_name = VALUES(mother_name),
                                contact_number = VALUES(contact_number), employee_id = VALUES(employee_id), department = VALUES(department),
                                designation = VALUES(designation), city = VALUES(city), district = VALUES(district), state = VALUES(state),
                                pin_code = VALUES(pin_code), permanent_address = VALUES(permanent_address)`;
                        db.query(snapshotSql, [targetApplicationId, ...snapshotValues], callback);
                    };

                    const finish = (targetApplicationId) => {
                        saveSnapshot(targetApplicationId, (snapshotErr) => {
                            if (snapshotErr) {
                                console.error("Application snapshot save failed:", snapshotErr.message);
                                return res.status(500).json({ success: false, message: "Could not save application details." });
                            }
                            res.json({ success: true, routeId, applicationId: Number(targetApplicationId) });
                        });
                    };

                    if (applicationId && /^\d+$/.test(String(applicationId))) {
                        db.query(
                            "UPDATE pass_applications SET route_id = ?, bus_type_id = ?, route_distance_km_snapshot = ?, plan_id = NULL, application_status = 'draft' WHERE id = ? AND user_id = ? AND application_status IN ('draft', 'payment_pending')",
                            [routeId, busResult[0].id, managedDistanceKm, Number(applicationId), numericUserId],
                            (updateErr, updateResult) => {
                                if (updateErr) return res.status(500).json({ success: false, message: "Could not save application route." });
                                if (!updateResult.affectedRows) return res.status(404).json({ success: false, message: "Fresh application was not found." });
                                finish(Number(applicationId));
                            }
                        );
                        return;
                    }

                    db.query(
                        "INSERT INTO pass_applications (user_id, pass_type_id, route_id, bus_type_id, route_distance_km_snapshot, application_status) VALUES (?, ?, ?, ?, ?, 'draft')",
                        [numericUserId, passTypeId, routeId, busResult[0].id, managedDistanceKm],
                        (applicationErr, applicationResult) => {
                            if (applicationErr) return res.status(500).json({ success: false, message: "Could not save application route." });
                            finish(applicationResult.insertId);
                        }
                    );
                });
            });
        });
    });
});

app.get("/api/documents", (req, res) => {
    const { applicationId, userId } = req.query;
    if (!applicationId || !userId) return res.status(400).json({ success: false, message: "Application and user are required." });
    findOwnedApplication(applicationId, userId, (ownerErr, application) => {
        if (ownerErr) return res.status(500).json({ success: false, message: "Could not check application." });
        if (!application) return res.status(404).json({ success: false, message: "Application not found." });
        db.query("SELECT document_type, file_name, preview_data, document_status FROM documents WHERE application_id = ?", [application.id], (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: "Could not load documents." });
            res.json({ success: true, documents: rows });
        });
    });
});

app.post("/api/documents", (req, res) => {
    const { applicationId, userId, documentType, fileName, previewData } = req.body;
    if (!applicationId || !userId || !documentType || !fileName) return res.status(400).json({ success: false, message: "Document details are required." });
    findOwnedApplication(applicationId, userId, (ownerErr, application) => {
        if (ownerErr) return res.status(500).json({ success: false, message: "Could not check application." });
        if (!application) return res.status(404).json({ success: false, message: "Application not found." });
        db.query("UPDATE documents SET file_name = ?, preview_data = ?, document_status = 'uploaded', uploaded_at = CURRENT_TIMESTAMP WHERE application_id = ? AND document_type = ?", [fileName, previewData || null, application.id, documentType], (updateErr, update) => {
            if (updateErr) return res.status(500).json({ success: false, message: "Could not save document." });
            if (update.affectedRows) return res.json({ success: true, updated: true });
            db.query("INSERT INTO documents (application_id, document_type, file_name, preview_data, document_status) VALUES (?, ?, ?, ?, 'uploaded')", [application.id, documentType, fileName, previewData || null], (insertErr, result) => {
                if (insertErr) return res.status(500).json({ success: false, message: "Could not save document." });
                res.json({ success: true, id: result.insertId });
            });
        });
    });
});


// ==========================================
// TEST API
// ==========================================

// ==========================================
// ADMIN MANAGEMENT: ROUTES, BUS STOPS, PLAN RATES
// DB-backed so admin changes persist in MySQL and
// automatically reach the user screens after a refresh.
// ==========================================

function routeRowToApi(row) {
    return {
        id: row.id,
        routeCode: row.route_code,
        fromStop: row.from_stop,
        toStop: row.to_stop,
        distanceKm: row.distance_km === null || row.distance_km === undefined ? "" : Number(row.distance_km),
        busType: row.bus_type_name || "",
        routeStatus: row.route_status || "published"
    };
}

function resolveBusTypeId(busType, callback) {
    const value = String(busType || "").trim();
    if (!value) return callback(null, null);
    db.query("SELECT id FROM bus_types WHERE bus_type_name = ? LIMIT 1", [value], (err, rows) => {
        if (err) return callback(err);
        callback(null, rows[0] ? rows[0].id : null);
    });
}

app.get("/api/admin/routes", (req, res) => {
    db.query(
        "SELECT r.*, bt.bus_type_name FROM routes r LEFT JOIN bus_types bt ON bt.id = r.bus_type_id ORDER BY r.id DESC",
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: "Could not load routes." });
            res.json({ success: true, routes: rows.map(routeRowToApi) });
        }
    );
});

app.post("/api/admin/routes", (req, res) => {
    const { routeCode, fromStop, toStop, distanceKm, routeStatus, busType } = req.body;
    const code = String(routeCode || "").trim().toUpperCase();
    const from = String(fromStop || "").trim();
    const to = String(toStop || "").trim();
    const distance = Number(distanceKm);
    const status = String(routeStatus || "published").toLowerCase();
    if (!from || !to || from.length > 150 || to.length > 150) return res.status(400).json({ success: false, message: "Valid From and To stops are required." });
    if (code.length > 50 || !Number.isFinite(distance) || distance <= 0 || !["published", "unpublished"].includes(status)) return res.status(400).json({ success: false, message: "Enter a valid route code, distance, and publication status." });
    resolveBusTypeId(busType, (busErr, busTypeId) => {
        if (busErr) return res.status(500).json({ success: false, message: "Could not save route." });
        if (busType && !busTypeId) return res.status(400).json({ success: false, message: "Select a valid bus type." });
        const savedCode = code || `ADM-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
        db.query(
            "INSERT INTO routes (route_code, from_stop, to_stop, distance_km, bus_type_id, route_status) VALUES (?, ?, ?, ?, ?, ?)",
            [savedCode, from, to, distance, busTypeId, status],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, message: "Could not save route." });
                res.json({ success: true, id: result.insertId, route: { id: result.insertId, routeCode: savedCode, fromStop: from, toStop: to, distanceKm: distance, busType: busType || "", routeStatus: status } });
            }
        );
    });
});

app.put("/api/admin/routes/:id", (req, res) => {
    const routeId = Number(req.params.id);
    if (!Number.isSafeInteger(routeId) || routeId < 1) return res.status(400).json({ success: false, message: "Route ID is required." });
    const { fromStop, toStop, distanceKm, routeStatus, busType } = req.body;
    const from = String(fromStop || "").trim();
    const to = String(toStop || "").trim();
    const distance = Number(distanceKm);
    const status = String(routeStatus || "published").toLowerCase();
    const routeCode = String(req.body.routeCode || "").trim().toUpperCase();
    if (!from || !to || from.length > 150 || to.length > 150) return res.status(400).json({ success: false, message: "Valid From and To stops are required." });
    if (routeCode.length > 50 || !Number.isFinite(distance) || distance <= 0 || !["published", "unpublished"].includes(status)) return res.status(400).json({ success: false, message: "Enter a valid route code, distance, and publication status." });
    resolveBusTypeId(busType, (busErr, busTypeId) => {
        if (busErr) return res.status(500).json({ success: false, message: "Could not update route." });
        if (busType && !busTypeId) return res.status(400).json({ success: false, message: "Select a valid bus type." });
        db.query(
            routeCode
                ? "UPDATE routes SET route_code = ?, from_stop = ?, to_stop = ?, distance_km = ?, bus_type_id = ?, route_status = ? WHERE id = ?"
                : "UPDATE routes SET from_stop = ?, to_stop = ?, distance_km = ?, bus_type_id = ?, route_status = ? WHERE id = ?",
            routeCode
                ? [routeCode, from, to, distance, busTypeId, status, routeId]
                : [from, to, distance, busTypeId, status, routeId],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: "Could not update route." });
                db.query("SELECT id FROM routes WHERE id = ? LIMIT 1", [routeId], (readErr, rows) => {
                    if (readErr) return res.status(500).json({ success: false, message: "Could not verify saved route." });
                    if (!rows.length) return res.status(404).json({ success: false, message: "Route not found." });
                    res.json({ success: true, id: routeId });
                });
            }
        );
    });
});

// Never leave applications pointing at a deleted route.
app.delete("/api/admin/routes/:id", (req, res) => {
    const routeId = Number(req.params.id);
    if (!routeId) return res.status(400).json({ success: false, message: "Route ID is required." });
    db.query("UPDATE pass_applications SET route_id = NULL WHERE route_id = ?", [routeId], (detachErr) => {
        if (detachErr) return res.status(500).json({ success: false, message: "Could not delete route." });
        db.query("DELETE FROM routes WHERE id = ?", [routeId], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: "Could not delete route." });
            if (!result.affectedRows) return res.status(404).json({ success: false, message: "Route not found." });
            res.json({ success: true });
        });
    });
});

// ---- Bus stops ----

function busStopRowToApi(row) {
    return {
        id: row.id,
        name: row.stop_name,
        location: row.location || "",
        routes: row.route_codes || "",
        status: row.status || "active"
    };
}

app.get("/api/admin/bus-stops", (req, res) => {
    db.query("SELECT id, stop_name, location, route_codes, status FROM bus_stops ORDER BY stop_name ASC", (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Could not load bus stops." });
        res.json({ success: true, stops: rows.map(busStopRowToApi) });
    });
});

app.post("/api/admin/bus-stops", (req, res) => {
    const { name, location, routes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Stop name is required." });
    db.query(
        "INSERT INTO bus_stops (stop_name, location, route_codes) VALUES (?, ?, ?)",
        [String(name).trim(), String(location || "").trim(), String(routes || "").trim()],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, message: "Could not save bus stop." });
            res.json({ success: true, id: result.insertId, stop: { id: result.insertId, name, location: location || "", routes: routes || "" } });
        }
    );
});

app.put("/api/admin/bus-stops/:id", (req, res) => {
    const stopId = Number(req.params.id);
    if (!Number.isSafeInteger(stopId) || stopId < 1) return res.status(400).json({ success: false, message: "Stop ID is required." });
    const { name, location, routes } = req.body;
    const newName = String(name || "").trim();
    if (!newName) return res.status(400).json({ success: false, message: "Stop name is required." });

    db.query("SELECT stop_name FROM bus_stops WHERE id = ? LIMIT 1", [stopId], (findErr, found) => {
        if (findErr) return res.status(500).json({ success: false, message: "Could not load bus stop." });
        if (!found.length) return res.status(404).json({ success: false, message: "Bus stop not found." });
        const oldName = String(found[0].stop_name || "").trim();
        const updateStop = () => db.query(
            "UPDATE bus_stops SET stop_name = ?, location = ?, route_codes = ? WHERE id = ?",
            [newName, String(location || "").trim(), String(routes || "").trim(), stopId],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: "Could not update bus stop." });
                res.json({ success: true, id: stopId });
            }
        );
        if (oldName.toLowerCase() === newName.toLowerCase()) return updateStop();
        db.query("UPDATE routes SET from_stop = ? WHERE LOWER(TRIM(from_stop)) = LOWER(TRIM(?))", [newName, oldName], (fromErr) => {
            if (fromErr) return res.status(500).json({ success: false, message: "Could not update routes for this bus stop." });
            db.query("UPDATE routes SET to_stop = ? WHERE LOWER(TRIM(to_stop)) = LOWER(TRIM(?))", [newName, oldName], (toErr) => {
                if (toErr) return res.status(500).json({ success: false, message: "Could not update routes for this bus stop." });
                updateStop();
            });
        });
    });
});

app.delete("/api/admin/bus-stops/:id", (req, res) => {
    const stopId = Number(req.params.id);
    if (!stopId) return res.status(400).json({ success: false, message: "Stop ID is required." });
    db.query("SELECT stop_name FROM bus_stops WHERE id = ? LIMIT 1", [stopId], (findErr, stops) => {
        if (findErr) return res.status(500).json({ success: false, message: "Could not load bus stop." });
        if (!stops.length) return res.status(404).json({ success: false, message: "Bus stop not found." });
        const stopName = String(stops[0].stop_name || "").trim();
        db.query(
            "UPDATE routes SET route_status = 'unpublished' WHERE LOWER(TRIM(from_stop)) = LOWER(TRIM(?)) OR LOWER(TRIM(to_stop)) = LOWER(TRIM(?))",
            [stopName, stopName],
            (routeErr) => {
                if (routeErr) return res.status(500).json({ success: false, message: "Could not update routes for the deleted bus stop." });
                db.query("DELETE FROM bus_stops WHERE id = ?", [stopId], (err, result) => {
                    if (err) return res.status(500).json({ success: false, message: "Could not delete bus stop." });
                    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Bus stop not found." });
                    res.json({ success: true });
                });
            }
        );
    });
});

// ---- Pass plan rates (distance bands) ----

function planRateRowToApi(row) {
    return {
        id: row.id,
        planLabel: row.plan_label,
        distanceMinKm: Number(row.distance_min_km || 0),
        distanceMaxKm: Number(row.distance_max_km || 0),
        monthly: Number(row.monthly_amount || 0),
        threeMonths: Number(row.three_month_amount || 0),
        halfYearly: Number(row.half_year_amount || 0),
        yearly: Number(row.yearly_amount || 0)
    };
}

app.get("/api/admin/plan-rates", (req, res) => {
    db.query(
        "SELECT id, plan_label, distance_min_km, distance_max_km, monthly_amount, three_month_amount, half_year_amount, yearly_amount FROM admin_plan_rates ORDER BY distance_min_km ASC, id ASC",
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: "Could not load pass plans." });
            res.json({ success: true, plans: rows.map(planRateRowToApi) });
        }
    );
});

app.post("/api/admin/plan-rates", (req, res) => {
    const { planLabel, distanceMinKm, distanceMaxKm, monthly, threeMonths, halfYearly, yearly } = req.body;
    if (planLabel === undefined || distanceMinKm === undefined || distanceMaxKm === undefined) {
        return res.status(400).json({ success: false, message: "Distance range is required." });
    }
    db.query(
        "INSERT INTO admin_plan_rates (plan_label, distance_min_km, distance_max_km, monthly_amount, three_month_amount, half_year_amount, yearly_amount, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
        [String(planLabel).trim(), Number(distanceMinKm), Number(distanceMaxKm), Number(monthly || 0), Number(threeMonths || 0), Number(halfYearly || 0), Number(yearly || 0)],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, message: "Could not save pass plan." });
            res.json({ success: true, id: result.insertId });
        }
    );
});

app.put("/api/admin/plan-rates/:id", (req, res) => {
    const planId = Number(req.params.id);
    if (!Number.isSafeInteger(planId) || planId < 1) return res.status(400).json({ success: false, message: "Plan ID is required." });
    const { planLabel, distanceMinKm, distanceMaxKm, monthly, threeMonths, halfYearly, yearly } = req.body;
    const label = String(planLabel || "").trim();
    const numbers = [distanceMinKm, distanceMaxKm, monthly, threeMonths, halfYearly, yearly].map(Number);
    if (!label || label.length > 100 || numbers.some(value => !Number.isFinite(value) || value < 0) || numbers[0] > numbers[1]) {
        return res.status(400).json({ success: false, message: "Enter a valid plan label, distance range, and prices." });
    }
    db.query(
        "UPDATE admin_plan_rates SET plan_label = ?, distance_min_km = ?, distance_max_km = ?, monthly_amount = ?, three_month_amount = ?, half_year_amount = ?, yearly_amount = ? WHERE id = ?",
        [label, ...numbers, planId],
        (err) => {
            if (err) return res.status(500).json({ success: false, message: "Could not update pass plan." });
            db.query("SELECT id FROM admin_plan_rates WHERE id = ? LIMIT 1", [planId], (readErr, rows) => {
                if (readErr) return res.status(500).json({ success: false, message: "Could not verify saved pass plan." });
                if (!rows.length) return res.status(404).json({ success: false, message: "Pass plan not found." });
                res.json({ success: true, id: planId });
            });
        }
    );
});

app.delete("/api/admin/plan-rates/:id", (req, res) => {
    const planId = Number(req.params.id);
    if (!planId) return res.status(400).json({ success: false, message: "Plan ID is required." });
    db.query("DELETE FROM admin_plan_rates WHERE id = ?", [planId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Could not delete pass plan." });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Pass plan not found." });
        res.json({ success: true });
    });
});

// ==========================================
// USER-FACING: AVAILABLE ROUTES / BUS STOPS / PLAN RATES
// Users read these from MySQL, never from the admin's browser.
// ==========================================

app.get("/api/routes/available", (req, res) => {
    const sql = `
        SELECT r.id, r.route_code, r.from_stop, r.to_stop, r.distance_km, r.route_status, bt.bus_type_name
        FROM routes r
        LEFT JOIN bus_types bt ON bt.id = r.bus_type_id
        WHERE r.route_status = 'published'
        ORDER BY r.from_stop ASC, r.to_stop ASC, r.id ASC`;
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Could not load routes." });
        res.json({
            success: true,
            routes: rows.map(row => ({
                id: row.id,
                routeCode: row.route_code,
                from: row.from_stop,
                to: row.to_stop,
                distance: row.distance_km === null || row.distance_km === undefined ? "" : `${Number(row.distance_km)} KM`,
                distanceKm: Number(row.distance_km || 0),
                busType: row.bus_type_name || "",
                status: row.route_status
            }))
        });
    });
});

app.get("/api/bus-stops", (req, res) => {
    db.query(
        "SELECT id, stop_name AS name, location, route_codes AS routes FROM bus_stops WHERE status = 'active' OR status IS NULL ORDER BY stop_name ASC",
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: "Could not load bus stops." });
            res.json({ success: true, stops: rows });
        }
    );
});

// Distance-based plan pricing defined by the admin. Falls back to the
// default pass_plans amounts when no admin band matches the distance.
app.get("/api/plan-rates", (req, res) => {
    const passType = String(req.query.passType || "").trim();
    const distanceKm = Number(req.query.distanceKm || 0);
    if (!passType || !distanceKm) return res.status(400).json({ success: false, message: "Pass type and distance are required." });
    getPassTypeId(passType, (err, passTypeId) => {
        if (err || !passTypeId) return res.status(400).json({ success: false, message: "Invalid pass type." });
        db.query(
            `SELECT plan_label, distance_min_km, distance_max_km, monthly_amount, three_month_amount, half_year_amount, yearly_amount
             FROM admin_plan_rates
             WHERE is_active = 1 AND (pass_type_id = ? OR pass_type_id IS NULL)
               AND distance_min_km <= ? AND distance_max_km >= ?
             ORDER BY (pass_type_id = ?) DESC, distance_min_km DESC, id DESC LIMIT 1`,
            [passTypeId, distanceKm, distanceKm, passTypeId],
            (rateErr, rates) => {
                if (rateErr) return res.status(500).json({ success: false, message: "Could not load pass plan rates." });
                if (rates[0]) {
                    return res.json({
                        success: true,
                        plan: {
                            planLabel: rates[0].plan_label,
                            distanceMinKm: Number(rates[0].distance_min_km),
                            distanceMaxKm: Number(rates[0].distance_max_km),
                            monthly: Number(rates[0].monthly_amount),
                            threeMonths: Number(rates[0].three_month_amount),
                            halfYearly: Number(rates[0].half_year_amount),
                            yearly: Number(rates[0].yearly_amount),
                            fromAdmin: true
                        }
                    });
                }
                db.query(
                    "SELECT plan_name, validity_days, amount FROM pass_plans WHERE pass_type_id = ? AND is_active = TRUE ORDER BY validity_days ASC",
                    [passTypeId],
                    (planErr, plans) => {
                        if (planErr) return res.status(500).json({ success: false, message: "Could not load pass plans." });
                        const get = index => plans[index] ? Number(plans[index].amount || 0) : 0;
                        res.json({
                            success: true,
                            plan: {
                                planLabel: "Default",
                                distanceMinKm: 0,
                                distanceMaxKm: 100000,
                                monthly: get(0),
                                threeMonths: get(1),
                                halfYearly: get(2),
                                yearly: get(3),
                                fromAdmin: false
                            }
                        });
                    }
                );
            }
        );
    });
});

// ==========================================
// ADMIN DASHBOARD API
// Provides only the operational data needed by
// the administrator dashboard; never passwords.
// ==========================================

app.get("/api/admin/dashboard", (req, res) => {
    const summaryQuery = `
        SELECT
            COALESCE(SUM(CASE WHEN application_status IN ('paid', 'approved', 'rejected', 'completed') THEN 1 ELSE 0 END), 0) AS totalApplications,
            COALESCE(SUM(CASE WHEN application_status = 'paid' THEN 1 ELSE 0 END), 0) AS pendingApplications,
            COALESCE(SUM(CASE WHEN application_status IN ('approved', 'completed') THEN 1 ELSE 0 END), 0) AS approvedApplications
        FROM pass_applications`;

    const revenueQuery = `
        SELECT COALESCE(SUM(amount), 0) AS totalRevenue
        FROM payments
        WHERE payment_status = 'success'`;

    const applicationsQuery = `
        SELECT
            pa.id AS applicationId,
            u.full_name AS fullName,
            u.student_id AS applicantId,
            u.user_type AS userType,
            pt.pass_type_name AS passType,
            COALESCE(asd.organization_name, ed.organization_name) AS organizationName,
            COALESCE(asd.college_name, sd.college_name) AS collegeName,
            r.from_stop AS fromStop,
            r.to_stop AS toStop,
            r.distance_km AS distance,
            pp.plan_name AS planName,
            COALESCE(pa.plan_amount, pp.amount) AS planAmount,
            COALESCE(asd.designation, ed.designation) AS designation,
            pa.application_status AS status,
            pa.rejection_reason AS rejectionReason,
            pa.rejected_at AS rejectedAt,
            pa.resubmitted_from_application_id AS resubmittedFromApplicationId,
            pa.created_at AS createdAt,
            pay.transaction_id AS transactionId,
            pay.payment_status AS paymentStatus,
            pay.amount AS paidAmount,
            pay.amount AS amount
        FROM pass_applications pa
        JOIN users u ON u.id = pa.user_id
        JOIN pass_types pt ON pt.id = pa.pass_type_id
        LEFT JOIN routes r ON r.id = pa.route_id
        LEFT JOIN pass_plans pp ON pp.id = pa.plan_id
        LEFT JOIN student_details sd ON sd.user_id = pa.user_id
        LEFT JOIN employee_details ed ON ed.user_id = pa.user_id
        LEFT JOIN application_submission_details asd ON asd.application_id = pa.id
        LEFT JOIN payments pay ON pay.application_id = pa.id AND pay.payment_status = 'success'
        WHERE pa.application_status IN ('paid', 'approved', 'rejected', 'completed')
        ORDER BY pa.created_at DESC, pa.id DESC`;

    db.query(summaryQuery, (summaryError, summaryRows) => {
        if (summaryError) {
            return res.status(500).json({ success: false, message: "Could not load dashboard summary." });
        }

        db.query(revenueQuery, (revenueError, revenueRows) => {
            if (revenueError) {
                return res.status(500).json({ success: false, message: "Could not load dashboard revenue." });
            }

            db.query(applicationsQuery, (applicationsError, applications) => {
                if (applicationsError) {
                    return res.status(500).json({ success: false, message: "Could not load applications." });
                }

                res.json({
                    success: true,
                    summary: {
                        ...summaryRows[0],
                        totalRevenue: revenueRows[0].totalRevenue
                    },
                    applications
                });
            });
        });
    });
});

// Dedicated application feed for the Admin Applications screen.
// This is intentionally independent from dashboard summary/revenue queries so
// a problem in one dashboard metric cannot hide real applications from admins.
app.get("/api/admin/applications", (req, res) => {
    const applicationsQuery = `
        SELECT
            pa.id AS applicationId,
            COALESCE(asd.full_name, u.full_name) AS fullName,
            COALESCE(asd.id_number, sd.aadhaar_number, ed.employee_id, CONCAT('USR-', u.id)) AS applicantId,
            COALESCE(asd.user_type, u.user_type) AS userType,
            COALESCE(asd.mobile, u.mobile) AS mobile,
            COALESCE(asd.email, u.email) AS email,
            pt.pass_type_name AS passType,
            CASE
                WHEN pa.application_status = 'payment_pending' AND pay.payment_status = 'success' THEN 'paid'
                ELSE pa.application_status
            END AS status,
            pa.rejection_reason AS rejectionReason,
            pa.rejected_at AS rejectedAt,
            pa.resubmitted_from_application_id AS resubmittedFromApplicationId,
            pa.created_at AS createdAt,
            pa.updated_at AS updatedAt,
            r.from_stop AS fromStop,
            r.to_stop AS toStop,
            r.distance_km AS distance,
            pp.plan_name AS planName,
            COALESCE(pa.plan_amount, pp.amount) AS planAmount,
            pay.transaction_id AS transactionId,
            pay.payment_status AS paymentStatus,
            pay.amount AS paidAmount
        FROM pass_applications pa
        JOIN users u ON u.id = pa.user_id
        JOIN pass_types pt ON pt.id = pa.pass_type_id
        LEFT JOIN routes r ON r.id = pa.route_id
        LEFT JOIN pass_plans pp ON pp.id = pa.plan_id
        LEFT JOIN payments pay ON pay.application_id = pa.id AND pay.payment_status = 'success'
        LEFT JOIN application_submission_details asd ON asd.application_id = pa.id
        LEFT JOIN student_details sd ON sd.user_id = pa.user_id
        LEFT JOIN employee_details ed ON ed.user_id = pa.user_id
        WHERE pa.application_status IN ('paid', 'approved', 'rejected', 'completed')
           OR (pa.application_status = 'payment_pending' AND pay.payment_status = 'success')
        ORDER BY pa.created_at DESC, pa.id DESC`;

    db.query(applicationsQuery, (err, applications) => {
        if (err) {
            console.error("Admin applications query failed:", err.message);
            return res.status(500).json({ success: false, message: "Could not load applications." });
        }
        res.json({ success: true, applications });
    });
});

// DATABASE-DRIVEN ADMIN APPLICATION FLOW
// User route creation -> draft; details/documents/plan -> payment -> paid.
// Only the paid application is published to the admin queue. This prevents an
// unfinished application from appearing in Admin before the user submits it.
// The same database application record is then reviewed and approved/rejected.

// Full review record for one application. Admin screens must use this server
// record, not the applicant browser's localStorage, so applications are visible
// to every administrator after the user submits them.
app.get("/api/admin/applications/:id", (req, res) => {
    const applicationId = Number(req.params.id);
    if (!applicationId) return res.status(400).json({ success: false, message: "A valid application ID is required." });

    const applicationQuery = `
        SELECT
            pa.id AS applicationId,
            CASE
                WHEN pa.application_status = 'payment_pending' AND pay.payment_status = 'success' THEN 'paid'
                ELSE pa.application_status
            END AS status,
            pa.rejection_reason AS rejectionReason, pa.rejected_at AS rejectedAt, pa.resubmitted_from_application_id AS resubmittedFromApplicationId, pa.created_at AS createdAt, pa.updated_at AS updatedAt,
            u.id AS userId,
            COALESCE(asd.full_name, bp.holder_name, u.full_name) AS fullName,
            COALESCE(asd.id_number, sd.aadhaar_number, ed.employee_id, CONCAT('USR-', u.id)) AS applicantId,
            COALESCE(asd.mobile, u.mobile) AS mobile,
            COALESCE(asd.email, u.email) AS email,
            COALESCE(asd.user_type, u.user_type) AS userType,
            pt.pass_type_name AS passType,
            COALESCE(r.from_stop, bp.route_from) AS fromStop,
            COALESCE(r.to_stop, bp.route_to) AS toStop,
            COALESCE(r.distance_km, pa.route_distance_km_snapshot, bp.distance_km) AS distance,
            bt.bus_type_name AS busType, pp.plan_name AS planName, pp.validity_days AS validityDays, COALESCE(pa.plan_amount, pp.amount) AS planAmount,
            bp.pass_id AS passId, bp.valid_to AS validTo, bp.pass_status AS passStatus,
            pay.transaction_id AS transactionId, pay.payment_method AS paymentMethod, pay.payment_status AS paymentStatus,
            pay.amount AS paidAmount, pay.payment_date AS paymentDate,
            COALESCE(asd.date_of_birth, sd.date_of_birth, ed.date_of_birth) AS studentDob,
            COALESCE(asd.gender, sd.gender, ed.gender) AS studentGender,
            COALESCE(asd.id_number, sd.aadhaar_number, ed.employee_id) AS studentIdNumber,
            asd.student_category AS studentCategory,
            COALESCE(asd.class_course, CASE WHEN pt.pass_type_name = 'Student Pass' THEN bp.course_or_designation END, sd.class_course) AS classCourse,
            asd.academic_year AS academicYear,
            COALESCE(asd.college_name, CASE WHEN pt.pass_type_name = 'Student Pass' THEN bp.college_or_organization END, sd.college_name) AS collegeName,
            COALESCE(asd.father_name, sd.father_name) AS fatherName,
            COALESCE(asd.mother_name, sd.mother_name) AS motherName,
            COALESCE(asd.contact_number, sd.contact_number) AS contactNumber,
            COALESCE(asd.city, sd.city, ed.city) AS studentCity,
            COALESCE(asd.district, sd.district, ed.district) AS studentDistrict,
            COALESCE(asd.state, sd.state, ed.state) AS studentState,
            COALESCE(asd.pin_code, sd.pin_code, ed.pin_code) AS studentPinCode,
            COALESCE(asd.permanent_address, sd.permanent_address, ed.permanent_address) AS studentAddress,
            COALESCE(asd.date_of_birth, ed.date_of_birth, sd.date_of_birth) AS employeeDob,
            COALESCE(asd.gender, ed.gender, sd.gender) AS employeeGender,
            COALESCE(asd.employee_id, asd.id_number, ed.employee_id) AS employeeId,
            COALESCE(asd.organization_name, CASE WHEN pt.pass_type_name = 'Employee Pass' THEN bp.college_or_organization END, ed.organization_name) AS organizationName,
            COALESCE(asd.department, ed.department) AS department,
            COALESCE(asd.designation, CASE WHEN pt.pass_type_name = 'Employee Pass' THEN bp.course_or_designation END, ed.designation) AS designation,
            COALESCE(asd.city, ed.city, sd.city) AS employeeCity,
            COALESCE(asd.district, ed.district, sd.district) AS employeeDistrict,
            COALESCE(asd.state, ed.state, sd.state) AS employeeState,
            COALESCE(asd.pin_code, ed.pin_code, sd.pin_code) AS employeePinCode,
            COALESCE(asd.permanent_address, ed.permanent_address, sd.permanent_address) AS employeeAddress
        FROM pass_applications pa
        JOIN users u ON u.id = pa.user_id
        JOIN pass_types pt ON pt.id = pa.pass_type_id
        LEFT JOIN routes r ON r.id = pa.route_id
        LEFT JOIN bus_types bt ON bt.id = pa.bus_type_id
        LEFT JOIN pass_plans pp ON pp.id = pa.plan_id
        LEFT JOIN payments pay ON pay.application_id = pa.id AND pay.payment_status = 'success'
        LEFT JOIN student_details sd ON sd.user_id = pa.user_id
        LEFT JOIN employee_details ed ON ed.user_id = pa.user_id
        LEFT JOIN application_submission_details asd ON asd.application_id = pa.id
        LEFT JOIN bus_passes bp ON bp.application_id = pa.id
        WHERE pa.id = ?
          AND (pa.application_status IN ('paid', 'approved', 'rejected', 'completed')
               OR (pa.application_status = 'payment_pending' AND pay.payment_status = 'success'))
        ORDER BY pay.payment_date DESC`;

    db.query(applicationQuery, [applicationId], (applicationErr, rows) => {
        if (applicationErr) return res.status(500).json({ success: false, message: "Could not load application details." });
        if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found." });
        db.query(
            "SELECT id, document_type AS documentType, file_name AS fileName, preview_data AS previewData, document_status AS status, uploaded_at AS uploadedAt FROM documents WHERE application_id = ? ORDER BY id",
            [applicationId],
            (documentsErr, documents) => {
                if (documentsErr) return res.status(500).json({ success: false, message: "Could not load application documents." });
                res.json({ success: true, application: rows[0], documents });
            }
        );
    });
});

function parseVerificationValues(row) {
    const parse = value => {
        if (Array.isArray(value)) return value;
        if (typeof value !== "string") return [];
        try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; }
    };
    return { checks: parse(row?.checks_json), documents: parse(row?.documents_json), fields: parse(row?.fields_json) };
}

app.get("/api/admin/applications/:id/verification", (req, res) => {
    const applicationId = Number(req.params.id);
    if (!Number.isSafeInteger(applicationId) || applicationId < 1) return res.status(400).json({ success: false, message: "A valid application ID is required." });
    db.query("SELECT checks_json, documents_json, fields_json FROM application_verifications WHERE application_id = ? LIMIT 1", [applicationId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Could not load saved verification checks." });
        res.json({ success: true, verification: parseVerificationValues(rows[0]) });
    });
});

app.put("/api/admin/applications/:id/verification", (req, res) => {
    const applicationId = Number(req.params.id);
    const cleanList = value => Array.isArray(value) && value.length <= 200 && value.every(item => typeof item === "string" && item.trim() && item.trim().length <= 160)
        ? [...new Set(value.map(item => item.trim()))]
        : null;
    const checks = cleanList(req.body.checks);
    const documents = cleanList(req.body.documents);
    const fields = cleanList(req.body.fields);
    if (!Number.isSafeInteger(applicationId) || applicationId < 1 || !checks || !documents || !fields) {
        return res.status(400).json({ success: false, message: "Verification checks must be lists of valid item IDs." });
    }
    db.query("SELECT id FROM pass_applications WHERE id = ? LIMIT 1", [applicationId], (findErr, applications) => {
        if (findErr) return res.status(500).json({ success: false, message: "Could not verify the application." });
        if (!applications.length) return res.status(404).json({ success: false, message: "Application not found." });
        const values = [applicationId, JSON.stringify(checks), JSON.stringify(documents), JSON.stringify(fields)];
        db.query(`INSERT INTO application_verifications (application_id, checks_json, documents_json, fields_json)
                  VALUES (?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE checks_json = VALUES(checks_json), documents_json = VALUES(documents_json), fields_json = VALUES(fields_json)`,
            values, (saveErr) => {
                if (saveErr) return res.status(500).json({ success: false, message: "Could not save verification checks." });
                db.query("SELECT checks_json, documents_json, fields_json FROM application_verifications WHERE application_id = ? LIMIT 1", [applicationId], (readErr, rows) => {
                    if (readErr) return res.status(500).json({ success: false, message: "Could not verify saved checks." });
                    const saved = parseVerificationValues(rows[0]);
                    if (!rows[0] || JSON.stringify(saved) !== JSON.stringify({ checks, documents, fields })) {
                        return res.status(500).json({ success: false, message: "Saved verification checks could not be verified." });
                    }
                    res.json({ success: true, applicationId, verification: saved });
                });
            }
        );
    });
});

// Save Admin edits to the issued pass. User-side pass screens read these same
// database fields through /api/history, so edits are reflected across sessions.
app.put("/api/admin/passes/:applicationId", (req, res) => {
    const applicationId = Number(req.params.applicationId);
    const holderName = String(req.body.holderName || "").trim();
    const institution = String(req.body.institution || "").trim();
    const course = String(req.body.course || "").trim();
    const fromStop = String(req.body.fromStop || "").trim();
    const toStop = String(req.body.toStop || "").trim();
    const rawDistance = String(req.body.distance ?? "").trim();
    const validTo = String(req.body.validTo || "").trim();
    const requestedStatus = String(req.body.status || "ACTIVE").trim().toUpperCase();
    const passStatusMap = { ACTIVE: "active", EXPIRED: "expired", SUSPENDED: "cancelled", INACTIVE: "cancelled", CANCELLED: "cancelled" };
    const passStatus = passStatusMap[requestedStatus];
    const distanceMatch = rawDistance.match(/\d+(?:\.\d+)?/);
    const distanceKm = distanceMatch ? Number(distanceMatch[0]) : null;

    if (!Number.isSafeInteger(applicationId) || applicationId < 1 || !holderName || holderName.length > 100 || !institution || institution.length > 150 || !course || course.length > 100 || !fromStop || fromStop.length > 150 || !toStop || toStop.length > 150 || !validTo || !passStatus) {
        return res.status(400).json({ success: false, message: "Complete the pass details before saving." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validTo) || Number.isNaN(Date.parse(validTo)) || (distanceKm !== null && (!Number.isFinite(distanceKm) || distanceKm < 0))) {
        return res.status(400).json({ success: false, message: "Enter a valid expiry date and distance." });
    }

    db.query("SELECT bp.id, pa.application_status FROM bus_passes bp JOIN pass_applications pa ON pa.id = bp.application_id WHERE bp.application_id = ? LIMIT 1", [applicationId], (findErr, passes) => {
        if (findErr) return res.status(500).json({ success: false, message: "Could not load issued pass." });
        if (!passes.length) return res.status(404).json({ success: false, message: "Issued pass not found for this application." });
        if (!["approved", "completed"].includes(passes[0].application_status)) return res.status(409).json({ success: false, message: "This application is not eligible for pass edits." });
        db.query(
            `UPDATE bus_passes bp
             JOIN pass_applications pa ON pa.id = bp.application_id
             SET bp.holder_name = ?, bp.college_or_organization = ?, bp.course_or_designation = ?,
                 bp.route_from = ?, bp.route_to = ?, bp.distance_km = ?, bp.valid_to = ?, bp.pass_status = ?
             WHERE pa.id = ? AND pa.application_status IN ('approved', 'completed')`,
            [holderName, institution, course, fromStop, toStop, distanceKm, validTo, passStatus, applicationId],
            (updateErr) => {
                if (updateErr) return res.status(500).json({ success: false, message: "Could not save pass details." });
                db.query(
                    "SELECT holder_name, college_or_organization, course_or_designation, route_from, route_to, distance_km, DATE_FORMAT(valid_to, '%Y-%m-%d') AS valid_to, pass_status FROM bus_passes WHERE application_id = ? LIMIT 1",
                    [applicationId],
                    (readErr, rows) => {
                        if (readErr) return res.status(500).json({ success: false, message: "Could not verify saved pass details." });
                        const saved = rows[0];
                        if (!saved || saved.holder_name !== holderName || saved.college_or_organization !== institution || saved.course_or_designation !== course || saved.route_from !== fromStop || saved.route_to !== toStop || Number(saved.distance_km || 0) !== Number(distanceKm || 0) || saved.valid_to !== validTo || saved.pass_status !== passStatus) {
                            return res.status(500).json({ success: false, message: "Saved pass details could not be verified." });
                        }
                        res.json({ success: true, applicationId, passStatus: requestedStatus, validTo, distanceKm });
                    }
                );
            }
        );
    });
});

// Admin decision is the source of truth for the user-facing pass state.
app.post("/api/admin/applications/:id/status", (req, res) => {
    const applicationId = Number(req.params.id);
    const status = String(req.body.status || "").toLowerCase();
    const reason = String(req.body.reason || "").trim();
    if (!Number.isSafeInteger(applicationId) || applicationId < 1 || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid application decision." });
    }
    if (status === "rejected" && !reason) {
        return res.status(400).json({ success: false, message: "A rejection reason is required." });
    }

    const updateSql = status === "rejected"
        ? "UPDATE pass_applications SET application_status = 'rejected', rejection_reason = ?, rejected_at = NOW() WHERE id = ?"
        : "UPDATE pass_applications SET application_status = 'approved', rejection_reason = NULL, rejected_at = NULL WHERE id = ?";
    const values = status === "rejected" ? [reason, applicationId] : [applicationId];

    db.beginTransaction(transactionErr => {
        if (transactionErr) return res.status(500).json({ success: false, message: "Could not start admin decision save." });
        const rollback = (statusCode, message) => db.rollback(() => res.status(statusCode).json({ success: false, message }));
        db.query(updateSql, values, (err, result) => {
            if (err) return rollback(500, "Could not save admin decision.");
            const continueDecision = () => {
                if (status === "rejected") {
                    return db.query("UPDATE bus_passes SET pass_status = 'cancelled' WHERE application_id = ?", [applicationId], passErr => {
                        if (passErr) return rollback(500, "Could not update the issued pass after rejection.");
                        db.commit(commitErr => {
                            if (commitErr) return rollback(500, "Could not commit the admin decision.");
                            res.json({ success: true, status, rejectionReason: reason });
                        });
                    });
                }

                // Approval creates the durable issued-pass record. The user UI can then
                // load the same approved record after the browser/app is reopened.
                const issueQuery = `
            SELECT pa.id AS applicationId, pa.user_id AS userId, pa.pass_type_id AS passTypeId,
                   pa.plan_id AS planId, pa.route_id AS routeId, pa.bus_type_id AS busTypeId,
                   u.full_name AS holderName, pt.pass_type_name AS passType,
                   COALESCE(pp.plan_name, pt.pass_type_name) AS planName,
                   COALESCE(pp.validity_days, 30) AS validityDays,
                   r.from_stop AS routeFrom, r.to_stop AS routeTo, r.distance_km AS distanceKm,
                   COALESCE(pa.plan_amount, pp.amount) AS planAmount,
                   pay.id AS paymentId
            FROM pass_applications pa
            JOIN users u ON u.id = pa.user_id
            JOIN pass_types pt ON pt.id = pa.pass_type_id
            LEFT JOIN pass_plans pp ON pp.id = pa.plan_id
            LEFT JOIN routes r ON r.id = pa.route_id
            LEFT JOIN payments pay ON pay.application_id = pa.id AND pay.payment_status = 'success'
            WHERE pa.id = ?
            ORDER BY pay.payment_date DESC, pay.id DESC
            LIMIT 1`;
                db.query(issueQuery, [applicationId], (issueErr, rows) => {
                    if (issueErr) return rollback(500, "Could not prepare issued pass.");
                    if (!rows[0]) return rollback(404, "Application not found or applicant details are unavailable.");
                    const row = rows[0];
                    const validityDays = Math.max(1, Number(row.validityDays) || 30);
                    const passId = `BP${String(applicationId).padStart(8, "0")}`;
                    const insertSql = `
                INSERT INTO bus_passes
                    (application_id, payment_id, pass_id, holder_name, pass_type, college_or_organization, course_or_designation, route_from, route_to, distance_km, valid_from, valid_to, pass_status)
                SELECT ?, ?, ?, ?, ?,
                       CASE WHEN u.user_type = 'employee' THEN ed.organization_name ELSE sd.college_name END,
                       CASE WHEN u.user_type = 'employee' THEN ed.designation ELSE sd.class_course END,
                       ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'active'
                FROM users u
                LEFT JOIN student_details sd ON sd.user_id = u.id
                LEFT JOIN employee_details ed ON ed.user_id = u.id
                WHERE u.id = ?
                  AND NOT EXISTS (SELECT 1 FROM bus_passes WHERE application_id = ?)`;
            const insertValues = [applicationId, row.paymentId || null, passId, row.holderName, row.passType, row.routeFrom || "", row.routeTo || "", Number(row.distanceKm || 0), validityDays - 1, row.userId, applicationId];
                    db.query(insertSql, insertValues, passErr => {
                        if (passErr) return rollback(500, "Could not issue bus pass record.");
                        db.query("UPDATE bus_passes SET pass_status = 'active' WHERE application_id = ? AND pass_status = 'cancelled'", [applicationId], reactivateErr => {
                            if (reactivateErr) return rollback(500, "Could not activate the issued pass.");
                            db.query("SELECT id FROM bus_passes WHERE application_id = ? LIMIT 1", [applicationId], (verifyErr, passes) => {
                                if (verifyErr) return rollback(500, "Could not verify the issued pass.");
                                if (!passes.length) return rollback(500, "The application was approved but no pass record was saved.");
                                db.commit(commitErr => {
                                    if (commitErr) return rollback(500, "Could not commit the admin decision.");
                                    res.json({ success: true, status, passIssued: true });
                                });
                            });
                        });
                    });
                });
            };

            if (result.affectedRows) return continueDecision();
            db.query("SELECT id FROM pass_applications WHERE id = ? LIMIT 1", [applicationId], (findErr, rows) => {
                if (findErr) return rollback(500, "Could not verify the application.");
                if (!rows.length) return rollback(404, "Application not found.");
                continueDecision();
            });
        });
    });
});

// Start a clean re-application from a rejected record. The old rejected
// application remains untouched for history/audit; the new application is a
// separate draft that the applicant completes again.
app.post("/api/applications/:id/reapply", (req, res) => {
    const applicationId = Number(req.params.id);
    const userId = Number(req.body.userId);
    if (!applicationId || !userId) return res.status(400).json({ success: false, message: "Re-application details are required." });

    const sourceQuery = `
        SELECT pass_type_id, route_id, bus_type_id
        FROM pass_applications
        WHERE id = ? AND user_id = ? AND application_status = 'rejected'
        LIMIT 1`;
    db.query(sourceQuery, [applicationId, userId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Could not start re-application." });
        if (!rows[0]) return res.status(404).json({ success: false, message: "Rejected application not found." });
        const source = rows[0];
        db.query(
            "INSERT INTO pass_applications (user_id, pass_type_id, route_id, bus_type_id, application_status, resubmitted_from_application_id) VALUES (?, ?, NULL, NULL, 'draft', ?)",
            [userId, source.pass_type_id, applicationId],
            (insertErr, result) => {
                if (insertErr) return res.status(500).json({ success: false, message: "Could not create a fresh application." });
                res.json({ success: true, applicationId: result.insertId, passTypeId: source.pass_type_id });
            }
        );
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(FRONTEND_ROOT, "login.html"));
});

app.get("/api/health", (req, res) => {
    db.query("SELECT 1 AS ok", (err) => {
        if (err) {
            return res.status(503).json({ success: false, server: true, database: false, message: "MySQL connection is not available." });
        }
        res.json({ success: true, server: true, database: true, message: "BusPass server and MySQL are running." });
    });
});


// ==========================================
// START SERVER
// ==========================================

const SERVER_PORT = Number(process.env.PORT || 5000);
app.listen(SERVER_PORT, () => {

    console.log("");
    console.log("====================================");
    console.log("🚍 BusPass Server Started");
    console.log("====================================");
    console.log(`Server: http://localhost:${SERVER_PORT}`);
    console.log("====================================");

});


// ==========================================
// FORGOT PASSWORD APIs
// ==========================================

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post("/forgot-password/request", (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!validEmail(email)) return res.status(400).json({ success: false, message: "Please enter a valid email address." });

    db.query("SELECT id, full_name FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [email], async (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error." });
        if (!result[0]) return res.status(404).json({ success: false, message: "No account is registered with this email." });

        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        db.query("INSERT INTO password_resets (user_id, reset_token, expires_at, used) VALUES (?, ?, ?, FALSE)", [result[0].id, otpHash, expiresAt], async insertErr => {
            if (insertErr) return res.status(500).json({ success: false, message: "Could not create OTP request." });
            try {
                await mailer.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: email,
                    subject: "BusPass Password Reset OTP",
                    text: `Hello ${result[0].full_name}, your BusPass OTP is ${otp}. It expires in 10 minutes.`
                });
                res.json({ success: true, message: "OTP sent to your registered email." });
            } catch (mailError) {
                console.error("OTP email error:", mailError.message);
                res.status(500).json({ success: false, message: "Could not send OTP email. Check SMTP settings." });
            }
        });
    });
});

app.post("/forgot-password/verify", (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    db.query("SELECT pr.id, pr.reset_token, pr.expires_at FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE LOWER(u.email) = LOWER(?) AND pr.used = FALSE ORDER BY pr.id DESC LIMIT 1", [email], async (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error." });
        const reset = result[0];
        if (!reset || new Date(reset.expires_at) < new Date() || !(await bcrypt.compare(otp, reset.reset_token))) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = await bcrypt.hash(resetToken, 10);
        db.query("UPDATE password_resets SET reset_token = ? WHERE id = ?", [tokenHash, reset.id], updateErr => {
            if (updateErr) return res.status(500).json({ success: false, message: "Could not verify OTP." });
            res.json({ success: true, resetToken });
        });
    });
});

app.post("/forgot-password/reset", (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const resetToken = String(req.body.resetToken || "");
    const password = String(req.body.password || "");
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return res.status(400).json({ success: false, message: "Password must be 8+ characters with letters and numbers." });

    db.query("SELECT pr.id, pr.reset_token, pr.expires_at, u.id AS user_id FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE LOWER(u.email) = LOWER(?) AND pr.used = FALSE ORDER BY pr.id DESC LIMIT 1", [email], async (err, result) => {
        const reset = result && result[0];
        if (err || !reset || new Date(reset.expires_at) < new Date() || !(await bcrypt.compare(resetToken, reset.reset_token))) return res.status(400).json({ success: false, message: "Reset session is invalid or expired." });
        const passwordHash = await bcrypt.hash(password, 12);
        db.query("UPDATE users SET password = ? WHERE id = ?", [passwordHash, reset.user_id], updateErr => {
            if (updateErr) return res.status(500).json({ success: false, message: "Could not update password." });
            db.query("UPDATE password_resets SET used = TRUE WHERE id = ?", [reset.id]);
            res.json({ success: true, message: "Password Reset Successfully" });
        });
    });
});

app.post("/api/payments", (req, res) => {
    const { applicationId, userId, amount, paymentMethod, planName } = req.body;
    const methods = { UPI: "upi", "Credit / Debit Card": "card", "Net Banking": "net_banking" };
    if (!applicationId || !userId || !amount || !methods[paymentMethod]) return res.status(400).json({ success: false, message: "Payment details are required." });
    findOwnedApplication(applicationId, userId, (ownerErr, application) => {
        if (ownerErr) return res.status(500).json({ success: false, message: "Could not check application." });
        if (!application) return res.status(404).json({ success: false, message: "Application not found." });
        db.query("SELECT id, plan_name, amount FROM pass_plans WHERE id = ? LIMIT 1", [application.plan_id], (planErr, plans) => {
            if (planErr || !plans.length) return res.status(400).json({ success: false, message: "Select a valid plan before payment." });
            const plan = plans[0];
            const effectiveAmount = Number(application.plan_amount) > 0 ? Number(application.plan_amount) : Number(plan.amount || 0);
            if (Number(amount) !== effectiveAmount || (planName && plan.plan_name !== planName)) return res.status(400).json({ success: false, message: "Payment amount does not match the selected plan." });
            db.query("SELECT id, transaction_id FROM payments WHERE application_id = ? AND payment_status = 'success' LIMIT 1", [application.id], (existingErr, existing) => {
                if (existingErr) return res.status(500).json({ success: false, message: "Could not check payment." });
                if (existing.length) return res.json({ success: true, transactionId: existing[0].transaction_id, paymentId: existing[0].id, alreadyPaid: true });
                const transactionId = `TXN${Date.now()}${crypto.randomInt(1000, 9999)}`;
                db.query("INSERT INTO payments (application_id, transaction_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, 'success')", [application.id, transactionId, effectiveAmount, methods[paymentMethod]], (err, result) => {
                    if (err) return res.status(500).json({ success: false, message: "Could not save payment." });
                    db.query("UPDATE pass_applications SET application_status = 'paid' WHERE id = ? AND user_id = ?", [application.id, userId], updateErr => {
                        if (updateErr) return res.status(500).json({ success: false, message: "Could not complete payment." });
                        res.json({ success: true, transactionId, paymentId: result.insertId });
                    });
                });
            });
        });
    });
});

// ==========================================
// RENEW PASS API
// Creates a NEW draft application by copying
// pass type, route and bus type from the
// user's most recent PAID application.
// ==========================================

app.post("/api/renewals", (req, res) => {
    const { userId, previousApplicationId } = req.body;
    if (!userId || !previousApplicationId) return res.status(400).json({ success: false, message: "Renewal details are required." });

    const previousPassQuery = `
        SELECT pa.pass_type_id, pa.route_id, pa.bus_type_id
        FROM pass_applications pa
        JOIN payments pay ON pay.application_id = pa.id AND pay.payment_status = 'success'
        WHERE pa.id = ? AND pa.user_id = ?
        ORDER BY pay.payment_date DESC, pa.id DESC
        LIMIT 1`;

    db.query(previousPassQuery, [previousApplicationId, userId], (passErr, passResult) => {
        if (passErr) return res.status(500).json({ success: false, message: "Could not load previous pass." });
        if (!passResult[0]) return res.status(404).json({ success: false, message: "No paid pass found to renew." });

        const previousPass = passResult[0];
        db.query(
            "INSERT INTO pass_applications (user_id, pass_type_id, route_id, bus_type_id, application_status) VALUES (?, ?, ?, ?, 'draft')",
            [userId, previousPass.pass_type_id, previousPass.route_id, previousPass.bus_type_id],
            (insertErr, insertResult) => {
                if (insertErr) return res.status(500).json({ success: false, message: "Could not start renewal." });
                const newApplicationId = insertResult.insertId;
                // A renewal carries forward the applicant details from the
                // previous application instead of depending on the current
                // editable profile record.
                db.query(
                    `INSERT INTO application_submission_details
                        (application_id, user_id, user_type, full_name, mobile, email, date_of_birth, gender,
                         id_number, organization_name, college_name, father_name, mother_name, contact_number,
                         employee_id, department, designation, city, district, state, pin_code, permanent_address)
                     SELECT ?, user_id, user_type, full_name, mobile, email, date_of_birth, gender, id_number,
                            organization_name, college_name, father_name, mother_name, contact_number, employee_id,
                            department, designation, city, district, state, pin_code, permanent_address
                     FROM application_submission_details
                     WHERE application_id = ?
                     LIMIT 1`,
                    [newApplicationId, previousApplicationId],
                    (snapshotErr) => {
                        if (snapshotErr) console.error("Could not copy renewal application details:", snapshotErr.message);
                        res.json({ success: true, applicationId: newApplicationId });
                    }
                );
            }
        );
    });
});
