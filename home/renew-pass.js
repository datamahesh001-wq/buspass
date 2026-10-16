// ==========================================
// RENEW PASS - MAIN LOGIC
// ==========================================

const API_BASE = "http://localhost:5000";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const moneyFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

let currentUser = null;
let currentPass = null;
let selectedPlan = null;

document.addEventListener("DOMContentLoaded", loadRenewDetails);


// ==========================================
// LOAD CURRENT PASS + PLANS
// ==========================================

async function loadRenewDetails() {

    currentUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");

    if (!currentUser || !currentUser.id) {

        showEmptyState(
            "Login required",
            "Please login to renew your bus pass.",
            "Login Now",
            "login.html"
        );

        return;
    }


    // Load user's pass history

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
            "Could not load your pass details. Please ensure the backend server is running.",
            "Try Again",
            "renew-pass.html"
        );

        return;
    }


    // Find the most recent paid pass
    // (history comes ordered latest first)

    currentPass = history.find(app =>
        app.application_status === "paid" &&
        app.payment_status === "success"
    ) || null;


    if (!currentPass) {

        showEmptyState(
            "No pass to renew",
            "You don't have a paid pass yet. Apply for a new pass to get started.",
            "Apply New Pass",
            "pass-type.html"
        );

        return;
    }

    renderCurrentPass();
    await loadPlans();
}


// ==========================================
// CURRENT PASS HELPERS
// ==========================================

function getValidUntil(application) {

    const start = new Date(application.payment_date || application.created_at);

    const validityDays =
        Number(application.validity_days) || 30;

    start.setDate(start.getDate() + validityDays - 1);

    return start;
}


