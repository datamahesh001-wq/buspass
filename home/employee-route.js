const passType = "Employee Pass";

function getAdminManagedRoutes() {
    try {
        const routes = JSON.parse(localStorage.getItem("adminRoutes") || "[]");
        return Array.isArray(routes) ? routes.filter(route => route && route.from && route.to && String(route.status || "published").toLowerCase() !== "unpublished") : [];
    } catch { return []; }
}

function refreshDropdown(select) { if (typeof BP_CustomDropdown !== "undefined") BP_CustomDropdown.refresh(select); }

function populateToStops(from) {
    const toStop = document.getElementById("toStop");
    const destinations = [...new Set(getAdminManagedRoutes().filter(route => String(route.from).trim().toLowerCase() === String(from).trim().toLowerCase()).map(route => route.to))];
    fillSelectOptions(toStop, destinations, "Select To Stop");
    refreshDropdown(toStop);
    return destinations;
}

function selectRoute(from, to) {
    const fromStop = document.getElementById("fromStop");
    if (!Array.from(fromStop.options).some(option => option.value === from)) return false;
    fromStop.value = from;
    const destinations = populateToStops(from);
    if (!destinations.some(destination => String(destination).trim().toLowerCase() === String(to).trim().toLowerCase())) return false;
    document.getElementById("toStop").value = to;
    refreshDropdown(fromStop);
    refreshDropdown(document.getElementById("toStop"));
    return true;
}

function swapStops() {
    const from = document.getElementById("fromStop").value;
    const to = document.getElementById("toStop").value;
    if (from && to && !selectRoute(to, from)) {
        showPopup("error", "Reverse Route Unavailable", "The Transport Office has not added the reverse route yet.");
    }
}

function selectBusType(radio) {
    document.querySelectorAll(".bus-option").forEach(option => option.classList.remove("selected"));
    radio.closest(".bus-option").classList.add("selected");
}

function showEmployeeDetails() {
    const details = JSON.parse(localStorage.getItem("employeeDetails") || "{}");
    document.getElementById("organizationValue").textContent = details.organization || "Not available";
    document.getElementById("employeeIdValue").textContent = details.employeeId || "Not available";
    document.getElementById("designationValue").textContent = details.designation || "Not available";
}

function configureRoute() {
    document.title = `${passType} Route - Bus Pass Application`;
    document.querySelector(".header-content h2").textContent = passType;
    document.querySelector(".route-card h3").textContent = "Route Selection";
    document.querySelector(".route-card .subtitle").textContent = "Choose from routes published by the Transport Office";
    const labels = document.querySelectorAll(".field label");
    labels[0].textContent = "From";
    labels[1].textContent = "To";

    const fromStop = document.getElementById("fromStop");
    const toStop = document.getElementById("toStop");
    const routes = getAdminManagedRoutes();
    fillSelectOptions(fromStop, [...new Set(routes.map(route => route.from))], "Select From Stop");
    const savedRoute = JSON.parse(localStorage.getItem("employeeRoute") || "null");
    if (!routes.length) {
        toStop.disabled = true;
        showPopup("error", "No Admin Routes Available", "The Transport Office has not published any routes yet. Please try again later.");
    } else if (!savedRoute || !selectRoute(savedRoute.fromStop, savedRoute.toStop)) {
        populateToStops("");
    }

    if (typeof BP_CustomDropdown !== "undefined") {
        BP_CustomDropdown.attach(fromStop, { placeholder: "Select From Stop" });
        BP_CustomDropdown.attach(toStop, { placeholder: "Select To Stop" });
        refreshDropdown(fromStop);
        refreshDropdown(toStop);
    }
    fromStop.addEventListener("change", () => {
        const destinations = populateToStops(fromStop.value);
        toStop.disabled = !destinations.length;
        refreshDropdown(toStop);
    });
    if (savedRoute?.busType) {
        const radio = document.querySelector(`input[name="busType"][value="${savedRoute.busType}"]`);
        if (radio) { radio.checked = true; selectBusType(radio); }
    }
}

function goBack() { window.location.href = "empdoc-upload.html"; }

async function syncUploadedDocuments(applicationId) {
    return applicationId;
}

