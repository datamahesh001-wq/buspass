let applications = [];
let activeFilter = "all";
let latestFirst = true;

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const moneyFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

document.addEventListener("DOMContentLoaded", loadHistory);

async function loadHistory() {
    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    if (!user || !user.id) {
        renderMessage("Please login to view your pass history.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/history?userId=${encodeURIComponent(user.id)}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not load pass history.");
        applications = result.history || [];
        renderHistory();
    } catch (error) {
        renderMessage("Could not load your pass history. Please ensure the backend is running.");
    }
}

function renderHistory() {
    const list = document.getElementById("passList");
    const filtered = applications
        .filter(matchesCurrentFilter)
        .sort((first, second) => latestFirst
            ? new Date(second.created_at) - new Date(first.created_at)
            : new Date(first.created_at) - new Date(second.created_at));

    if (!filtered.length) {
        const message = applications.length ? "No passes match this filter." : "No pass applications yet. Your applied passes will appear here automatically.";
        renderMessage(message);
        return;
    }

    list.innerHTML = filtered.map(createPassCard).join("");
}

function matchesCurrentFilter(application) {
    if (activeFilter === "all") return true;
    if (!isIssued(application)) return false;
    const validUntil = getValidUntil(application);
    return activeFilter === "active" ? validUntil >= startOfToday() : validUntil < startOfToday();
}

function createPassCard(application) {
    const isPaid = application.application_status === "paid";
    const isIssuedPass = isIssued(application);
    const status = isPaid ? "Paid" : formatStatus(application.application_status);
    const amount = application.paid_amount ?? application.plan_amount;
    const fromDate = new Date(application.valid_from || application.payment_date || application.created_at);
    const validUntil = getValidUntil(application);
    const hasValidityDate = Boolean(application.valid_from || application.valid_to || application.payment_date);
    const planName = application.plan_name || "Pass application";
    const route = application.from_stop && application.to_stop ? `${application.from_stop} → ${application.to_stop}` : "Route details pending";
    const identifier = application.transaction_id || `Application #${application.application_id}`;

    return `
        <article class="pass-card ${isPaid ? "paid-card" : "pending-card"}">
            <div class="card-top">
                <div class="bus-circle"><i class="fa-solid fa-bus"></i></div>
                <div class="pass-info">
                    <h2>${escapeHtml(`${application.pass_type_name} ${planName}`)}</h2>
                    <p class="pass-route">${escapeHtml(route)}</p>
                    <p class="pass-id-label">${isPaid ? "Transaction ID" : "Application ID"}</p>
                    <p class="pass-id">${escapeHtml(identifier)}</p>
                </div>
                <div class="approved ${isPaid ? "" : "pending"}">
                    <span class="approved-check"><i class="fa-solid ${isPaid ? "fa-check" : "fa-clock"}"></i></span>
                    <span>${escapeHtml(status)}</span>
                </div>
            </div>
            <div class="divider"></div>
            <div class="card-bottom">
                <div class="detail"><i class="fa-regular fa-calendar detail-icon"></i><div class="detail-text"><span>${isIssuedPass ? "Valid From" : "Applied On"}</span><strong>${dateFormat.format(fromDate)}</strong></div></div>
                <div class="detail"><i class="fa-regular fa-calendar detail-icon"></i><div class="detail-text"><span>Valid Till</span><strong>${hasValidityDate ? dateFormat.format(validUntil) : "Pending payment"}</strong></div></div>
                <div class="detail amount-detail"><div class="rupee-circle">₹</div><div class="detail-text"><span>Amount</span><strong>${amount == null ? "--" : `₹${moneyFormat.format(amount)}/-`}</strong></div></div>
            </div>
        </article>`;
}

function getValidUntil(application) {
    if (application.valid_to) return new Date(application.valid_to);
    const start = new Date(application.payment_date || application.created_at);
    const validityDays = Number(application.validity_days) || 30;
    start.setDate(start.getDate() + validityDays - 1);
    return start;
}

function isIssued(application) {
    return application.application_status === "paid" || application.application_status === "approved";
}

function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function formatStatus(status) {
    return String(status || "draft").replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

function renderMessage(message) {
    document.getElementById("passList").innerHTML = `<div class="empty-history"><i class="fa-solid fa-bus-simple"></i><p>${escapeHtml(message)}</p></div>`;
}

function changeTab(clickedTab) {
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
    clickedTab.classList.add("active");
    activeFilter = clickedTab.dataset.filter;
    renderHistory();
}

function toggleSort() {
    latestFirst = !latestFirst;
    document.getElementById("sortText").textContent = latestFirst ? "Latest First" : "Oldest First";
    renderHistory();
}

function goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = "dashboard.html";
}

function goHome() { window.location.href = "dashboard.html"; }
function goMyPass() { window.location.href = "my-pass.html"; }
function goProfile() { window.location.href = "profile.html"; }
