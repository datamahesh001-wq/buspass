document.addEventListener("DOMContentLoaded", function () {

    /* =========================================
       GET ALL REQUIRED ELEMENTS
    ========================================= */

    const addPlanButton =
        document.getElementById("addPlanButton");

    const planModal =
        document.getElementById("planModal");

    const deleteModal =
        document.getElementById("deleteModal");

    const closeModalButton =
        document.getElementById("closeModalButton");

    const cancelPlanButton =
        document.getElementById("cancelPlanButton");

    const passPlanForm =
        document.getElementById("passPlanForm");

    const modalTitle =
        document.getElementById("modalTitle");

    const distanceRangeInput =
        document.getElementById("distanceRange");

    const monthlyPriceInput =
        document.getElementById("monthlyPrice");

    const threeMonthsPriceInput =
        document.getElementById("threeMonthsPrice");

    const halfYearlyPriceInput =
        document.getElementById("halfYearlyPrice");

    const yearlyPriceInput =
        document.getElementById("yearlyPrice");

    const confirmDeleteButton =
        document.getElementById("confirmDeleteButton");

    const cancelDeleteButton =
        document.getElementById("cancelDeleteButton");

    const passPlansPanel =
        document.getElementById("passPlansPanel");

    const toastMessage =
        document.getElementById("toastMessage");

    const toastText =
        document.getElementById("toastText");

    const toastIcon =
        document.getElementById("toastIcon");

    const tabButtons =
        document.querySelectorAll(".management-tab");


    /* =========================================
       VARIABLES
    ========================================= */

    let editingPlan = null;

    let deletingPlan = null;

    async function syncPassPlansToDatabase(plans) {
        const response = await fetch('/api/admin/plan-rates', { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !Array.isArray(result.plans)) {
            throw new Error(result.message || 'Could not load plans from MySQL.');
        }
        const existing = result.plans;
        for (const plan of plans) {
                const numbers = String(plan.distanceRange || '').match(/\d+(?:\.\d+)?/g) || [];
                const distanceMinKm = Number(numbers[0]);
                const distanceMaxKm = Number(numbers[1] || numbers[0]);
                if (!Number.isFinite(distanceMinKm) || !Number.isFinite(distanceMaxKm)) continue;
                const idMatch = String(plan.id || '').match(/(?:db-)?(\d+)$/);
                const matchById = idMatch ? existing.find(item => String(item.id) === idMatch[1]) : null;
                const matchByRange = existing.find(item => Number(item.distanceMinKm) === distanceMinKm && Number(item.distanceMaxKm) === distanceMaxKm);
                const match = matchById || matchByRange;
                const method = match ? 'PUT' : 'POST';
                const endpoint = match ? `/api/admin/plan-rates/${match.id}` : '/api/admin/plan-rates';
                const save = await fetch(endpoint, {
                    method, headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planLabel: plan.distanceRange, distanceMinKm, distanceMaxKm, monthly: Number(plan.monthly), threeMonths: Number(plan.threeMonths), halfYearly: Number(plan.halfYearly), yearly: Number(plan.yearly) })
                });
                const saved = await save.json().catch(() => ({}));
                if (!save.ok || !saved.success) throw new Error(saved.message || `Could not save plan ${plan.distanceRange}.`);
                plan.id = `db-${match?.id || saved.id || (idMatch ? idMatch[1] : '')}`;
                const card = Array.from(document.querySelectorAll('.pass-plan-card')).find(item => item.querySelector('.distance-range')?.textContent.trim() === plan.distanceRange);
                if (card && plan.id !== 'db-') card.dataset.planId = plan.id;
        }
    }

    async function deletePassPlanFromDatabase(planIdentifier) {
        const response = await fetch('/api/admin/plan-rates', { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || 'Could not load plans from MySQL.');
        const idMatch = String(planIdentifier || '').match(/(?:db-)?(\d+)$/);
        const plan = (result.plans || []).find(item =>
                (idMatch && String(item.id) === idMatch[1]) ||
                String(item.planLabel).trim().toLowerCase() === String(planIdentifier).trim().toLowerCase()
            );
        if (!plan) throw new Error('Pass plan not found in MySQL.');
        const deleted = await fetch(`/api/admin/plan-rates/${plan.id}`, { method: 'DELETE' });
        const deletedResult = await deleted.json().catch(() => ({}));
        if (!deleted.ok || !deletedResult.success) throw new Error(deletedResult.message || 'Could not delete pass plan from MySQL.');
    }


    /* =========================================
       OPEN ADD PLAN MODAL
    ========================================= */

    if (addPlanButton) {

        addPlanButton.addEventListener(
            "click",
            function () {

                editingPlan = null;

                passPlanForm.reset();

                modalTitle.textContent =
                    "Add New Plan";

                planModal.classList.add("show");

                distanceRangeInput.focus();

            }
        );

    }


    /* =========================================
       CLOSE PLAN MODAL
    ========================================= */

    function closePlanModal() {

        planModal.classList.remove("show");

        passPlanForm.reset();

        editingPlan = null;

    }


    if (closeModalButton) {

        closeModalButton.addEventListener(
            "click",
            closePlanModal
        );

    }


    if (cancelPlanButton) {

        cancelPlanButton.addEventListener(
            "click",
            closePlanModal
        );

    }


    /* =========================================
       FORMAT PRICE
    ========================================= */

    function formatPrice(price) {

        return Number(price).toLocaleString(
            "en-IN"
        );

    }


    /* =========================================
       CREATE PASS PLAN CARD
    ========================================= */

    function createPassPlanCard(plan) {

        const passPlanCard =
            document.createElement("article");

        passPlanCard.className =
            "pass-plan-card";

        passPlanCard.dataset.planId =
            plan.id;


        passPlanCard.innerHTML = `
            <div class="plan-top-row">

                <h3 class="distance-range">
                    ${plan.distanceRange}
                </h3>


                <div class="plan-actions">

                    <button
                        class="edit-plan-btn"
                        type="button"
                        aria-label="Edit plan"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>


                    <button
                        class="delete-plan-btn"
                        type="button"
                        aria-label="Delete plan"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </div>

            </div>


            <div class="plan-price-grid">

                <div class="price-item">

                    <span>Monthly</span>

                    <strong>
                        ₹ ${formatPrice(plan.monthly)}
                    </strong>

                </div>


                <div class="price-item">

                    <span>3 Months</span>

                    <strong>
                        ₹ ${formatPrice(plan.threeMonths)}
                    </strong>

                </div>


                <div class="price-item">

                    <span>Half Yearly</span>

                    <strong>
                        ₹ ${formatPrice(plan.halfYearly)}
                    </strong>

                </div>


                <div class="price-item">

                    <span>Yearly</span>

                    <strong>
                        ₹ ${formatPrice(plan.yearly)}
                    </strong>

                </div>

            </div>
        `;


        passPlansPanel.appendChild(
            passPlanCard
        );


        attachPlanActions(
            passPlanCard
        );

    }


    /* =========================================
       UPDATE PASS PLAN CARD
    ========================================= */

    function updatePassPlanCard(
        passPlanCard,
        plan
    ) {

        passPlanCard.dataset.planId =
            plan.id;


        passPlanCard
            .querySelector(".distance-range")
            .textContent =
            plan.distanceRange;


        const priceValues =
            passPlanCard.querySelectorAll(
                ".price-item strong"
            );


        priceValues[0].textContent =
            "₹ " + formatPrice(plan.monthly);

        priceValues[1].textContent =
            "₹ " + formatPrice(plan.threeMonths);

        priceValues[2].textContent =
            "₹ " + formatPrice(plan.halfYearly);

        priceValues[3].textContent =
            "₹ " + formatPrice(plan.yearly);

    }


    /* =========================================
       ADD / EDIT PLAN FORM SUBMIT
    ========================================= */

    if (passPlanForm) {

        passPlanForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const distanceRange =
                    distanceRangeInput.value.trim();

                const monthly =
                    monthlyPriceInput.value.trim();

                const threeMonths =
                    threeMonthsPriceInput.value.trim();

                const halfYearly =
                    halfYearlyPriceInput.value.trim();

                const yearly =
                    yearlyPriceInput.value.trim();


                /* =================================
                   VALIDATION
                ================================= */

                if (!distanceRange) {

                    showToast(
                        "Please enter distance range.",
                        "error"
                    );

                    distanceRangeInput.focus();

                    return;

                }


                if (
                    monthly === "" ||
                    Number(monthly) <= 0
                ) {

                    showToast(
                        "Please enter a valid monthly price.",
                        "error"
                    );

                    monthlyPriceInput.focus();

                    return;

                }


                if (
                    threeMonths === "" ||
                    Number(threeMonths) <= 0
                ) {

                    showToast(
                        "Please enter a valid 3 months price.",
                        "error"
                    );

                    threeMonthsPriceInput.focus();

                    return;

                }


                if (
                    halfYearly === "" ||
                    Number(halfYearly) <= 0
                ) {

                    showToast(
                        "Please enter a valid half yearly price.",
                        "error"
                    );

                    halfYearlyPriceInput.focus();

                    return;

                }


                if (
                    yearly === "" ||
                    Number(yearly) <= 0
                ) {

                    showToast(
                        "Please enter a valid yearly price.",
                        "error"
                    );

                    yearlyPriceInput.focus();

                    return;

                }


                /* =================================
                   DUPLICATE DISTANCE CHECK
                ================================= */

                const allPlanCards =
                    document.querySelectorAll(
                        ".pass-plan-card"
                    );

                let duplicateFound = false;


                allPlanCards.forEach(
                    function (card) {

                        const existingRange =
                            card
                                .querySelector(
                                    ".distance-range"
                                )
                                .textContent
                                .trim()
                                .toLowerCase();


                        if (
                            existingRange ===
                            distanceRange.toLowerCase() &&
                            card !== editingPlan
                        ) {

                            duplicateFound = true;

                        }

                    }
                );


                if (duplicateFound) {

                    showToast(
                        "This distance plan already exists.",
                        "error"
                    );

                    return;

                }


                /* =================================
                   EDIT EXISTING PLAN
                ================================= */

                if (editingPlan) {

                    const updatedPlan = {

                        id:
                            editingPlan.dataset.planId,

                        distanceRange:
                            distanceRange,

                        monthly:
                            monthly,

                        threeMonths:
                            threeMonths,

                        halfYearly:
                            halfYearly,

                        yearly:
                            yearly

                    };


                    updatePassPlanCard(
                        editingPlan,
                        updatedPlan
                    );


                    var successMessage = "Pass plan updated successfully!";

                }


                /* =================================
                   ADD NEW PLAN
                ================================= */

                else {

                    const newPlan = {

                        id:
                            "plan_" + Date.now(),

                        distanceRange:
                            distanceRange,

                        monthly:
                            monthly,

                        threeMonths:
                            threeMonths,

                        halfYearly:
                            halfYearly,

                        yearly:
                            yearly

                    };


                    createPassPlanCard(
                        newPlan
                    );


                    var successMessage = "New pass plan added successfully!";

                }


                try {
                    await savePassPlans();
                } catch (error) {
                    await loadPassPlans();
                    showToast(error.message || 'Could not save plan to MySQL.', 'error');
                    return;
                }

                showToast(successMessage, 'success');

                closePlanModal();

            }
        );

    }


    /* =========================================
       ATTACH EDIT / DELETE ACTIONS
    ========================================= */

    function attachPlanActions(
        passPlanCard
    ) {

        const editButton =
            passPlanCard.querySelector(
                ".edit-plan-btn"
            );

        const deleteButton =
            passPlanCard.querySelector(
                ".delete-plan-btn"
            );


        /* EDIT PLAN */

        if (editButton) {

            editButton.addEventListener(
                "click",
                function () {

                    openEditPlanModal(
                        passPlanCard
                    );

                }
            );

        }


        /* DELETE PLAN */

        if (deleteButton) {

            deleteButton.addEventListener(
                "click",
                function () {

                    deletingPlan =
                        passPlanCard;

                    deleteModal.classList.add(
                        "show"
                    );

                }
            );

        }

    }


    /* =========================================
       OPEN EDIT PLAN MODAL
    ========================================= */

    function openEditPlanModal(
        passPlanCard
    ) {

        editingPlan =
            passPlanCard;


        modalTitle.textContent =
            "Edit Pass Plan";


        /* Distance Range */

        distanceRangeInput.value =
            passPlanCard
                .querySelector(
                    ".distance-range"
                )
                .textContent
                .trim();


        const priceValues =
            passPlanCard.querySelectorAll(
                ".price-item strong"
            );


        /*
           ₹ and commas remove chesi
           input fields lo value set chestham
        */

        monthlyPriceInput.value =
            getPriceValue(
                priceValues[0].textContent
            );

        threeMonthsPriceInput.value =
            getPriceValue(
                priceValues[1].textContent
            );

        halfYearlyPriceInput.value =
            getPriceValue(
                priceValues[2].textContent
            );

        yearlyPriceInput.value =
            getPriceValue(
                priceValues[3].textContent
            );


        planModal.classList.add(
            "show"
        );

    }


    /* =========================================
       GET CLEAN PRICE VALUE
    ========================================= */

    function getPriceValue(text) {

        return text
            .replace("₹", "")
            .replace(/,/g, "")
            .trim();

    }


    /* =========================================
       DELETE PLAN
    ========================================= */

    if (confirmDeleteButton) {

        confirmDeleteButton.addEventListener(
            "click",
            async function () {

                if (!deletingPlan) {

                    return;

                }


                const deletedPlanName =
                    deletingPlan
                        .querySelector(
                            ".distance-range"
                        )
                        .textContent
                        .trim();
                const deletedPlanId = deletingPlan.dataset.planId || deletedPlanName;


                try {
                    await deletePassPlanFromDatabase(deletedPlanId);
                } catch (error) {
                    showToast(error.message || 'Could not delete pass plan from MySQL.', 'error');
                    return;
                }

                deletingPlan.remove();
                deletingPlan = null;
                deleteModal.classList.remove('show');
                const remainingPlans = Array.from(document.querySelectorAll('.pass-plan-card')).map(card => {
                    const prices = card.querySelectorAll('.price-item strong');
                    return { id: card.dataset.planId || '', distanceRange: card.querySelector('.distance-range')?.textContent.trim() || '',
                        monthly: getPriceValue(prices[0]?.textContent || ''), threeMonths: getPriceValue(prices[1]?.textContent || ''),
                        halfYearly: getPriceValue(prices[2]?.textContent || ''), yearly: getPriceValue(prices[3]?.textContent || '') };
                });
                localStorage.setItem('adminPassPlans', JSON.stringify(remainingPlans));


                showToast(`${deletedPlanName} plan deleted successfully!`, 'success');

            }
        );

    }


    /* =========================================
       CANCEL DELETE
    ========================================= */

    if (cancelDeleteButton) {

        cancelDeleteButton.addEventListener(
            "click",
            function () {

                deletingPlan = null;

                deleteModal.classList.remove(
                    "show"
                );

            }
        );

    }


    /* =========================================
       CLOSE MODALS ON OVERLAY CLICK
    ========================================= */

    if (planModal) {

        planModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === planModal
                ) {

                    closePlanModal();

                }

            }
        );

    }


    if (deleteModal) {

        deleteModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === deleteModal
                ) {

                    deletingPlan = null;

                    deleteModal.classList.remove(
                        "show"
                    );

                }

            }
        );

    }


    /* =========================================
       INITIALIZE EXISTING PLAN ACTIONS
    ========================================= */

    function initializeExistingPlans() {

        const existingPlans =
            document.querySelectorAll(
                ".pass-plan-card"
            );


        existingPlans.forEach(
            function (passPlanCard) {

                attachPlanActions(
                    passPlanCard
                );

            }
        );

    }


    /* =========================================
       SAVE PASS PLANS TO LOCAL STORAGE
    ========================================= */

    async function savePassPlans() {

        const planCards =
            document.querySelectorAll(
                ".pass-plan-card"
            );

        const passPlans = [];


        planCards.forEach(
            function (card) {

                const prices =
                    card.querySelectorAll(
                        ".price-item strong"
                    );


                passPlans.push({

                    id:
                        card.dataset.planId,

                    distanceRange:
                        card
                            .querySelector(
                                ".distance-range"
                            )
                            .textContent
                            .trim(),

                    monthly:
                        getPriceValue(
                            prices[0].textContent
                        ),

                    threeMonths:
                        getPriceValue(
                            prices[1].textContent
                        ),

                    halfYearly:
                        getPriceValue(
                            prices[2].textContent
                        ),

                    yearly:
                        getPriceValue(
                            prices[3].textContent
                        )

                });

            }
        );


        await syncPassPlansToDatabase(passPlans);
        localStorage.setItem("adminPassPlans", JSON.stringify(passPlans));

    }


    /* =========================================
       LOAD PASS PLANS FROM LOCAL STORAGE
    ========================================= */

    async function loadPassPlans() {
        try {
            const response = await fetch('/api/admin/plan-rates', { cache: 'no-store' });
            const result = await response.json();
            if (response.ok && result.success && Array.isArray(result.plans)) {
                if (result.plans.length === 0 && localStorage.getItem("adminPassPlans") === null && passPlansPanel.querySelector(".pass-plan-card")) {
                    // First run: persist the existing starter plans instead of discarding them.
                    try { await savePassPlans(); }
                    catch (error) { showToast(error.message || 'Could not save starter plans to MySQL.', 'error'); }
                    return;
                }
                const dbPlans = result.plans.map(plan => ({
                    id: `db-${plan.id}`,
                    distanceRange: plan.planLabel || `${plan.distanceMinKm} - ${plan.distanceMaxKm} KM`,
                    monthly: plan.monthly, threeMonths: plan.threeMonths,
                    halfYearly: plan.halfYearly, yearly: plan.yearly
                }));
                localStorage.setItem('adminPassPlans', JSON.stringify(dbPlans));
                passPlansPanel.innerHTML = '';
                dbPlans.forEach(createPassPlanCard);
                return;
            }
        } catch (error) {
            console.warn('Could not load pass plans from MySQL:', error.message);
        }

        const savedPassPlans =
            localStorage.getItem(
                "adminPassPlans"
            );


        /*
           First time application open chesthe
           HTML lo unna plans ni save chestham
        */

        if (!savedPassPlans) {

            return;

        }


        let passPlans;


        try {

            passPlans =
                JSON.parse(savedPassPlans);

        }

        catch (error) {

            console.error(
                "Pass plans loading error:",
                error
            );

            return;

        }


        /*
           Current cards clear chestham
        */

        passPlansPanel.innerHTML = "";


        /*
           Saved plans malli create chestham
        */

        passPlans.forEach(
            function (plan) {

                createPassPlanCard(
                    plan
                );

            }
        );
        // Cached rows can be displayed during an outage, but edits are only
        // persisted after the database confirms them.

    }


    /* =========================================
       MANAGEMENT TAB NAVIGATION
    ========================================= */

    tabButtons.forEach(
        function (tabButton) {

            tabButton.addEventListener(
                "click",
                function () {

                    const selectedTab =
                        this.dataset.tab;


                    /*
                       Active state update
                    */

                    tabButtons.forEach(
                        function (button) {

                            button.classList.remove(
                                "active"
                            );

                        }
                    );


                    this.classList.add(
                        "active"
                    );


                    /* ROUTES */

                    if (
                        selectedTab === "routes"
                    ) {

                        window.location.href =
                            "admin-routes.html";

                    }


                    /* BUS STOPS */

                    else if (
                        selectedTab === "busStops"
                    ) {

                        window.location.href =
                            "admin-bus-stops.html";

                    }


                    /* PASS PLANS */

                    else if (
                        selectedTab === "passPlans"
                    ) {

                        window.location.href =
                            "admin-pass-plans.html";

                    }

                }
            );

        }
    );


    /* =========================================
       BOTTOM NAVIGATION
    ========================================= */

    const homeNav =
        document.getElementById(
            "homeNav"
        );

    const applicationsNav =
        document.getElementById(
            "applicationsNav"
        );

    const managementNav =
        document.getElementById(
            "managementNav"
        );

    const moreNav =
        document.getElementById(
            "moreNav"
        );


    /* HOME */

    if (homeNav) {

        homeNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-dashboard.html";

            }
        );

    }


    /* APPLICATIONS */

    if (applicationsNav) {

        applicationsNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-applications.html";

            }
        );

    }


    /* MANAGEMENT */

    if (managementNav) {

        managementNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-routes.html";

            }
        );

    }


    /* MORE */

    if (moreNav) {

        moreNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-profile.html";

            }
        );

    }


    /* =========================================
       MENU BUTTON
    ========================================= */

    const menuButton =
        document.getElementById(
            "menuButton"
        );


    if (menuButton) {

        menuButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-profile.html";

            }
        );

    }


    /* =========================================
       TOAST MESSAGE FUNCTION
    ========================================= */

    function showToast(
        message,
        type = "success"
    ) {

        if (
            !toastMessage ||
            !toastText
        ) {

            return;

        }


        toastText.textContent =
            message;


        if (toastIcon) {

            /* ERROR */

            if (type === "error") {

                toastIcon.className =
                    "fa-solid fa-circle-exclamation";

                toastIcon.style.color =
                    "#ef6262";

            }


            /* INFO */

            else if (type === "info") {

                toastIcon.className =
                    "fa-solid fa-circle-info";

                toastIcon.style.color =
                    "#5d48c0";

            }


            /* SUCCESS */

            else {

                toastIcon.className =
                    "fa-solid fa-circle-check";

                toastIcon.style.color =
                    "#36a86b";

            }

        }


        toastMessage.classList.add(
            "show"
        );


        /*
           Previous toast timer clear
        */

        clearTimeout(
            window.passPlanToastTimer
        );


        /*
           2.8 seconds taruvatha toast hide
        */

        window.passPlanToastTimer =
            setTimeout(
                function () {

                    toastMessage.classList.remove(
                        "show"
                    );

                },
                2800
            );

    }


    /* =========================================
       ESC KEY CLOSE MODALS
    ========================================= */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                if (
                    planModal &&
                    planModal.classList.contains(
                        "show"
                    )
                ) {

                    closePlanModal();

                }


                if (
                    deleteModal &&
                    deleteModal.classList.contains(
                        "show"
                    )
                ) {

                    deletingPlan = null;

                    deleteModal.classList.remove(
                        "show"
                    );

                }

            }

        }
    );


    /* =========================================
       INITIALIZE APPLICATION
    ========================================= */

    initializeExistingPlans();

    loadPassPlans();

});