async function goNext() {
    const fromStop = document.getElementById("fromStop").value;
    const toStop = document.getElementById("toStop").value;
    const selectedBus = document.querySelector('input[name="busType"]:checked');
    const route = getAdminManagedRoutes().find(item => item.from === fromStop && item.to === toStop);
    if (!fromStop || !toStop || !selectedBus) { showPopup("error", "Route Missing", "Please select your route and bus type."); return; }
    if (!route) { showPopup("error", "Route Unavailable", "Please select a route published by the Transport Office."); return; }

    const routeData = { routeId: route.id || "", fromStop, toStop, busType: selectedBus.value, distance: route.distance || "", distanceKm: Number.parseFloat(route.distance) || 0 };
    const user = BPApplication.user();
    const applicationId = BPApplication.id() || localStorage.getItem("applicationId");

    try {
        const response = await fetch("http://localhost:5000/api/routes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user?.id, passType, fromStop, toStop, busType: selectedBus.value, applicationId })
        });
        const result = await response.json().catch(() => ({ success: false, message: "Could not save route." }));
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not save route.");
        }
        if (result.applicationId) localStorage.setItem("applicationId", String(result.applicationId));
    } catch (error) {
        showPopup("error", "Could Not Save Route", error.message);
        return;
    }

    localStorage.setItem("employeeRoute", JSON.stringify(routeData));
    BPApplication.update({ route: routeData, currentStep: "route", status: "Route Selected" });
    window.location.href = "employee-plan.html";
}

async function loadAdminRoutesFromDatabase() {
    try {
        const [availableResponse, adminResponse] = await Promise.all([
            fetch("http://localhost:5000/api/routes/available", { cache: "no-store" }),
            fetch("http://localhost:5000/api/admin/routes", { cache: "no-store" })
        ]);
        const [availableResult, adminResult] = await Promise.all([
            availableResponse.json().catch(() => ({})),
            adminResponse.json().catch(() => ({}))
        ]);
        const apiRoutes = [
            ...(availableResponse.ok && availableResult.success && Array.isArray(availableResult.routes) ? availableResult.routes : []),
            ...(adminResponse.ok && adminResult.success && Array.isArray(adminResult.routes) ? adminResult.routes : [])
        ];
        const mappedRoutes = apiRoutes
            .filter(route => {
                const from = route.from || route.fromStop;
                const to = route.to || route.toStop;
                return from && to && String(route.status || route.routeStatus || "published").toLowerCase() !== "unpublished";
            })
            .map(route => ({
                id: String(route.id || route.routeCode || ""),
                from: String(route.from || route.fromStop || "").trim(),
                to: String(route.to || route.toStop || "").trim(),
                distance: route.distance || route.distanceKm || "",
                distanceKm: Number(route.distanceKm || route.distance || 0),
                busType: route.busType || "",
                status: String(route.status || route.routeStatus || "published").toLowerCase() === "unpublished" ? "unpublished" : "published"
            }));
        // MySQL is the source of truth; localStorage is only a cache.
        const cachedRoutes = getAdminManagedRoutes();
        const mergedRoutes = [...mappedRoutes];
        cachedRoutes.forEach(cached => {
            const duplicate = mergedRoutes.some(route =>
                String(route.id || "").toLowerCase() === String(cached.id || "").toLowerCase()
                || (String(route.from).trim().toLowerCase() === String(cached.from).trim().toLowerCase()
                    && String(route.to).trim().toLowerCase() === String(cached.to).trim().toLowerCase())
            );
            if (!duplicate) mergedRoutes.push(cached);
        });
        localStorage.setItem("adminRoutes", JSON.stringify(mergedRoutes));
    } catch (error) {
        console.warn("Could not load routes from MySQL:", error.message);
    }
}

showEmployeeDetails();
configureRoute();

async function restoreApplicationRoute() {
    try {
        const app = await BPApplication.current();
        if (!app?.route?.fromStop) return;
        localStorage.setItem("employeeRoute", JSON.stringify(app.route));
        selectRoute(app.route.fromStop, app.route.toStop);
        const radio = document.querySelector(`input[name="busType"][value="${app.route.busType}"]`);
        if (radio) { radio.checked = true; selectBusType(radio); }
    } catch (error) { console.warn("Could not restore route:", error.message); }
}

async function initRouteScreen() {
    await loadAdminRoutesFromDatabase();
    configureRoute();
    await restoreApplicationRoute();
}
initRouteScreen();

window.addEventListener("storage", event => {
    if (event.key === "adminRoutes") window.location.reload();
});
