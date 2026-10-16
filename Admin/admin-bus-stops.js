document.addEventListener("DOMContentLoaded", function () {

    /* =========================================
       GET ALL REQUIRED ELEMENTS
    ========================================= */

    const addBusStopButton =
        document.getElementById("addBusStopButton");

    const busStopModal =
        document.getElementById("busStopModal");

    const deleteModal =
        document.getElementById("deleteModal");

    const closeModalButton =
        document.getElementById("closeModalButton");

    const cancelBusStopButton =
        document.getElementById("cancelBusStopButton");

    const busStopForm =
        document.getElementById("busStopForm");

    const modalTitle =
        document.getElementById("modalTitle");

    const stopNameInput =
        document.getElementById("stopName");

    const stopLocationInput =
        document.getElementById("stopLocation");

    const routeNumbersInput =
        document.getElementById("routeNumbers");

    const confirmDeleteButton =
        document.getElementById("confirmDeleteButton");

    const cancelDeleteButton =
        document.getElementById("cancelDeleteButton");

    const busStopsPanel =
        document.getElementById("busStopsPanel");

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

    let editingStop = null;

    let deletingStop = null;

    async function syncBusStopsToDatabase(stops) {
        const response = await fetch('/api/admin/bus-stops', { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !Array.isArray(result.stops)) {
            throw new Error(result.message || 'Could not load bus stops from MySQL.');
        }
        const existing = result.stops;
        for (const stop of stops) {
                const originalId = String(stop.id || '');
                const numericId = /^\d+$/.test(originalId) ? originalId : '';
                const matchById = numericId ? existing.find(item => String(item.id) === numericId) : null;
                const matchByName = existing.find(item => String(item.name).trim().toLowerCase() === String(stop.name).trim().toLowerCase());
                const match = matchById || matchByName;
                const payload = { name: stop.name, location: stop.location, routes: stop.routes };
                const save = await fetch(match ? `/api/admin/bus-stops/${match.id}` : '/api/admin/bus-stops', {
                    method: match ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                const saved = await save.json().catch(() => ({}));
                if (!save.ok || !saved.success) throw new Error(saved.message || `Could not save bus stop ${stop.name}.`);
                stop.id = match?.id || saved.id || stop.id;
                const card = Array.from(document.querySelectorAll('.bus-stop-card')).find(item =>
                    String(item.dataset.stopId || '') === originalId ||
                    String(item.querySelector('h3')?.textContent || '').trim().toLowerCase() === String(stop.name || '').trim().toLowerCase()
                );
                if (card && stop.id) card.dataset.stopId = String(stop.id);
        }
    }

    async function deleteBusStopFromDatabase(stopIdentifier) {
        const response = await fetch('/api/admin/bus-stops', { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || 'Could not load bus stops from MySQL.');
        const stop = (result.stops || []).find(item =>
                String(item.id) === String(stopIdentifier) ||
                String(item.name).trim().toLowerCase() === String(stopIdentifier).trim().toLowerCase()
            );
        if (!stop) throw new Error('Bus stop not found in MySQL.');
        const deleted = await fetch(`/api/admin/bus-stops/${stop.id}`, { method: 'DELETE' });
        const deletedResult = await deleted.json().catch(() => ({}));
        if (!deleted.ok || !deletedResult.success) throw new Error(deletedResult.message || 'Could not delete bus stop from MySQL.');
    }


    /* =========================================
       OPEN ADD BUS STOP MODAL
    ========================================= */

    if (addBusStopButton) {

        addBusStopButton.addEventListener(
            "click",
            function () {

                editingStop = null;

                busStopForm.reset();

                modalTitle.textContent =
                    "Add Bus Stop";

                busStopModal.classList.add(
                    "show"
                );

            }
        );

    }


    /* =========================================
       CLOSE BUS STOP MODAL
    ========================================= */

    function closeBusStopModal() {

        busStopModal.classList.remove(
            "show"
        );

        busStopForm.reset();

        editingStop = null;

    }


    if (closeModalButton) {

        closeModalButton.addEventListener(
            "click",
            closeBusStopModal
        );

    }


    if (cancelBusStopButton) {

        cancelBusStopButton.addEventListener(
            "click",
            closeBusStopModal
        );

    }


    /* =========================================
       CREATE BUS STOP CARD
    ========================================= */

    function createBusStopCard(stop) {

        const busStopCard =
            document.createElement("article");

        busStopCard.className =
            "bus-stop-card";

        busStopCard.dataset.stopId =
            stop.id;


        /*
           Location text optional kabatti
           conditional ga create chestunnam
        */

        const locationHTML =
            stop.location
                ? `<p>${stop.location}</p>`
                : "";


        busStopCard.innerHTML =
            `
            <div class="bus-stop-details">

                <h3>
                    ${stop.name}
                </h3>

                ${locationHTML}

                <div class="stop-route">

                    <i class="fa-solid fa-route"></i>

                    <span>
                        ${stop.routes}
                    </span>

                </div>

            </div>


            <div class="stop-actions">

                <button
                    class="edit-stop-btn"
                    type="button"
                    aria-label="Edit Bus Stop"
                >

                    <i class="fa-solid fa-pen"></i>

                </button>


                <button
                    class="delete-stop-btn"
                    type="button"
                    aria-label="Delete Bus Stop"
                >

                    <i class="fa-solid fa-trash"></i>

                </button>

            </div>
            `;


        busStopsPanel.appendChild(
            busStopCard
        );


        attachBusStopActions(
            busStopCard
        );

    }


    /* =========================================
       UPDATE BUS STOP CARD
    ========================================= */

    function updateBusStopCard(
        busStopCard,
        stop
    ) {

        busStopCard.dataset.stopId =
            stop.id;


        busStopCard.querySelector(
            "h3"
        ).textContent =
            stop.name;


        /*
           Existing location element
        */

        let locationElement =
            busStopCard.querySelector(
                ".bus-stop-details p"
            );


        /*
           Location exists
        */

        if (stop.location) {

            if (!locationElement) {

                locationElement =
                    document.createElement("p");

                const routeElement =
                    busStopCard.querySelector(
                        ".stop-route"
                    );


                busStopCard
                    .querySelector(
                        ".bus-stop-details"
                    )
                    .insertBefore(
                        locationElement,
                        routeElement
                    );

            }


            locationElement.textContent =
                stop.location;

        }


        /*
           Location empty
        */

        else {

            if (locationElement) {

                locationElement.remove();

            }

        }


        /*
           Update route numbers
        */

        busStopCard.querySelector(
            ".stop-route span"
        ).textContent =
            stop.routes;

    }


    /* =========================================
       ADD / EDIT FORM SUBMIT
    ========================================= */

    if (busStopForm) {

        busStopForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const stopName =
                    stopNameInput.value.trim();

                const stopLocation =
                    stopLocationInput.value.trim();

                const routeNumbers =
                    routeNumbersInput.value.trim();


                /* Validation */

                if (!stopName) {

                    showToast(
                        "Please enter bus stop name.",
                        "error"
                    );

                    stopNameInput.focus();

                    return;

                }


                if (!routeNumbers) {

                    showToast(
                        "Please enter route numbers.",
                        "error"
                    );

                    routeNumbersInput.focus();

                    return;

                }


                /*
                   Duplicate bus stop check
                */

                const allBusStops =
                    document.querySelectorAll(
                        ".bus-stop-card"
                    );


                let duplicateFound =
                    false;


                allBusStops.forEach(
                    function (card) {

                        const existingName =
                            card
                                .querySelector("h3")
                                .textContent
                                .trim()
                                .toLowerCase();


                        if (
                            existingName ===
                            stopName.toLowerCase() &&
                            card !== editingStop
                        ) {

                            duplicateFound =
                                true;

                        }

                    }
                );


                if (duplicateFound) {

                    showToast(
                        "This bus stop already exists.",
                        "error"
                    );

                    return;

                }


                /* =================================
                   EDIT BUS STOP
                ================================== */

                if (editingStop) {

                    const stopData = {

                        id:
                            editingStop.dataset.stopId,

                        name:
                            stopName,

                        location:
                            stopLocation,

                        routes:
                            routeNumbers

                    };


                    updateBusStopCard(
                        editingStop,
                        stopData
                    );


                    var successMessage = "Bus stop updated successfully!";

                }


                /* =================================
                   ADD NEW BUS STOP
                ================================== */

                else {

                    const newStopData = {

                        id:
                            "stop_" +
                            Date.now(),

                        name:
                            stopName,

                        location:
                            stopLocation,

                        routes:
                            routeNumbers

                    };


                    createBusStopCard(
                        newStopData
                    );


                    var successMessage = "New bus stop added successfully!";

                }


                try {
                    await saveBusStops();
                } catch (error) {
                    await loadBusStops();
                    showToast(error.message || 'Could not save bus stop to MySQL.', 'error');
                    return;
                }

                showToast(successMessage, 'success');

                closeBusStopModal();

            }
        );

    }


    /* =========================================
       ATTACH EDIT / DELETE ACTIONS
    ========================================= */

    function attachBusStopActions(
        busStopCard
    ) {

        const editButton =
            busStopCard.querySelector(
                ".edit-stop-btn"
            );

        const deleteButton =
            busStopCard.querySelector(
                ".delete-stop-btn"
            );


        /* EDIT */

        if (editButton) {

            editButton.addEventListener(
                "click",
                function () {

                    openEditBusStopModal(
                        busStopCard
                    );

                }
            );

        }


        /* DELETE */

        if (deleteButton) {

            deleteButton.addEventListener(
                "click",
                function () {

                    deletingStop =
                        busStopCard;


                    deleteModal.classList.add(
                        "show"
                    );

                }
            );

        }

    }


    /* =========================================
       OPEN EDIT BUS STOP MODAL
    ========================================= */

    function openEditBusStopModal(
        busStopCard
    ) {

        editingStop =
            busStopCard;


        modalTitle.textContent =
            "Edit Bus Stop";


        /*
           Fill existing data
        */

        stopNameInput.value =
            busStopCard
                .querySelector("h3")
                .textContent
                .trim();


        const locationElement =
            busStopCard.querySelector(
                ".bus-stop-details p"
            );


        stopLocationInput.value =
            locationElement
                ? locationElement
                    .textContent
                    .trim()
                : "";


        routeNumbersInput.value =
            busStopCard
                .querySelector(
                    ".stop-route span"
                )
                .textContent
                .trim();


        busStopModal.classList.add(
            "show"
        );

    }


    /* =========================================
       DELETE BUS STOP
    ========================================= */

    if (confirmDeleteButton) {

        confirmDeleteButton.addEventListener(
            "click",
            async function () {

                if (!deletingStop) {

                    return;

                }


                const deletedStopName =
                    deletingStop
                        .querySelector("h3")
                        .textContent
                        .trim();
                const deletedStopId = deletingStop.dataset.stopId || deletedStopName;


                try {
                    await deleteBusStopFromDatabase(deletedStopId);
                } catch (error) {
                    showToast(error.message || 'Could not delete bus stop from MySQL.', 'error');
                    return;
                }

                deletingStop.remove();
                deletingStop = null;
                deleteModal.classList.remove('show');
                const remainingStops = Array.from(document.querySelectorAll('.bus-stop-card')).map(card => ({
                    id: card.dataset.stopId || '', name: card.querySelector('h3')?.textContent.trim() || '',
                    location: card.querySelector('.bus-stop-details p')?.textContent.trim() || '',
                    routes: card.querySelector('.stop-route span')?.textContent.trim() || ''
                }));
                localStorage.setItem('adminBusStops', JSON.stringify(remainingStops));


                showToast(`${deletedStopName} deleted successfully!`, 'success');

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

                deletingStop = null;

                deleteModal.classList.remove(
                    "show"
                );

            }
        );

    }


    /* =========================================
       CLOSE MODALS ON OVERLAY CLICK
    ========================================= */

    if (busStopModal) {

        busStopModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    busStopModal
                ) {

                    closeBusStopModal();

                }

            }
        );

    }


    if (deleteModal) {

        deleteModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    deleteModal
                ) {

                    deletingStop = null;

                    deleteModal.classList.remove(
                        "show"
                    );

                }

            }
        );

    }


    /* =========================================
       INITIALIZE EXISTING BUS STOP ACTIONS
    ========================================= */

    function initializeExistingBusStops() {

        const existingStops =
            document.querySelectorAll(
                ".bus-stop-card"
            );


        existingStops.forEach(
            function (busStopCard) {

                attachBusStopActions(
                    busStopCard
                );

            }
        );

    }


    /* =========================================
       SAVE BUS STOPS TO LOCAL STORAGE
    ========================================= */

    async function saveBusStops() {

        const busStopCards =
            document.querySelectorAll(
                ".bus-stop-card"
            );


        const busStops = [];


        busStopCards.forEach(
            function (card) {

                const name =
                    card
                        .querySelector("h3")
                        .textContent
                        .trim();


                const locationElement =
                    card.querySelector(
                        ".bus-stop-details p"
                    );


                const location =
                    locationElement
                        ? locationElement
                            .textContent
                            .trim()
                        : "";


                const routes =
                    card
                        .querySelector(
                            ".stop-route span"
                        )
                        .textContent
                        .trim();


                busStops.push({

                    id:
                        card.dataset.stopId,

                    name:
                        name,

                    location:
                        location,

                    routes:
                        routes

                });

            }
        );


        await syncBusStopsToDatabase(busStops);
        localStorage.setItem("adminBusStops", JSON.stringify(busStops));

    }


    /* =========================================
       LOAD BUS STOPS FROM LOCAL STORAGE
    ========================================= */

    async function loadBusStops() {
        try {
            const response = await fetch('/api/admin/bus-stops', { cache: 'no-store' });
            const result = await response.json();
            if (response.ok && result.success && Array.isArray(result.stops)) {
                if (result.stops.length === 0 && localStorage.getItem("adminBusStops") === null && busStopsPanel.querySelector(".bus-stop-card")) {
                    // On first use, preserve the existing starter stop cards and save them to MySQL.
                    try { await saveBusStops(); }
                    catch (error) { showToast(error.message || 'Could not save starter bus stops to MySQL.', 'error'); }
                    return;
                }
                localStorage.setItem('adminBusStops', JSON.stringify(result.stops));
                busStopsPanel.innerHTML = '';
                result.stops.forEach(createBusStopCard);
                return;
            }
        } catch (error) {
            console.warn('Could not load bus stops from MySQL:', error.message);
        }

        const savedBusStops =
            localStorage.getItem(
                "adminBusStops"
            );


        if (!savedBusStops) {

            /*
               First time load.
               Existing HTML data ni save chestham.
            */

            return;

        }


        const busStops =
            JSON.parse(
                savedBusStops
            );


        /*
           Existing cards clear chestham
        */

        busStopsPanel.innerHTML = "";


        /*
           Saved stops create chestham
        */

        busStops.forEach(
            function (stop) {

                createBusStopCard(
                    stop
                );

            }
        );
        // Cached rows remain viewable when the API is temporarily unavailable;
        // edits still require a successful MySQL response before being saved.

    }


    /* =========================================
       TAB NAVIGATION
    ========================================= */

    tabButtons.forEach(
        function (tabButton) {

            tabButton.addEventListener(
                "click",
                function () {

                    const selectedTab =
                        this.dataset.tab;


                    /*
                       Active class remove
                    */

                    tabButtons.forEach(
                        function (button) {

                            button.classList.remove(
                                "active"
                            );

                        }
                    );


                    /*
                       Current tab active
                    */

                    this.classList.add(
                        "active"
                    );


                    /*
                       Routes screen
                    */

                    if (
                        selectedTab ===
                        "routes"
                    ) {

                        window.location.href =
                            "admin-routes.html";

                    }


                    /*
                       Bus Stops screen
                    */

                    else if (
                        selectedTab ===
                        "busStops"
                    ) {

                        window.location.href =
                            "admin-bus-stops.html";

                    }


                    /*
                       Pass Plans screen
                    */

                    else if (
                        selectedTab ===
                        "passPlans"
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
       TOAST MESSAGE
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

            /*
               Error
            */

            if (
                type === "error"
            ) {

                toastIcon.className =
                    "fa-solid fa-circle-exclamation";

                toastIcon.style.color =
                    "#ef6262";

            }


            /*
               Information
            */

            else if (
                type === "info"
            ) {

                toastIcon.className =
                    "fa-solid fa-circle-info";

                toastIcon.style.color =
                    "#5d48c0";

            }


            /*
               Success
            */

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
           Clear old timer
        */

        clearTimeout(
            window.busStopToastTimer
        );


        /*
           Auto hide toast
        */

        window.busStopToastTimer =
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
       ESC KEY MODAL CLOSE
    ========================================= */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                if (
                    busStopModal.classList.contains(
                        "show"
                    )
                ) {

                    closeBusStopModal();

                }


                if (
                    deleteModal.classList.contains(
                        "show"
                    )
                ) {

                    deletingStop = null;

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

    initializeExistingBusStops();

    loadBusStops();

});
