const passType = "Employee Pass";
let route = JSON.parse(localStorage.getItem("employeeRoute") || "null");

function selectPlan(radio) {
    document.querySelectorAll(".plan-option").forEach(option => option.classList.remove("selected"));
    radio.closest(".plan-option").classList.add("selected");
}

function applyDatabaseDistancePlan() {
    const routeKm = Number(route?.distanceKm || Number.parseFloat(route?.distance) || 0);
    if (!routeKm) return Promise.resolve(false);
    return fetch(`http://localhost:5000/api/plan-rates?passType=${encodeURIComponent(passType)}&distanceKm=${encodeURIComponent(routeKm)}`, { cache: "no-store" })
        .then(response => response.json())
        .then(result => {
            if (!result.success || !result.plan) return false;
            const values = [result.plan.monthly, result.plan.threeMonths, result.plan.halfYearly, result.plan.yearly];
            document.querySelectorAll(".plan-option").forEach((option, index) => {
                const amount = Number(values[index] || 0);
                const price = option.querySelector(".price");
                const input = option.querySelector("input");
                if (price) price.textContent = `₹${amount.toLocaleString("en-IN")}/-`;
                if (input) input.dataset.price = String(amount);
            });
            return true;
        })
        .catch(error => { console.warn("Database distance plan unavailable:", error.message); return false; });
}

function configureEmployeePlan() {
    const details = JSON.parse(localStorage.getItem("employeeDetails") || "{}");
    document.getElementById("organizationValue").textContent = details.organization || "Not available";
    document.getElementById("employeeIdValue").textContent = details.employeeId || "Not available";
    document.getElementById("designationValue").textContent = details.designation || "Not available";
    if (route) {
        document.getElementById("routeSummary").textContent = `${route.fromStop} → ${route.toStop}`;
        document.getElementById("routeDistance").textContent = "Office route selected";
    }

    fetch(`http://localhost:5000/api/plans?passType=${encodeURIComponent(passType)}`)
        .then(response => response.json())
        .then(result => {
            if (!result.success) return;
            document.querySelectorAll(".plan-option").forEach((option, index) => {
                const plan = result.plans[index];
                if (!plan) return;
                option.querySelector("strong").textContent = plan.plan_name;
                option.querySelector("small").textContent = plan.description;
                option.querySelector(".price").textContent = `₹${Number(plan.amount).toLocaleString("en-IN")}/-`;
                option.querySelector("input").value = plan.plan_name;
                option.querySelector("input").dataset.price = plan.amount;
                option.querySelector("input").dataset.planId = plan.id;
            });
        })
        .then(() => applyDatabaseDistancePlan())
        .catch(() => {});
}

function goBack() {
    window.location.href = "employee-route.html";
}

async function goNext() {
    await applyDatabaseDistancePlan();
    const selectedPlan = document.querySelector('input[name="plan"]:checked');
    if (!selectedPlan) {
        showPopup(
            "error",
            "Plan Not Selected",
            "Please select a pass plan."
        );
        return;
    }

    const user = BPApplication.user();
    const applicationId = BPApplication.id() || localStorage.getItem("applicationId");
    if (!applicationId || !user || !user.id) {
        showPopup(
            "error",
            "Route Missing",
            "Please complete the route step first."
        );
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/plans/select", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ applicationId, userId: user.id, planId: selectedPlan.dataset.planId || "", planName: selectedPlan.value, amount: Number(selectedPlan.dataset.price || 0) })
        });
        const result = await response.json().catch(() => ({ success: false, message: "Could not save plan." }));
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not save plan.");
        }
    } catch (error) {
        showPopup("error", "Could Not Save Plan", error.message);
        return;
    }

    localStorage.setItem("employeePlan", JSON.stringify({
        plan: selectedPlan.value,
        price: selectedPlan.dataset.price,
        planId: selectedPlan.dataset.planId || "",
        validityDays: Number(selectedPlan.dataset.validityDays || (selectedPlan.value.toLowerCase().includes("year") ? 365 : selectedPlan.value.toLowerCase().includes("half") ? 180 : selectedPlan.value.toLowerCase().includes("3 month") ? 90 : 30)),
        passType
    }));
    BPApplication.update({ plan: { planId: selectedPlan.dataset.planId || "", planName: selectedPlan.value, amount: selectedPlan.dataset.price || "", validity: selectedPlan.closest(".plan-option")?.querySelector("small")?.textContent || "" }, currentStep: "plan", status: "Plan Selected" });
    window.location.href = "payment.html";
}

configureEmployeePlan();

BPApplication.current().then(app => {
    if (!app) return;
    if (app.route?.fromStop) {
        route = app.route;
        localStorage.setItem("employeeRoute", JSON.stringify(route));
        configureEmployeePlan();
    }
    if (app.plan?.planName) setTimeout(() => {
        const input = Array.from(document.querySelectorAll('input[name="plan"]')).find(item => item.value === app.plan.planName);
        if (input) { input.checked = true; selectPlan(input); }
    }, 250);
}).catch(error => console.warn("Could not restore application plan:", error.message));