function getStatusInfo(validUntil) {

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const daysLeft =
        Math.ceil((validUntil - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {

        return {
            label: "Expired",
            cssClass: "expired",
            icon: "fa-circle-xmark",
            note: "Your pass has expired — renew now to travel again."
        };
    }

    if (daysLeft <= 15) {

        return {
            label: "Expiring Soon",
            cssClass: "expiring",
            icon: "fa-clock",
            note: `Only ${daysLeft} day(s) left — renew now to avoid interruption.`
        };
    }

    return {
        label: "Active",
        cssClass: "active",
        icon: "fa-circle-check",
        note: "Your pass is active. You can renew anytime."
    };
}


function renderCurrentPass() {

    const validUntil = getValidUntil(currentPass);

    const status = getStatusInfo(validUntil);

    const badge = document.getElementById("statusBadge");

    badge.className = "status-badge " + status.cssClass;

    badge.innerHTML =
        `<i class="fa-solid ${status.icon}"></i> ${status.label}`;

    document.getElementById("statusNote").textContent =
        status.note;

    document.getElementById("currentPassName").textContent =
        `${currentPass.pass_type_name} ${currentPass.plan_name || ""}`.trim();

    document.getElementById("currentRoute").textContent =
        currentPass.from_stop && currentPass.to_stop
            ? `${currentPass.from_stop} → ${currentPass.to_stop}`
            : "Route not available";

    document.getElementById("currentValidFrom").textContent =
        dateFormat.format(
            new Date(currentPass.payment_date || currentPass.created_at)
        );

    document.getElementById("currentValidTill").textContent =
        dateFormat.format(validUntil);

    const amount =
        currentPass.paid_amount ?? currentPass.plan_amount;

    document.getElementById("currentLastPaid").textContent =
        amount == null ? "--" : `₹${moneyFormat.format(amount)}/-`;
}


// ==========================================
// LOAD + RENDER PLANS
// ==========================================

async function loadPlans() {

    const planList = document.getElementById("planList");

    try {

        const response = await fetch(
            `${API_BASE}/api/plans?passType=${encodeURIComponent(currentPass.pass_type_name)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not load plans.");
        }

        const plans = result.plans || [];

        if (!plans.length) {

            planList.innerHTML =
                `<p class="subtitle">No plans available right now.</p>`;

            return;
        }

        planList.innerHTML = plans.map(plan => {

            const isCurrentPlan =
                currentPass.plan_name === plan.plan_name;

            return `
                <label class="plan-option ${isCurrentPlan ? "selected" : ""}">
                    <input
                        type="radio"
                        name="renewalPlan"
                        value="${plan.id}"
                        data-name="${plan.plan_name}"
                        data-price="${plan.amount}"
                        data-days="${plan.validity_days}"
                        ${isCurrentPlan ? "checked" : ""}
                        onchange="selectPlan(this)">
                    <span class="plan-radio"></span>
                    <div class="plan-details">
                        <strong>${plan.plan_name}${isCurrentPlan ? " • Current" : ""}</strong>
                        <small>${plan.description || `Valid for ${plan.validity_days} days`}</small>
                    </div>
                    <span class="plan-price">₹${moneyFormat.format(plan.amount)}/-</span>
                </label>`;

        }).join("");


        // Preselect the current plan

        const preselected =
            document.querySelector('input[name="renewalPlan"]:checked');

        if (preselected) {
            selectPlan(preselected);
        }

    } catch (error) {

        planList.innerHTML =
            `<p class="subtitle">Plans could not be loaded. Please ensure the backend is running.</p>`;
    }
}


function selectPlan(radio) {

    selectedPlan = {
        id: radio.value,
        planName: radio.dataset.name,
        price: radio.dataset.price,
        validityDays: radio.dataset.days
    };

    document.querySelectorAll(".plan-option").forEach(option =>
        option.classList.remove("selected")
    );

    radio.closest(".plan-option").classList.add("selected");
}


// ==========================================
// EDIT DETAILS DURING RENEWAL
// ==========================================
function editRenewalDetails() {
    if (!currentPass) {
        showPopup("info", "Please Wait", "Your current pass details are still loading.");
        return;
    }

    const passType = currentPass.pass_type_name || "Student Pass";
    const user = currentUser || JSON.parse(localStorage.getItem("loggedInUser") || "null");
    if (!user || !user.id) {
        showPopup("error", "Login Required", "Please login again to edit your renewal details.");
        return;
    }

    localStorage.setItem("selectedPassType", passType);
    localStorage.setItem("renewalEdit", "true");
    localStorage.setItem("renewalEditApplicationId", String(currentPass.application_id || ""));

    const target = passType === "Employee Pass" ? "employee-details.html" : "student-details.html";
    window.location.href = `${target}?mode=renew-edit`;
}

// ==========================================
// CONTINUE TO PAYMENT
// ==========================================

async function proceedToPayment() {

    if (!currentUser || !currentPass) {

        showPopup(
                "info",
                "Please Wait",
                "Please wait while your pass details load."
            );

        return;
    }

    if (!selectedPlan) {

        showPopup(
                "error",
                "Plan Not Selected",
                "Please select a renewal plan."
            );

        return;
    }

    showConfirm(
        "Confirm Renewal",
        `Renew your ${currentPass.pass_type_name} with ${selectedPlan.planName} for ₹${selectedPlan.price}/-?`,
        startRenewal
    );
}


// ==========================================
// START RENEWAL (after user confirms)
// ==========================================

async function startRenewal() {


    // Create the renewed application record
    // (same pass type, route and bus type)

    try {

        const response = await fetch(`${API_BASE}/api/renewals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.id,
                previousApplicationId: currentPass.application_id
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not start renewal.");
        }

        localStorage.setItem("applicationId", result.applicationId);

    } catch (error) {

        console.error("Unable to start renewal:", error);

        return;
    }


    // Prepare payment page data
    // (existing payment screen reads these keys)

    localStorage.setItem(
        "selectedPassType",
        currentPass.pass_type_name
    );

    localStorage.setItem(
        currentPass.pass_type_name === "Employee Pass" ? "employeePlan" : "studentPlan",
        JSON.stringify({
            plan: selectedPlan.planName,
            price: selectedPlan.price,
            passType: currentPass.pass_type_name
        })
    );

    localStorage.setItem("renewalMode", "true");


    // Go to payment screen

    window.location.href = "payment.html";
}


// ==========================================
// EMPTY STATE
// ==========================================

let emptyActionUrl = "pass-type.html";

function showEmptyState(title, message, buttonText, actionUrl) {

    emptyActionUrl = actionUrl;

    document.getElementById("renewContent").style.display = "none";

    document.getElementById("bottomButtons").classList.add("hidden");

    document.getElementById("emptyState").style.display = "block";

    document.getElementById("emptyTitle").textContent = title;

    document.getElementById("emptyMessage").textContent = message;

    document.getElementById("emptyActionBtn").textContent = buttonText;
}

function handleEmptyAction() {
    window.location.href = emptyActionUrl;
}


// ==========================================
// BACK BUTTON
// ==========================================

function goBack() {
    window.location.href = "dashboard.html";
}