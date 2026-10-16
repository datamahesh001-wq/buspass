// ======================================
// BusPass Dashboard JavaScript
// ======================================

const API_BASE = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", function () {

    // ==================================
    // Welcome User (account holder name)
    // ==================================

    const savedUser = localStorage.getItem("loggedInUser");
    const user = savedUser ? JSON.parse(savedUser) : null;

    // Not logged in - send to login screen first

    if (!user || !user.id) {

        window.location.href = "../login.html";

        return;

    }

    // Name used while creating the account

    const username =
        user.full_name ||
        user.fullname ||
        user.name ||
        "User";

    const welcomeText = document.getElementById("headerUserName");

    if (welcomeText) {
        welcomeText.textContent = username;
    }

    loadPassStatus();


    // ==================================
    // Bottom Navigation
    // ==================================

    const navLinks = document.querySelectorAll(".bottom-nav a");

    navLinks.forEach(link => {

        link.addEventListener("click", function () {

            navLinks.forEach(item => {
                item.classList.remove("active-nav");
            });

            this.classList.add("active-nav");

        });

    });


    // ==================================
    // Quick Action Animation
    // ==================================

    const boxes = document.querySelectorAll(".box");

    boxes.forEach(box => {

        // Desktop hover
        box.addEventListener("mouseenter", function () {

            this.style.transform = "translateY(-3px)";

        });

        box.addEventListener("mouseleave", function () {

            this.style.transform = "translateY(0)";

        });

        // Mobile touch
        box.addEventListener("touchstart", function () {

            this.style.transform = "scale(0.97)";

        }, { passive: true });

        box.addEventListener("touchend", function () {

            this.style.transform = "scale(1)";

        }, { passive: true });

    });


    // ==================================
    // Side Menu (slide-in from left)
    // ==================================

    const sideMenu = document.getElementById("sideMenu");
    const menuOverlay = document.getElementById("menuOverlay");
    const sideMenuClose = document.getElementById("sideMenuClose");
    const sideMenuLogout = document.getElementById("sideMenuLogout");
    const sideMenuHelpline = document.getElementById("sideMenuHelpline");

    // Drawer lo signed-in user name

    const sideMenuUserName = document.getElementById("sideMenuUserName");
    if (sideMenuUserName) sideMenuUserName.textContent = username;

    function openSideMenu() {
        if (sideMenu) sideMenu.classList.add("open");
        if (menuOverlay) menuOverlay.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    function closeSideMenu() {
        if (sideMenu) sideMenu.classList.remove("open");
        if (menuOverlay) menuOverlay.classList.remove("show");
        document.body.style.overflow = "";
    }

    const menuBtn = document.querySelector(".menu-btn");

    if (menuBtn) menuBtn.addEventListener("click", openSideMenu);
    if (sideMenuClose) sideMenuClose.addEventListener("click", closeSideMenu);
    if (menuOverlay) menuOverlay.addEventListener("click", closeSideMenu);

    // Menu links (navigation) -> menu close + active mark

    document.querySelectorAll(".side-link[data-nav]").forEach(link => {

        link.addEventListener("click", function () {

            document.querySelectorAll(".side-link").forEach(item => {
                item.classList.remove("active");
            });

            this.classList.add("active");

            closeSideMenu();

        });

    });

    // Menu Helpline -> helpline popup

    function showHelpline() {

        showPopup(
            "info",
            "APSRTC Helpline",
            "Passenger Helpline\n0866 257 0005\n\nAvailable 24/7 for pass and travel support."
        );

    }

    if (sideMenuHelpline) {

        sideMenuHelpline.addEventListener("click", function () {

            closeSideMenu();

            showHelpline();

        });

    }

    // Menu Logout -> confirm + logout

    if (sideMenuLogout) {

        sideMenuLogout.addEventListener("click", function () {

            closeSideMenu();

            logout();

        });

    }


    // ==================================
    // Passenger Information actions
    // ==================================

    const supportItem = document.querySelector('[data-service="support"]');

    if (supportItem) {

        supportItem.addEventListener("click", function () {

            showPopup(
                "info",
                "Passenger Support",
                "Need help with your bus pass?\n\nCall APSRTC helpline 0866 257 0005 or visit your nearest RTC customer care counter."
            );

        });

    }

    const routeItem = document.querySelector('[data-service="route"]');

    if (routeItem) {

        routeItem.addEventListener("click", function () {

            showPopup(
                "info",
                "Route Assistance",
                "Find your nearest bus stop or plan your journey.\n\nView the route map or call 0866 257 0005 for help."
            );

        });

    }


    // ==================================
    // Helpline card action (call)
    // ==================================

    const helplineCard = document.getElementById("helplineCard");

    if (helplineCard) {

        helplineCard.addEventListener("click", function () {

            showConfirm(
                "Call Helpline",
                "Call APSRTC Passenger Helpline 0866 257 0005?",
                function () {

                    window.location.href = "tel:08662570005";

                },
                { okText: "Call Now", cancelText: "Cancel" }
            );

        });

    }


    // ==================================
    // Keyboard support (accessibility)
    // ==================================

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") closeSideMenu();

    });

    document.querySelectorAll(".service-item.clickable, .helpline-card.clickable").forEach(item => {

        item.addEventListener("keydown", function (event) {

            if (event.key === "Enter" || event.key === " ") {

                event.preventDefault();

                item.click();

            }

        });

    });


    // ==================================
    // Restore Button
    // ==================================

    const restoreBtn = document.querySelector(".restore-btn");

    if (restoreBtn) {

        restoreBtn.addEventListener("click", function () {

            showPopup(
                "info",
                "Bus Pass Status",
                "Your Bus Pass is already Active."
            );

        });

    }


    // ==================================
    // Current Date
    // ==================================

    const today = new Date();

    console.log("Today :", today.toDateString());

});


