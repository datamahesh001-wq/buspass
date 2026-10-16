const passType =
    localStorage.getItem("selectedPassType") || "Student Pass";

const isEmployee = passType === "Employee Pass";

const routeKey = isEmployee
    ? "employeeRoute"
    : "studentRoute";

let route = null;

try {
    route = JSON.parse(
        localStorage.getItem(routeKey) || "null"
    );
} catch (error) {
    console.error("Unable to read route:", error);
    route = null;
}


/* =========================================================
   PLAN SELECTION
   ========================================================= */

function selectPlan(radio) {

    const plans =
        document.querySelectorAll(".plan-option");

    plans.forEach(plan => {
        plan.classList.remove("selected");
    });

    const selectedOption =
        radio.closest(".plan-option");

    if (selectedOption) {
        selectedOption.classList.add("selected");
    }
}


/* =========================================================
   ADMIN DISTANCE BASED PLAN
   ========================================================= */

function applyAdminDistancePlan() {

    try {

        const routeKm =
            Number(
                route?.distanceKm ||
                Number.parseFloat(route?.distance) ||
                0
            );

        const plans =
            JSON.parse(
                localStorage.getItem("adminPassPlans") || "[]"
            );

        if (
            !routeKm ||
            !Array.isArray(plans) ||
            !plans.length
        ) {
            return false;
        }

        const matched = plans.find(plan => {

            const numbers =
                String(plan.distanceRange || "")
                    .match(/\d+(?:\.\d+)?/g) || [];

            const min =
                Number(numbers[0] || 0);

            const max =
                Number(
                    numbers[1] ||
                    numbers[0] ||
                    0
                );

            return (
                routeKm >= min &&
                routeKm <= max
            );
        });

        if (!matched) {
            return false;
        }

        const values = [
            matched.monthly,
            matched.threeMonths,
            matched.halfYearly,
            matched.yearly
        ];

        document
            .querySelectorAll(".plan-option")
            .forEach((option, index) => {

                const amount =
                    Number(values[index] || 0);

                const priceElement =
                    option.querySelector(".price");

                const inputElement =
                    option.querySelector("input");

                if (priceElement) {
                    priceElement.textContent =
                        `₹${amount.toLocaleString("en-IN")}/-`;
                }

                if (inputElement) {
                    inputElement.dataset.price =
                        amount;
                }
            });

        const distanceElement =
            document.getElementById("routeDistance");

        if (distanceElement) {
            distanceElement.textContent =
                `${routeKm} KM - amount fixed by Transport Office`;
        }

        return true;

    } catch (error) {

        console.error(
            "Admin distance plan error:",
            error
        );

        return false;
    }
}


/* =========================================================
   DATABASE DISTANCE BASED PLAN
   ========================================================= */

function applyDatabaseDistancePlan() {
    const routeKm = Number(route?.distanceKm || Number.parseFloat(route?.distance) || 0);
    if (!routeKm) return Promise.resolve(false);

    const url = `http://localhost:5000/api/plan-rates?passType=${encodeURIComponent(passType)}&distanceKm=${encodeURIComponent(routeKm)}`;
    return fetch(url, { cache: "no-store" })
        .then(response => response.json())
        .then(result => {
            if (!result || !result.success || !result.plan) return false;
            const values = [result.plan.monthly, result.plan.threeMonths, result.plan.halfYearly, result.plan.yearly];
            document.querySelectorAll(".plan-option").forEach((option, index) => {
                const amount = Number(values[index] || 0);
                const priceElement = option.querySelector(".price");
                const inputElement = option.querySelector("input");
                if (priceElement) priceElement.textContent = `₹${amount.toLocaleString("en-IN")}/-`;
                if (inputElement) inputElement.dataset.price = String(amount);
            });
            const distanceElement = document.getElementById("routeDistance");
            if (distanceElement) distanceElement.textContent = `${routeKm} KM - amount fixed by Transport Office`;
            return true;
        })
        .catch(error => {
            console.warn("Database distance plan unavailable:", error.message);
            return false;
        });
}

/* =========================================================
   CONFIGURE PLAN SCREEN
   ========================================================= */

