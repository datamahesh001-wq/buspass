// ========================================
// PAYMENT SUCCESS - CONFIRMATION
// ========================================

const validityByPlan = {
    "Monthly Pass": "Valid for 30 days from the date of issue",
    "3 Monthly": "Valid for 3 months from the date of issue",
    "Half-Yearly Pass": "Valid for 6 months from the date of issue",
    "Yearly Pass": "Valid for 12 months from the date of issue"
};

document.addEventListener("DOMContentLoaded", loadPaymentSuccess);


async function loadPaymentSuccess() {
    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    const app = await BPApplication.current();
    const state = BPApplication.load();
    const plan = state?.plan || {};
    const payment = state?.payment || {};
    const passType = app?.pass_type_name || state?.passType || "Bus Pass";
    const amount = payment.amount || app?.amount || plan.amount || null;
    const transactionId = payment.transactionId || app?.transaction_id || "TXN-PENDING";
    const paymentDate = new Date();
    const planName = plan.planName || app?.plan_name || passType;
    const validityText = plan.validity || validityByPlan[planName] || "Based on selected plan";

    renderSuccess(amount, transactionId, paymentDate, planName, validityText);
    if (document.getElementById("successPassType")) document.getElementById("successPassType").textContent = passType;
    if (user && user.id && app?.application_id) {
        localStorage.setItem("applicationId", String(app.application_id));
    }
}


function renderSuccess(amount, transactionId, paymentDate, planName, validityText) {

    if (amount !== null && amount !== undefined) {
        document.getElementById("successAmount").textContent =
            "\u20B9" + amount + "/-";
    }

    document.getElementById("transactionId").textContent =
        transactionId;

    document.getElementById("paymentDate").textContent =
        paymentDate.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        });

    document.getElementById("successPassType").textContent =
        planName || "--";

    document.getElementById("successValidity").textContent =
        validityText;

}


// ========================================
// GO TO HOME
// ========================================

function trackApplication() {

    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    if (!user || !user.id) {
        window.location.href = "login.html";
        return;
    }
    window.location.href = "home/application-tracking.html";

}


function goHome() {

    window.location.href = "home/dashboard.html";

}