// ======================================
// Load Pass Status from Database
// ======================================

async function loadPassStatus() {

    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");

    if (!user || !user.id) {
        return;
    }

    const passTitle = document.getElementById("passTitle");
    const passSubtitle = document.getElementById("passSubtitle");
    const validFrom = document.getElementById("validFrom");
    const validTill = document.getElementById("validTill");
    const statusBadge = document.querySelector(".card-header .active");

    try {

        const response = await fetch(
            `${API_BASE}/api/history?userId=${encodeURIComponent(user.id)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) return;

        const history = result.history || [];

        // A paid application remains under review until an admin approves it.

        const activePass = history.find(app =>
            app.application_status === "approved" && app.payment_status === "success"
        ) || null;

        // Any application still in progress (draft)

        const draftPass = history.find(
            app => app.application_status === "draft"
        ) || null;
        const latestRejected = history.find(app => app.application_status === "rejected") || null;

        if (activePass) {

            if (passTitle) {
                passTitle.textContent = activePass.plan_name
                    ? `${activePass.pass_type_name} (${activePass.plan_name})`
                    : activePass.pass_type_name;
            }

            if (passSubtitle) {
                passSubtitle.textContent =
                    activePass.from_stop && activePass.to_stop
                        ? `${activePass.from_stop} → ${activePass.to_stop}`
                        : "Your bus pass is active";
            }

            const parseDashboardDate = value => {
                if (!value) return null;
                const raw = String(value).trim();
                const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
                const date = match ? new Date(`${match[1]}T00:00:00`) : new Date(raw);
                return Number.isNaN(date.getTime()) ? null : date;
            };
            const fromDate = parseDashboardDate(activePass.valid_from || activePass.payment_date || activePass.created_at);
            const toDate = parseDashboardDate(activePass.valid_to) || (fromDate
                ? new Date(fromDate.getTime() + ((Number(activePass.validity_days) || 30) - 1) * 86400000)
                : null);
            const storedPassStatus = String(activePass.pass_status || "active").toLowerCase();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const passStatus = ["cancelled", "inactive", "suspended"].includes(storedPassStatus)
                ? "Inactive"
                : storedPassStatus === "expired" || !toDate || toDate < today
                    ? "Expired"
                    : "Active";

            const dateFormat = new Intl.DateTimeFormat("en-IN", {
                day: "2-digit", month: "short", year: "numeric"
            });

            if (validFrom) {
                validFrom.textContent = fromDate ? dateFormat.format(fromDate) : "--";
            }

            if (validTill) {
                validTill.textContent = toDate ? dateFormat.format(toDate) : "--";
            }

            if (statusBadge) {
                statusBadge.className = passStatus === "Active" ? "active" : "inactive";
                statusBadge.innerHTML = passStatus === "Active"
                    ? '<i class="fa-solid fa-circle-check"></i> Active'
                    : passStatus === "Expired"
                        ? '<i class="fa-solid fa-circle-xmark"></i> Expired'
                        : '<i class="fa-solid fa-circle-xmark"></i> Inactive';
            }

        } else {

            if (passTitle) {
                passTitle.textContent = "No Active Pass";
            }

            if (passSubtitle) {
                passSubtitle.textContent = draftPass
                    ? "Application in progress - complete your payment"
                    : latestRejected
                        ? `Application rejected${latestRejected.rejection_reason ? `: ${latestRejected.rejection_reason}` : " — correct details and reapply"}`
                        : "Apply for a new bus pass";
            }

            if (validFrom) validFrom.textContent = "--";
            if (validTill) validTill.textContent = "--";

            if (statusBadge) {
                statusBadge.className = latestRejected && !draftPass ? "inactive rejected-status" : "inactive";
                statusBadge.innerHTML = latestRejected && !draftPass
                    ? '<i class="fa-solid fa-circle-xmark"></i> Rejected'
                    : '<i class="fa-solid fa-circle-xmark"></i> Inactive';
            }

        }

    } catch (error) {

        console.log("Could not load pass status:", error);

    }
}


// ======================================
// Logout Function
// ======================================

function logout() {

    showConfirm(
        "Logout",
        "Are you sure you want to logout?",
        function () {

            localStorage.removeItem("loggedInUser");

            window.location.href = "../login.html";

        }
    );

}
