document.addEventListener("DOMContentLoaded", function () {

    /* =========================================
       GET ALL REQUIRED ELEMENTS
    ========================================= */

    const addRouteButton =
        document.getElementById("addRouteButton");

    const routeModal =
        document.getElementById("routeModal");

    const deleteModal =
        document.getElementById("deleteModal");

    const closeModalButton =
        document.getElementById("closeModalButton");

    const cancelRouteButton =
        document.getElementById("cancelRouteButton");

    const routeForm =
        document.getElementById("routeForm");

    const modalTitle =
        document.getElementById("modalTitle");

    const confirmDeleteButton =
        document.getElementById("confirmDeleteButton");

    const cancelDeleteButton =
        document.getElementById("cancelDeleteButton");

    const routeCount =
        document.getElementById("routeCount");

    const toastMessage =
        document.getElementById("toastMessage");

    const toastText =
        document.getElementById("toastText");

    const toastIcon =
        document.getElementById("toastIcon");

    const routeIdInput =
        document.getElementById("routeId");

    const fromLocationInput =
        document.getElementById("fromLocation");

    const toLocationInput =
        document.getElementById("toLocation");

    const routeDistanceInput =
        document.getElementById("routeDistance");

    const busTypeInput =
        document.getElementById("busType");

    const routesPanel =
        document.getElementById("routesPanel");

    const tabButtons =
        document.querySelectorAll(".route-tab");

    const tabPanels =
        document.querySelectorAll(".tab-panel");

    /* =========================================
       ROUTE DATA / PUBLICATION STATE
    ========================================= */

    function normalizeRoute(route) {
        if (!route || !route.id || !route.from || !route.to) return null;
        return {
            id: String(route.id).trim().toUpperCase(),
            from: String(route.from).trim(),
            to: String(route.to).trim(),
            distance: String(route.distance || '').trim(),
            busType: String(route.busType || '').trim(),
            // Older saved routes were already shown as Active, so preserve
            // their availability while adding an explicit publication state.
            status: String(route.status || 'published').toLowerCase() === 'unpublished' ? 'unpublished' : 'published',
            databaseId: route.databaseId || route.database_id || null
        };
    }

    function readAdminRoutes() {
        try {
            const parsed = JSON.parse(localStorage.getItem('adminRoutes') || '[]');
            return Array.isArray(parsed) ? parsed.map(normalizeRoute).filter(Boolean) : [];
        } catch (error) {
            console.error('Unable to read admin routes:', error);
            return [];
        }
    }

    function writeAdminRoutes(routes) {
        localStorage.setItem('adminRoutes', JSON.stringify(routes.map(normalizeRoute).filter(Boolean)));
    }

    function apiRoute(route) {
        return {
            id: String(route.routeCode || route.id || '').trim().toUpperCase(),
            from: String(route.fromStop || route.from || '').trim(),
            to: String(route.toStop || route.to || '').trim(),
            distance: String(route.distanceKm || route.distance || '').trim(),
            busType: String(route.busType || '').trim(),
            status: String(route.routeStatus || route.status || 'published').toLowerCase() === 'unpublished' ? 'unpublished' : 'published',
            databaseId: route.id || null
        };
    }

    async function syncRoutesToDatabase(routes) {
        const response = await fetch('/api/admin/routes', { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !Array.isArray(result.routes)) {
            throw new Error(result.message || 'Could not load routes from MySQL.');
        }
        const existing = result.routes;
        for (const route of routes) {
            const matchById = route.databaseId
                ? existing.find(item => String(item.id) === String(route.databaseId))
                : null;
            const matchByCode = existing.find(item => String(item.routeCode || '').toUpperCase() === String(route.id).toUpperCase());
            const match = matchById || matchByCode;
            const payload = { routeCode: route.id, fromStop: route.from, toStop: route.to, distanceKm: route.distance, busType: route.busType, routeStatus: route.status };
            const save = await fetch(match ? `/api/admin/routes/${match.id}` : '/api/admin/routes', {
                method: match ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const saved = await save.json().catch(() => ({}));
            if (!save.ok || !saved.success) throw new Error(saved.message || `Could not save route ${route.id}.`);
            route.databaseId = match?.id || saved.id || route.databaseId || null;
            const card = Array.from(document.querySelectorAll('.route-card')).find(item => item.dataset.route === route.id);
            if (card && route.databaseId) card.dataset.databaseId = String(route.databaseId);
        }
    }


    /* =========================================
       VARIABLES
    ========================================= */

    let editingRoute = null;

    let deletingRoute = null;


    /* =========================================
       LOAD SAVED ROUTES
    ========================================= */

    async function loadSavedRoutes() {
        const storedRoutes = localStorage.getItem('adminRoutes');

        try {
            const response = await fetch('/api/admin/routes', { cache: 'no-store' });
            const result = await response.json();
            if (response.ok && result.success && Array.isArray(result.routes)) {
                const savedRoutes = result.routes.map(apiRoute).map(normalizeRoute).filter(Boolean);
                writeAdminRoutes(savedRoutes);
                routesPanel.querySelectorAll('.route-card').forEach(card => card.remove());
                savedRoutes.forEach(createRouteCard);
                const emptyState = document.getElementById('routeEmptyState');
                if (emptyState) emptyState.hidden = savedRoutes.length > 0;
                updateRouteCount();
                return;
            }
        } catch (error) {
            console.warn('Could not load routes from MySQL:', error.message);
        }

        // Do not promote the static demo cards into real application data.
        // Admin-created routes are the only source of AP Routes.
        if (storedRoutes === null) {
            routesPanel.innerHTML = '';
            writeAdminRoutes([]);
            updateRouteCount();
            return;
        }

        const savedRoutes = readAdminRoutes();
        routesPanel.querySelectorAll('.route-card').forEach(card => card.remove());
        savedRoutes.forEach(createRouteCard);
        const emptyState = document.getElementById('routeEmptyState');
        if (emptyState) emptyState.hidden = savedRoutes.length > 0;
        updateRouteCount();
    }


    /* =========================================
       SAVE ROUTES
    ========================================= */

    async function saveRoutes() {
        const routeCards = document.querySelectorAll('.route-card');
        const routes = Array.from(routeCards).map(card => {
            const metaItems = card.querySelectorAll('.route-meta span');
            return {
                id: card.dataset.route,
                from: card.querySelector('.location.from span')?.textContent.trim() || '',
                to: card.querySelector('.location.to span')?.textContent.trim() || '',
                distance: getTextWithoutIcon(metaItems[0]),
                busType: getTextWithoutIcon(metaItems[1]),
                status: card.dataset.status === 'unpublished' ? 'unpublished' : 'published',
                databaseId: card.dataset.databaseId || null
            };
        });
        await syncRoutesToDatabase(routes);
        writeAdminRoutes(routes);
    }

    async function deleteRouteFromDatabase(routeIdentifier) {
        const response = await fetch('/api/admin/routes', { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || 'Could not load routes from MySQL.');
        const route = (result.routes || []).find(item => String(item.id) === String(routeIdentifier) ||
            String(item.routeCode).toUpperCase() === String(routeIdentifier).toUpperCase());
        if (!route) throw new Error('Route not found in MySQL.');
        const deleted = await fetch(`/api/admin/routes/${route.id}`, { method: 'DELETE' });
        const deletedResult = await deleted.json().catch(() => ({}));
        if (!deleted.ok || !deletedResult.success) throw new Error(deletedResult.message || 'Could not delete route from MySQL.');
    }


    /* =========================================
       GET TEXT WITHOUT ICON
    ========================================= */

    function getTextWithoutIcon(element) {

        let text = "";


        element.childNodes.forEach(
            function (node) {

                if (
                    node.nodeType ===
                    Node.TEXT_NODE
                ) {

                    text += node.textContent;

                }

            }
        );


        return text.trim();

    }


    /* =========================================
       UPDATE ROUTE COUNT
    ========================================= */

    function updateRouteCount() {

        const totalRoutes =
            document.querySelectorAll(
                ".route-card"
            ).length;


        if (routeCount) {

            routeCount.textContent =
                `${totalRoutes} Route${totalRoutes !== 1 ? "s" : ""}`;

        }

    }


    /* =========================================
       OPEN ADD ROUTE MODAL
    ========================================= */

    if (addRouteButton) {

        addRouteButton.addEventListener(
            "click",
            function () {

                editingRoute = null;

                routeForm.reset();

                modalTitle.textContent =
                    "Add New Route";

                routeModal.classList.add(
                    "show"
                );

            }
        );

    }


    /* =========================================
       CLOSE ROUTE MODAL
    ========================================= */

    function closeRouteModal() {

        routeModal.classList.remove(
            "show"
        );

        routeForm.reset();

        editingRoute = null;

    }


    if (closeModalButton) {

        closeModalButton.addEventListener(
            "click",
            closeRouteModal
        );

    }


    if (cancelRouteButton) {

        cancelRouteButton.addEventListener(
            "click",
            closeRouteModal
        );

    }


    /* =========================================
       ROUTE FORM SUBMIT
    ========================================= */

    if (routeForm) {

        routeForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const routeData = {

                    id:
                        routeIdInput.value
                        .trim()
                        .toUpperCase(),

                    from:
                        fromLocationInput.value
                        .trim(),

                    to:
                        toLocationInput.value
                        .trim(),

                    distance:
                        routeDistanceInput.value
                        .trim(),

                    busType:
                        busTypeInput.value,

                    status: editingRoute?.dataset.status === 'unpublished' ? 'unpublished' : 'published'

                };


                /* Validation */

                if (
                    !routeData.id ||
                    !routeData.from ||
                    !routeData.to ||
                    !routeData.busType
                ) {

                    showToast(
                        "Please fill all route details.",
                        "error"
                    );

                    return;

                }

                const distanceKm = Number.parseFloat(routeData.distance);
                if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
                    showToast("Enter a valid distance in KM.", "error");
                    return;
                }
                routeData.distance = String(distanceKm);


                /* Same location validation */

                if (
                    routeData.from
                    .toLowerCase() ===
                    routeData.to
                    .toLowerCase()
                ) {

                    showToast(
                        "From and To locations cannot be the same.",
                        "error"
                    );

                    return;

                }


                const successMessage = editingRoute ? "Route updated successfully!" : "New route added successfully!";

                /* EDIT ROUTE */

                if (editingRoute) {

                    const oldRouteId =
                        editingRoute.dataset.route;


                    /*
                       Route ID duplicate check
                    */

                    const duplicateRoute =
                        document.querySelector(
                            `.route-card[data-route="${routeData.id}"]`
                        );


                    if (
                        duplicateRoute &&
                        duplicateRoute !==
                        editingRoute
                    ) {

                        showToast(
                            "This Route ID already exists.",
                            "error"
                        );

                        return;

                    }


                    updateRouteCard(
                        editingRoute,
                        routeData
                    );


                }


                /* ADD ROUTE */

                else {

                    const existingRoute =
                        document.querySelector(
                            `.route-card[data-route="${routeData.id}"]`
                        );


                    if (existingRoute) {

                        showToast(
                            "This Route ID already exists.",
                            "error"
                        );

                        return;

                    }


                    createRouteCard(
                        routeData
                    );
                    const emptyState = document.getElementById('routeEmptyState');
                    if (emptyState) emptyState.hidden = true;


                }

                try {
                    await saveRoutes();
                } catch (error) {
                    await loadSavedRoutes();
                    showToast(error.message || 'Could not save route to MySQL.', 'error');
                    return;
                }

                showToast(successMessage, 'success');

                updateRouteCount();

                closeRouteModal();

            }
        );

    }


    /* =========================================
       CREATE ROUTE CARD
    ========================================= */

    function createRouteCard(route) {

        const routeCard =
            document.createElement(
                "article"
            );


        routeCard.className =
            "route-card";


        routeCard.dataset.route =
            route.id;
        if (route.databaseId) routeCard.dataset.databaseId = route.databaseId;
        routeCard.dataset.status =
            route.status === 'unpublished' ? 'unpublished' : 'published';


        routeCard.innerHTML =
            `
            <div class="route-card-top">

                <div class="route-id-section">

                    <div class="route-icon">

                        <i class="fa-solid fa-bus"></i>

                    </div>


                    <div>

                        <span class="route-id">
                            ${route.id}
                        </span>


                        <span class="route-status">

                            <i class="fa-solid fa-circle"></i>

                            ${routeCard.dataset.status === 'unpublished' ? 'Unpublished' : 'Published'}

                        </span>

                    </div>

                </div>


                <div class="route-actions">

                    <button
                        class="edit-route-btn"
                        type="button"
                        aria-label="Edit Route"
                    >

                        <i class="fa-solid fa-pen"></i>

                    </button>



                    <button
                        class="delete-route-btn"
                        type="button"
                        aria-label="Delete Route"
                    >

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            </div>


            <div class="route-line">

                <div class="location from">

                    <i class="fa-solid fa-location-dot"></i>

                    <span>
                        ${route.from}
                    </span>

                </div>


                <div class="route-arrow">

                    <span></span>

                    <i class="fa-solid fa-arrow-right"></i>

                    <span></span>

                </div>


                <div class="location to">

                    <i class="fa-solid fa-location-dot"></i>

                    <span>
                        ${route.to}
                    </span>

                </div>

            </div>


            <div class="route-meta">

                <span>

                    <i class="fa-solid fa-ruler-horizontal"></i>

                    ${route.distance}

                </span>


                <span>

                    <i class="fa-solid fa-bus-simple"></i>

                    ${route.busType}

                </span>

            </div>
            `;


        routesPanel.appendChild(
            routeCard
        );


        attachRouteActions(
            routeCard
        );

    }


    /* =========================================
       UPDATE ROUTE CARD
    ========================================= */

    function updateRouteCard(
        routeCard,
        route
    ) {

        routeCard.dataset.route =
            route.id;
        routeCard.dataset.status =
            route.status === 'unpublished' ? 'unpublished' : 'published';


        routeCard.querySelector(
            ".route-id"
        ).textContent =
            route.id;


        routeCard.querySelector(
            ".location.from span"
        ).textContent =
            route.from;


        routeCard.querySelector(
            ".location.to span"
        ).textContent =
            route.to;

        const statusEl = routeCard.querySelector('.route-status');
        if (statusEl) statusEl.innerHTML = `<i class="fa-solid fa-circle"></i> ${routeCard.dataset.status === 'unpublished' ? 'Unpublished' : 'Published'}`;


        const metaItems =
            routeCard.querySelectorAll(
                ".route-meta span"
            );


        metaItems[0].innerHTML =
            `
            <i class="fa-solid fa-ruler-horizontal"></i>
            ${route.distance}
            `;


        metaItems[1].innerHTML =
            `
            <i class="fa-solid fa-bus-simple"></i>
            ${route.busType}
            `;

    }


    /* =========================================
       ATTACH EDIT / DELETE ACTIONS
    ========================================= */

    function attachRouteActions(routeCard) {

        const editButton =
            routeCard.querySelector(
                ".edit-route-btn"
            );


        const deleteButton =
            routeCard.querySelector(
                ".delete-route-btn"
            );


        /* Edit */

        if (editButton) {

            editButton.addEventListener(
                "click",
                function () {

                    openEditModal(
                        routeCard
                    );

                }
            );

        }


        /* Delete */

        if (deleteButton) {

            deleteButton.addEventListener(
                "click",
                function () {

                    deletingRoute =
                        routeCard;


                    deleteModal.classList.add(
                        "show"
                    );

                }
            );

        }

    }


    /* =========================================
       OPEN EDIT MODAL
    ========================================= */

    function openEditModal(routeCard) {

        editingRoute =
            routeCard;


        modalTitle.textContent =
            "Edit Route";


        routeIdInput.value =
            routeCard.dataset.route;


        fromLocationInput.value =
            routeCard.querySelector(
                ".location.from span"
            ).textContent.trim();


        toLocationInput.value =
            routeCard.querySelector(
                ".location.to span"
            ).textContent.trim();


        const metaItems =
            routeCard.querySelectorAll(
                ".route-meta span"
            );


        routeDistanceInput.value =
            getTextWithoutIcon(
                metaItems[0]
            );


        busTypeInput.value =
            getTextWithoutIcon(
                metaItems[1]
            );


        routeModal.classList.add(
            "show"
        );

    }


    /* =========================================
       INITIAL ROUTE ACTIONS
    ========================================= */

    function initializeExistingRoutes() {

        const existingRoutes =
            document.querySelectorAll(
                ".route-card"
            );


        existingRoutes.forEach(
            function (routeCard) {

                attachRouteActions(
                    routeCard
                );

            }
        );

    }


    /* =========================================
       DELETE CONFIRMATION
    ========================================= */

    if (cancelDeleteButton) {

        cancelDeleteButton.addEventListener(
            "click",
            function () {

                deletingRoute = null;

                deleteModal.classList.remove(
                    "show"
                );

            }
        );

    }


    if (confirmDeleteButton) {

        confirmDeleteButton.addEventListener(
            "click",
            async function () {

                if (!deletingRoute) {

                    return;

                }


                const deletedRouteId =
                    deletingRoute.dataset.route;
                const deletedDatabaseId = deletingRoute.dataset.databaseId || deletedRouteId;


                try {
                    await deleteRouteFromDatabase(deletedDatabaseId);
                } catch (error) {
                    showToast(error.message || 'Could not delete route from MySQL.', 'error');
                    return;
                }

                deletingRoute.remove();
                deletingRoute = null;
                deleteModal.classList.remove('show');
                writeAdminRoutes(readAdminRoutes().filter(route => String(route.id) !== String(deletedRouteId)));

                const emptyState = document.getElementById('routeEmptyState');
                if (emptyState) emptyState.hidden = document.querySelectorAll('.route-card').length === 0;
                updateRouteCount();


                showToast(`${deletedRouteId} deleted successfully!`, 'success');

            }
        );

    }


    /* =========================================
       CLOSE MODALS WHEN CLICKING OVERLAY
    ========================================= */

    routeModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                routeModal
            ) {

                closeRouteModal();

            }

        }
    );


    deleteModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                deleteModal
            ) {

                deletingRoute = null;

                deleteModal.classList.remove(
                    "show"
                );

            }

        }
    );


    /* =========================================
       TAB SWITCHING
    ========================================= */

    tabButtons.forEach(
        function (tabButton) {

            tabButton.addEventListener(
                "click",
                function () {

                    const selectedTab =
                        this.dataset.tab;

                    /* Bus Stops and Pass Plans have their own live admin
                       screens. Open those screens instead of showing the
                       empty placeholder panels inside Route Management. */
                    if (selectedTab === "busStops") {
                        window.location.href = "admin-bus-stops.html";
                        return;
                    }

                    if (selectedTab === "passPlans") {
                        window.location.href = "admin-pass-plans.html";
                        return;
                    }


                    /*
                       Remove active state
                    */

                    tabButtons.forEach(
                        function (button) {

                            button.classList.remove(
                                "active"
                            );

                        }
                    );


                    tabPanels.forEach(
                        function (panel) {

                            panel.classList.remove(
                                "active"
                            );

                        }
                    );


                    /*
                       Activate selected tab
                    */

                    this.classList.add(
                        "active"
                    );


                    if (
                        selectedTab ===
                        "routes"
                    ) {

                        document
                            .getElementById(
                                "routesPanel"
                            )
                            .classList.add(
                                "active"
                            );

                    }


                    else if (
                        selectedTab ===
                        "busStops"
                    ) {

                        document
                            .getElementById(
                                "busStopsPanel"
                            )
                            .classList.add(
                                "active"
                            );

                    }


                    else if (
                        selectedTab ===
                        "passPlans"
                    ) {

                        document
                            .getElementById(
                                "passPlansPanel"
                            )
                            .classList.add(
                                "active"
                            );

                    }

                }
            );

        }
    );


    /* =========================================
       BOTTOM NAVIGATION
    ========================================= */

    const homeNav =
        document.getElementById("homeNav");

    const applicationsNav =
        document.getElementById(
            "applicationsNav"
        );

    const managementNav =
        document.getElementById(
            "managementNav"
        );

    const moreNav =
        document.getElementById("moreNav");


    /* Home */

    if (homeNav) {

        homeNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-dashboard.html";

            }
        );

    }


    /* Applications */

    if (applicationsNav) {

        applicationsNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-applications.html";

            }
        );

    }


    /* Management */

    if (managementNav) {

        managementNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-routes.html";

            }
        );

    }


    /* More */

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
       SHOW TOAST MESSAGE
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


        /*
           Change toast icon
        */

        if (toastIcon) {

            if (
                type === "error"
            ) {

                toastIcon.className =
                    "fa-solid fa-circle-exclamation";


                toastIcon.style.color =
                    "#ef6262";

            }


            else if (
                type === "info"
            ) {

                toastIcon.className =
                    "fa-solid fa-circle-info";


                toastIcon.style.color =
                    "#5a48bf";

            }


            else {

                toastIcon.className =
                    "fa-solid fa-circle-check";


                toastIcon.style.color =
                    "#3aa86c";

            }

        }


        toastMessage.classList.add(
            "show"
        );


        /*
           Clear previous timer
        */

        clearTimeout(
            window.routeToastTimer
        );


        /*
           Auto hide toast
        */

        window.routeToastTimer =
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
       INITIALIZE APPLICATION
    ========================================= */

    initializeExistingRoutes();



    loadSavedRoutes();

    updateRouteCount();

});
