// ==========================================
// MY PASS - LOAD AND RENDER USER'S PASS
// ==========================================

const API_BASE = "http://localhost:5000";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

let currentUser = null;
let currentPass = null;
let holderDetails = null;

document.addEventListener("DOMContentLoaded", loadMyPass);


// ==========================================
// LOAD PASS DATA
// ==========================================

async function loadMyPass() {

    currentUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");

    if (!currentUser || !currentUser.id) {

        showEmptyState(
            "Login required",
            "Please login to view your bus pass.",
            "Login Now",
            "login.html"
        );

        return;
    }

    let history = [];

    try {

        const response = await fetch(
            `${API_BASE}/api/history?userId=${encodeURIComponent(currentUser.id)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not load your pass.");
        }

        history = result.history || [];

    } catch (error) {

        showEmptyState(
            "Something went wrong",
            "Could not load your pass. Please ensure the backend server is running.",
            "Try Again",
            "my-pass.html"
        );

        return;
    }

    // A pass is issued only after an admin approves the paid application.

    currentPass = history.find(app =>
        app.application_status === "approved" && app.payment_status === "success"
    ) || null;

    if (!currentPass) {

        showEmptyState(
            "Awaiting Transport Office approval",
            "Your pass will appear here only after an administrator reviews and approves your application.",
            "Track Application",
            "application-tracking.html"
        );

        return;
    }

    // The history response contains the immutable details submitted for this
    // exact application. Do not replace them with the user's current profile.
    holderDetails = null;
    renderPass();
}


// ==========================================
// STATUS HELPERS
// ==========================================

function parsePassDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = match ? new Date(`${match[1]}T00:00:00`) : new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getValidUntil(application) {
    const issuedExpiry = parsePassDate(application.valid_to);
    if (issuedExpiry) return issuedExpiry;
    const start = parsePassDate(application.valid_from || application.payment_date || application.created_at);
    if (!start) return new Date(NaN);
    start.setDate(start.getDate() + (Number(application.validity_days) || 30) - 1);
    return start;
}

function getStatus(application, validUntil) {
    const storedStatus = String(application.pass_status || "active").toLowerCase();
    if (["cancelled", "inactive", "suspended"].includes(storedStatus)) {
        return { label: "INACTIVE", css: "expired", icon: "fa-circle-xmark", title: "Your pass is inactive", text: "The Transport Office has deactivated this pass. Contact the office for details." };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((validUntil - today) / 86400000);
    if (storedStatus === "expired" || !Number.isFinite(daysLeft) || daysLeft < 0) {
        return { label: "EXPIRED", css: "expired", icon: "fa-circle-xmark", title: "Your pass has expired", text: "Renew now to continue travelling." };
    }
    if (daysLeft <= 15) {
        return { label: "ACTIVE", css: "expiring", icon: "fa-clock", title: `Expiring in ${daysLeft} day(s)`, text: "Renew soon to avoid interruption." };
    }
    return { label: "ACTIVE", css: "", icon: "fa-circle-check", title: "Your pass is active", text: "Travel safe and follow the rules." };
}

// ==========================================
// RENDER PASS CARD
// ==========================================

function getHolderDetails() {
    const isEmployee = String(currentPass.pass_type_name || "").toLowerCase().includes("employee");
    const details = {
        full_name: currentPass.submitted_full_name,
        organization_name: currentPass.submitted_organization_name,
        college_name: currentPass.submitted_college_name,
        designation: currentPass.submitted_designation,
        father_name: currentPass.submitted_father_name,
        student_category: currentPass.submitted_student_category,
        employee_id: currentPass.submitted_employee_id,
        department: currentPass.submitted_department,
        id_number: currentPass.submitted_id_number
    };

    return {
        name: details.full_name || "--",
        org: isEmployee
            ? (details.organization_name || details.organization || "--")
            : (details.college_name || details.collegeName || details.schoolName || "--"),
        detail: isEmployee
            ? (details.designation || "--")
            : (currentPass.submitted_class_course || "--"),
        orgLabel: isEmployee ? "Company Name" : "School / College Name",
        detailLabel: isEmployee ? "Designation" : "Course / Class",
        category: isEmployee ? "Employee" : "Student"
    };
}


function renderPass() {

    const validUntil = getValidUntil(currentPass);
    const status = getStatus(currentPass, validUntil);
    const holder = getHolderDetails();

    // Title strip

    document.getElementById("passTypeTitle").textContent =
        `${currentPass.pass_type_name.replace(" Pass", "").toUpperCase()} BUS PASS`;

    const badge = document.getElementById("passStatus");

    badge.className =
        "pass-status" + (status.css === "expired" ? " expired" : "");

    badge.innerHTML =
        `<i class="fa-solid ${status.icon}"></i> ${status.label}`;

    // Holder fields

    document.getElementById("passNumber").textContent =
        currentPass.pass_id || currentPass.transaction_id ||
        `BP${String(currentPass.application_id).padStart(8, "0")}`;

    document.getElementById("holderName").textContent = holder.name;

    document.getElementById("orgLabel").textContent = holder.orgLabel;
    document.getElementById("orgName").textContent = holder.org;

    document.getElementById("detailLabel").textContent = holder.detailLabel;
    document.getElementById("detailValue").textContent = holder.detail;
    document.getElementById("categoryValue").textContent = holder.category;

    const extraOne = document.getElementById("extraLabelOne");
    const extraValueOne = document.getElementById("extraValueOne");
    const extraTwo = document.getElementById("extraLabelTwo");
    const extraValueTwo = document.getElementById("extraValueTwo");

    const extraFieldTwo = document.getElementById("extraFieldTwo");

    if (String(currentPass.pass_type_name || "").toLowerCase().includes("employee")) {
        extraOne.textContent = "Employee ID";
        extraValueOne.textContent = currentPass.submitted_employee_id || "--";
        extraTwo.textContent = "Department";
        extraValueTwo.textContent = currentPass.submitted_department || "--";
        extraFieldTwo.style.display = "block";
        document.getElementById("passExtraRow").style.gridTemplateColumns = "1fr 1fr";
    } else {
        // Student pass already shows School / College in the main Institution field.
        // Keep the Student ID as the second student-specific pass detail.
        extraOne.textContent = "Student ID";
        extraValueOne.textContent = currentPass.submitted_id_number || "--";
        extraFieldTwo.style.display = "none";
        document.getElementById("passExtraRow").style.gridTemplateColumns = "1fr";
    }
    const distanceValue = document.getElementById("distanceValue");
    if (distanceValue) distanceValue.textContent = currentPass.distance_km !== null && currentPass.distance_km !== undefined ? `${currentPass.distance_km} KM` : "--";

    // Route + validity

    document.getElementById("routeFrom").textContent =
        currentPass.from_stop || "--";

    document.getElementById("routeTo").textContent =
        currentPass.to_stop || "--";

    const validFrom = parsePassDate(currentPass.valid_from || currentPass.payment_date || currentPass.created_at);
    document.getElementById("validFrom").textContent = validFrom ? dateFormat.format(validFrom) : "--";
    document.getElementById("validTill").textContent = Number.isNaN(validUntil.getTime()) ? "--" : dateFormat.format(validUntil);

    document.getElementById("barcodeNumber").textContent =
        document.getElementById("passNumber").textContent;

    // Holder photo (uploaded during document step)

    const savedPhoto = currentPass?.passport_photo || "";
    const holderPhoto = document.getElementById("holderPhoto");
    const passBody = document.querySelector(".pass-body");
    const holderPhotoFigure = holderPhoto?.closest(".holder-photo");
    if (holderPhoto) {
        if (savedPhoto) {
            holderPhoto.src = savedPhoto;
            holderPhoto.style.display = "block";
            if (holderPhotoFigure) holderPhotoFigure.style.display = "grid";
        } else {
            holderPhoto.removeAttribute("src");
            holderPhoto.style.display = "none";
            if (holderPhotoFigure) holderPhotoFigure.style.display = "none";
        }
    }
    if (passBody) passBody.classList.toggle("no-photo", !savedPhoto);

    // Status strip

    document.getElementById("statusStrip").className =
        "status-strip" + (status.css ? ` ${status.css}` : "");

    document.getElementById("statusIcon").className =
        `fa-solid ${status.icon}`;

    document.getElementById("statusTitle").textContent = status.title;

    document.getElementById("statusText").textContent = status.text;
}


// ==========================================
// EMPTY STATE
// ==========================================

let emptyActionUrl = "pass-type.html";

function showEmptyState(title, message, buttonText, actionUrl) {

    emptyActionUrl = actionUrl;

    document.getElementById("passContent").style.display = "none";

    document.getElementById("emptyState").style.display = "block";

    document.getElementById("emptyTitle").textContent = title;

    document.getElementById("emptyMessage").textContent = message;

    document.getElementById("emptyActionBtn").textContent = buttonText;
}

function handleEmptyAction() {
    window.location.href = emptyActionUrl;
}


// ==========================================
// NAVIGATION
// ==========================================

function goBack() {
    window.location.href = "profile.html";
}

function goDownload() {
    window.location.href = "download-pass.html";
}

function goRenew() {
    window.location.href = "renew-pass.html";
}

function openMenu() {
    console.log("Menu clicked");
}
