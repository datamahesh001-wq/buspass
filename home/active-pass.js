// ========================================
// ACTIVE PASS
// ========================================

const API_BASE = "http://localhost:5000";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

document.addEventListener("DOMContentLoaded", loadActivePass);


// ========================================
// LOAD ACTIVE PASS FROM DATABASE
// ========================================

async function loadActivePass() {

    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");

    if (!user || !user.id) {
        setNoPassState("Login required", "Please login to view your active pass.");
        return;
    }

    let activePass = null;

    try {

        const response = await fetch(
            `${API_BASE}/api/history?userId=${encodeURIComponent(user.id)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not load your pass.");
        }

        const history = result.history || [];

        // Only an administrator-approved application is an active pass.

        activePass = history.find(app =>
            app.application_status === "approved" &&
            app.payment_status === "success"
        ) || null;

    } catch (error) {

        console.log(error);

        setNoPassState("Something went wrong", "Could not load your pass. Please ensure the backend server is running.");

        return;

    }

    if (!activePass) {
        setNoPassState("Approval pending", "Your pass will be available after Transport Office approval.");
        return;
    }

    renderActivePass(user, activePass);

}


// Fill the pass card with database values
async function renderActivePass(user, activePass) {

    const isEmployee = (activePass.pass_type_name || "").toLowerCase().includes("employee");

    // Pass number generated from the application id

    const passNumber = activePass.pass_id || "BP" + String(activePass.application_id || 0).padStart(8, "0");

    setText("passNumber", passNumber);
    setText("barcodeNumber", passNumber);

    const heading = document.getElementById("passTitleHeading");
    heading.innerHTML = `<i class="fa-solid fa-id-card"></i> ${(activePass.pass_type_name || "BUS PASS").toUpperCase()}`;

        setText("holderName", activePass.submitted_full_name);

    setText(
        "institutionName",
            isEmployee ? activePass.submitted_organization_name : activePass.submitted_college_name
    );
    setText("institutionLabel", isEmployee ? "Company Name" : "School / College Name");

    // Left small field shows the booked bus type

    setText("courseLabel", isEmployee ? "Designation" : "Class / Course");
    setText("courseField", isEmployee ? activePass.submitted_designation : activePass.submitted_class_course);
    setText("categoryField", isEmployee ? "Employee" : "Student");
    setText("passIdLabel", isEmployee ? "Employee ID" : "Student ID");
    setText("passIdField", isEmployee ? activePass.submitted_employee_id || activePass.submitted_id_number : activePass.submitted_id_number);
    setText("distanceField", activePass.distance_km !== null && activePass.distance_km !== undefined ? `${activePass.distance_km} KM` : null);

    // Travel route

    setText("fromStop", activePass.from_stop);
    setText("toStop", activePass.to_stop);

    // Admin-issued dates and state override fallback values from the application.
    const fromDate = parsePassDate(activePass.valid_from || activePass.payment_date || activePass.created_at);
    const toDate = parsePassDate(activePass.valid_to) || (fromDate && activePass.validity_days
        ? new Date(fromDate.getTime() + (Number(activePass.validity_days) - 1) * 86400000)
        : null);
    setText("validFromDate", fromDate ? dateFormat.format(fromDate) : null);
    setText("validUptoDate", toDate ? dateFormat.format(toDate) : null);

    const storedStatus = String(activePass.pass_status || "active").toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isSuspended = ["cancelled", "inactive", "suspended"].includes(storedStatus);
    const isExpired = storedStatus === "expired" || !toDate || toDate < today;
    const displayedStatus = isSuspended ? "INACTIVE" : isExpired ? "EXPIRED" : "ACTIVE";
    const badge = document.getElementById("passStatusBadge");
    if (badge) {
        badge.className = "pass-status" + ((isSuspended || isExpired) ? " inactive-status" : "");
        badge.innerHTML = `<i class="fa-solid ${displayedStatus === "ACTIVE" ? "fa-circle-check" : "fa-circle-xmark"}"></i> ${displayedStatus}`;
    }
    const statusStrip = document.getElementById("statusStrip");
    const statusIcon = statusStrip?.querySelector("i");
    if (statusStrip) statusStrip.classList.toggle("expired", displayedStatus !== "ACTIVE");
    if (statusIcon) statusIcon.className = `fa-solid ${displayedStatus === "ACTIVE" ? "fa-circle-check" : "fa-circle-xmark"}`;
    setText("statusStripTitle", displayedStatus === "ACTIVE" ? "Your pass is active" : displayedStatus === "EXPIRED" ? "Your pass has expired" : "Your pass is inactive");
    setText("statusStripText", displayedStatus === "ACTIVE" ? "Travel safe and follow the rules." : displayedStatus === "EXPIRED" ? "Renew your pass to continue travelling." : "The Transport Office has deactivated this pass.");

    const photo = document.getElementById("holderPhoto");
    if (photo) {
        if (activePass.passport_photo) {
            photo.src = activePass.passport_photo;
            photo.style.display = "block";
        } else {
            photo.removeAttribute("src");
            photo.style.display = "none";
        }
    }
}


function parsePassDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = match ? new Date(`${match[1]}T00:00:00`) : new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
}

// Safe helper - sets text only when a value exists
function setText(id, value) {

    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = (value === null || value === undefined || value === "")
        ? "--"
        : value;

}


// Show warning state when no pass is available
function setNoPassState(title, message) {

    setText("statusStripTitle", title);
    setText("statusStripText", message);

    [
        "passNumber", "holderName", "institutionName",
        "courseField", "categoryField", "fromStop",
        "toStop", "validFromDate", "validUptoDate", "distanceField"
    ].forEach(id => setText(id, null));

    const downloadButton = document.querySelector(".download-button");

    if (downloadButton) {
        downloadButton.disabled = true;
        downloadButton.style.opacity = ".55";
    }

}


// ========================================
// BACK BUTTON
// ========================================

function goBack() {

    if (window.history.length > 1) {

        window.history.back();

    } else {

        window.location.href = "dashboard.html";

    }

}


// ========================================
// MENU
// ========================================

function openMenu() {

    console.log("Menu clicked");

}


// ========================================
// DOWNLOAD PASS
// ========================================

function downloadPass() {

    window.location.href = "download-pass.html";

}


// ========================================
// HOME
// ========================================

function goHome() {

    window.location.href = "dashboard.html";

}


// ========================================
// HISTORY
// ========================================

function goHistory() {

    window.location.href = "history.html";

}


// ========================================
// PROFILE
// ========================================

function goProfile() {

    window.location.href = "profile.html";

}