function configurePlan() {

    document.title =
        `${passType} Plan - Bus Pass Application`;

    const passTitle =
        document.getElementById("passTitle");

    if (passTitle) {
        passTitle.textContent = passType;
    }

    const planCardTitle =
        document.querySelector(".plan-card h3");

    if (planCardTitle) {
        planCardTitle.textContent =
            `${passType} Plan Selection`;
    }


    /* -----------------------------------------
       ROUTE DISPLAY
       ----------------------------------------- */

    const routeSummary =
        document.getElementById("routeSummary");

    const routeDistance =
        document.getElementById("routeDistance");

    if (route) {

        if (routeSummary) {
            routeSummary.textContent =
                `${route.fromStop} → ${route.toStop}`;
        }

        if (routeDistance) {
            routeDistance.textContent =
                route.distance
                    ? `${route.distance} - route selected`
                    : "Route selected";
        }

    } else {

        if (routeSummary) {
            routeSummary.textContent =
                isEmployee
                    ? "Home Bus Stop → Office Bus Stop"
                    : "Home Bus Stop → College Bus Stop";
        }

        if (routeDistance) {
            routeDistance.textContent =
                "Please select a route";
        }
    }


    /* -----------------------------------------
       PLANS ARE LOADED FROM MYSQL below.
       (No hardcoded prices are rendered.)
       ----------------------------------------- */

    /* -----------------------------------------
       DATABASE DISTANCE PLANS
       MySQL is the source of truth; do not stop at a stale localStorage cache.
       ----------------------------------------- */

    applyDatabaseDistancePlan();


    /* -----------------------------------------
       DATABASE GENERAL PLANS
       ----------------------------------------- */

    const plansUrl =
        `http://localhost:5000/api/plans` +
        `?passType=${encodeURIComponent(passType)}`;

    fetch(plansUrl)
        .then(response => response.json())

        .then(result => {

            if (
                !result ||
                !result.success ||
                !Array.isArray(result.plans)
            ) {
                return;
            }

            document
                .querySelectorAll(".plan-option")
                .forEach((option, index) => {

                    const plan =
                        result.plans[index];

                    if (!plan) {
                        return;
                    }

                    const nameElement =
                        option.querySelector("strong");

                    const descriptionElement =
                        option.querySelector("small");

                    const priceElement =
                        option.querySelector(".price");

                    const inputElement =
                        option.querySelector("input");

                    if (nameElement) {
                        nameElement.textContent =
                            plan.plan_name;
                    }

                    if (descriptionElement) {
                        descriptionElement.textContent =
                            plan.description || "";
                    }

                    if (priceElement) {
                        priceElement.textContent =
                            `₹${Number(plan.amount).toLocaleString("en-IN")}/-`;
                    }

                    if (inputElement) {
                        inputElement.value =
                            plan.plan_name;

                        inputElement.dataset.price =
                            plan.amount;
                        inputElement.dataset.planId = plan.id;
                    }
                });

        })

        .then(() => {

            /*
             * Re-apply distance-based amount
             * after general plans are loaded.
             */

            applyDatabaseDistancePlan();

        })

        .catch(error => {

            console.warn(
                "Unable to load plans from database:",
                error.message
            );
        });
}


/* =========================================================
   BACK BUTTON
   ========================================================= */

function goBack() {

    window.location.href =
        "student-route.html";
}


/* =========================================================
   NEXT BUTTON
   Student Plan -> Payment
   ========================================================= */

async function goNext() {

    /* -----------------------------------------
       CHECK ROUTE
       ----------------------------------------- */

    let currentRoute = null;

    try {

        currentRoute = JSON.parse(
            localStorage.getItem(routeKey) || "null"
        );

    } catch (error) {

        currentRoute = null;
    }


    /*
     * This is the important fix.
     *
     * Earlier code was checking only:
     *
     * applicationId
     *
     * Now we check the actual selected
     * student/employee route.
     */

    if (
        !currentRoute ||
        !currentRoute.fromStop ||
        !currentRoute.toStop
    ) {

        showPopup(
            "error",
            "Route Missing",
            "Please complete the route step first."
        );

        return;
    }


    /* -----------------------------------------
       CHECK PLAN
       Refresh Admin pricing before saving the selected amount.
       ----------------------------------------- */

    await applyDatabaseDistancePlan();

    const selectedPlan =
        document.querySelector(
            'input[name="plan"]:checked'
        );

    if (!selectedPlan) {

        showPopup(
            "error",
            "Plan Not Selected",
            "Please select a pass plan."
        );

        return;
    }


    /* -----------------------------------------
       PLAN DETAILS
       ----------------------------------------- */

    const planName =
        selectedPlan.value;

    const price =
        selectedPlan.dataset.price ||
        selectedPlan
            .closest(".plan-option")
            ?.querySelector(".price")
            ?.textContent
            ?.replace(/[₹,\/-]/g, "")
            ?.trim() ||
        "0";


    const planDetails = {

        plan: planName,

        price: price,
        planId: selectedPlan.dataset.planId || "",
        validityDays: Number(selectedPlan.dataset.validityDays || (planName.toLowerCase().includes("year") ? 365 : planName.toLowerCase().includes("half") ? 180 : planName.toLowerCase().includes("3 month") ? 90 : 30)),

        passType: passType,

        routeId:
            currentRoute.routeId || "",

        fromStop:
            currentRoute.fromStop,

        toStop:
            currentRoute.toStop,

        busType:
            currentRoute.busType || "",

        distance:
            currentRoute.distance || "",

        distanceKm:
            currentRoute.distanceKm || 0
    };


    /* -----------------------------------------
       SAVE PLAN
       ----------------------------------------- */

    localStorage.setItem(
        isEmployee
            ? "employeePlan"
            : "studentPlan",

        JSON.stringify(planDetails)
    );

    const user = BPApplication.user();
    const applicationId = BPApplication.id() || localStorage.getItem("applicationId");

    if (!applicationId || !user || !user.id) {
        showPopup("error", "Application Missing", "Please restart the application from pass type selection.");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/plans/select", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ applicationId, userId: user.id, planId: selectedPlan.dataset.planId || "", planName, amount: Number(price || 0), validityDays: selectedPlan.dataset.validityDays || "" })
        });
        const result = await response.json().catch(() => ({ success: false, message: "Could not save plan." }));
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not save plan.");
        }
    } catch (error) {
        showPopup("error", "Could Not Save Plan", error.message);
        return;
    }

    BPApplication.update({ plan: { planId: selectedPlan.dataset.planId || "", planName, amount: price, validity: selectedPlan.closest(".plan-option")?.querySelector("small")?.textContent || "" }, currentStep: "plan", status: "Plan Selected" });

    window.location.href = "payment.html";
}


/* =========================================================
   START PAGE
   ========================================================= */

configurePlan();

BPApplication.current().then(app => {
    if (!app) return;
    if (app.route?.fromStop) {
        route = app.route;
        configurePlan();
    }
    if (app.plan?.planName) setTimeout(() => {
        const input = Array.from(document.querySelectorAll('input[name="plan"]')).find(item => item.value === app.plan.planName);
        if (input) { input.checked = true; selectPlan(input); }
    }, 250);
}).catch(error => console.warn("Could not restore application plan:", error.message));
