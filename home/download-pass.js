// ==========================================
// DOWNLOAD PASS - RENDER + PRINT / SAVE PDF
// ==========================================

const API_BASE = "http://localhost:5000";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });

let currentUser = null;
let currentPass = null;
let holderDetails = null;

document.addEventListener("DOMContentLoaded", loadDownloadPass);


// ==========================================
// LOAD PASS DATA
// ==========================================

async function loadDownloadPass() {

    currentUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");

    if (!currentUser || !currentUser.id) {

        showEmptyState(
            "Login required",
            "Please login to download your bus pass.",
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
            "download-pass.html"
        );

        return;
    }

    // Payment alone must never issue a pass. The database approval is the
    // single source of truth, so a browser/localStorage value cannot bypass it.
    currentPass = history.find(app =>
        app.application_status === "approved" &&
        app.payment_status === "success"
    ) || null;

    if (!currentPass) {

        showEmptyState(
            "Awaiting Transport Office approval",
            "Your payment is received. The pass can be downloaded only after an administrator approves your application.",
            "Track Application",
            "application-tracking.html"
        );

        return;
    }

    // Use only the immutable details submitted with this approved application.
    holderDetails = null;
    renderPass();
}


// ==========================================
// VALIDITY HELPER
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

// ==========================================
// RENDER PASS CARD (same layout as My Pass)
// ==========================================

function getHolderDetails() {

    const isEmployee = String(currentPass.pass_type_name || "").toLowerCase().includes("employee");

    const details = {
        full_name: currentPass.submitted_full_name,
        organization_name: currentPass.submitted_organization_name,
        college_name: currentPass.submitted_college_name,
        designation: currentPass.submitted_designation,
        department: currentPass.submitted_department,
        father_name: currentPass.submitted_father_name,
        student_category: currentPass.submitted_student_category
    };

    return {
        name: details.full_name || "--",
        org: isEmployee
            ? (details.organization_name || details.organization || "--")
            : (details.college_name || details.collegeName || details.schoolName || "--"),
        detail: isEmployee
            ? (details.designation || details.department || "--")
            : (currentPass.submitted_class_course || "--"),
        orgLabel: isEmployee ? "Company Name" : "School / College Name",
        detailLabel: isEmployee ? "Designation" : "Course",
        category: isEmployee ? "Employee" : "Student"
    };
}


function renderPass() {

    const validUntil = getValidUntil(currentPass);
    const holder = getHolderDetails();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const storedPassStatus = String(currentPass.pass_status || "active").toLowerCase();
    const isSuspended = ["cancelled", "inactive", "suspended"].includes(storedPassStatus);
    const isExpired = storedPassStatus === "expired" || !Number.isFinite(validUntil.getTime()) || validUntil < today;

    document.getElementById("passTypeTitle").textContent =
        `${currentPass.pass_type_name.replace(" Pass", "").toUpperCase()} BUS PASS`;

    const badge = document.getElementById("passStatus");

    badge.className = "pass-status" + ((isExpired || isSuspended) ? " expired" : "");
    badge.innerHTML = isSuspended
        ? `<i class="fa-solid fa-circle-xmark"></i> INACTIVE`
        : isExpired
            ? `<i class="fa-solid fa-circle-xmark"></i> EXPIRED`
            : `<i class="fa-solid fa-circle-check"></i> ACTIVE`;

    document.getElementById("passNumber").textContent =
        currentPass.pass_id || currentPass.transaction_id ||
        `BP${String(currentPass.application_id).padStart(8, "0")}`;

    document.getElementById("holderName").textContent = holder.name;

    document.getElementById("orgLabel").textContent = holder.orgLabel;
    document.getElementById("orgName").textContent = holder.org;

    document.getElementById("detailLabel").textContent = holder.detailLabel;
    document.getElementById("detailValue").textContent = holder.detail;
    document.getElementById("categoryValue").textContent = holder.category;
    const isEmployee = String(currentPass.pass_type_name || "").toLowerCase().includes("employee");
    document.getElementById("passIdLabel").textContent = isEmployee ? "Employee ID" : "Student ID";
    document.getElementById("passIdValue").textContent = isEmployee
        ? (currentPass.submitted_employee_id || currentPass.submitted_id_number || "--")
        : (currentPass.submitted_id_number || "--");
    const distanceValue = document.getElementById("distanceValue");
    if (distanceValue) distanceValue.textContent = currentPass.distance_km !== null && currentPass.distance_km !== undefined ? `${currentPass.distance_km} KM` : "--";

    document.getElementById("routeFrom").textContent =
        currentPass.from_stop || "--";

    document.getElementById("routeTo").textContent =
        currentPass.to_stop || "--";

    const validFrom = parsePassDate(currentPass.valid_from || currentPass.payment_date || currentPass.created_at);
    document.getElementById("validFrom").textContent = validFrom ? dateFormat.format(validFrom) : "--";
    document.getElementById("validTill").textContent = Number.isNaN(validUntil.getTime()) ? "--" : dateFormat.format(validUntil);

    document.getElementById("barcodeNumber").textContent =
        document.getElementById("passNumber").textContent;

    // Holder photo — show ONLY the photo the user
    // uploaded during the documents step.
    // The default bus image is never shown here.

    const savedPhoto = currentPass?.passport_photo || "";

    const photoImg =
        document.getElementById("holderPhoto");

    const photoFallback =
        document.getElementById("photoFallback");

    if (savedPhoto) {

        photoImg.src = savedPhoto;

        photoImg.style.display = "block";

        photoFallback.style.display = "none";

    } else {

        photoImg.style.display = "none";

        photoFallback.style.display = "grid";
    }
}


// ==========================================
// DOWNLOAD AS A4 PDF
// ==========================================

async function downloadPass() {

    if (!currentPass) {

        showPopup(
            "error",
            "No Pass Found",
            "No pass available to download."
        );

        return;
    }

    if (!window.html2canvas || !window.jspdf?.jsPDF) {
        showPopup("error", "Download unavailable", "Please check your internet connection and try again.");
        return;
    }

    const button = document.querySelector(".download-button");
    const originalLabel = button ? button.innerHTML : "";

    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparing PDF...';
        }

        await document.fonts.ready;
        await Promise.all([...document.images].map(image => image.complete
            ? Promise.resolve()
            : new Promise(resolve => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
            })));

        const passCard = document.querySelector(".govt-pass");
        const canvas = await window.html2canvas(passCard, {
            backgroundColor: "#ffffff",
            scale: 2,
            useCORS: true,
            logging: false
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;
        const imageRatio = canvas.width / canvas.height;
        let imageWidth = maxWidth;
        let imageHeight = imageWidth / imageRatio;

        if (imageHeight > maxHeight) {
            imageHeight = maxHeight;
            imageWidth = imageHeight * imageRatio;
        }

        const x = (pageWidth - imageWidth) / 2;
        const y = (pageHeight - imageHeight) / 2;
        const passNumber = currentPass.transaction_id || `BP${String(currentPass.application_id).padStart(8, "0")}`;

        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", x, y, imageWidth, imageHeight);
        pdf.save(`${passNumber}-bus-pass.pdf`);
    } catch (error) {
        console.error("Could not create pass PDF:", error);
        showPopup("error", "Download failed", "Could not create the PDF. Please try again.");
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = originalLabel;
        }
    }
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
    window.location.href = "my-pass.html";
}

function openMenu() {
    console.log("Menu clicked");
}
