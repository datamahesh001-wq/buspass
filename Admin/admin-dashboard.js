document.addEventListener("DOMContentLoaded", function () {

    const dashboardProfileImage = document.getElementById("adminDashboardProfileImage");
    const dashboardProfileInitials = document.getElementById("adminDashboardProfileInitials");
    try {
        const savedProfile = JSON.parse(localStorage.getItem("adminProfile") || "null");
        if (savedProfile?.profileImage && dashboardProfileImage) {
            dashboardProfileImage.src = savedProfile.profileImage;
            dashboardProfileImage.hidden = false;
            if (dashboardProfileInitials) dashboardProfileInitials.hidden = true;
        }
    } catch (error) {
        console.warn("Could not load admin profile photo:", error);
    }

    /* =====================================================
       DATE
       ===================================================== */

    const currentDateElement =
        document.getElementById("currentDate");

    if (currentDateElement) {

        const date = new Date();

        currentDateElement.textContent =
            date.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long"
            });
    }


    /* =====================================================
       MONEY FORMAT
       ===================================================== */

    function formatMoney(amount) {

        return "₹" + Number(amount || 0).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        );
    }

    // The MySQL-backed dashboard response is the single source of truth.
    // A successful response is also retained only as a last-known snapshot so
    // a temporary API outage never makes real stored data look like zero.
    const DASHBOARD_SNAPSHOT_KEY = "adminDashboardSnapshot";

    function isSubmittedApplication(application) {
        return ['paid', 'approved', 'rejected', 'completed'].includes(String(application?.status || '').toLowerCase());
    }

    function saveDashboardSnapshot(data) {
        try {
            localStorage.setItem(DASHBOARD_SNAPSHOT_KEY, JSON.stringify({
                savedAt: new Date().toISOString(),
                summary: data.summary || {},
                applications: (Array.isArray(data.applications) ? data.applications : []).filter(isSubmittedApplication)
            }));
        } catch (error) {
            console.warn("Could not save dashboard snapshot:", error);
        }
    }

    function getDashboardSnapshot() {
        try {
            const snapshot = JSON.parse(localStorage.getItem(DASHBOARD_SNAPSHOT_KEY) || "null");
            return snapshot && snapshot.summary && Array.isArray(snapshot.applications)
                ? { summary: snapshot.summary, applications: snapshot.applications.filter(isSubmittedApplication) }
                : null;
        } catch (error) {
            return null;
        }
    }


    /* =====================================================
       STATUS LABEL
       ===================================================== */

    function statusLabel(status) {

        const normalized =
            String(status || "pending").toLowerCase();

        if (
            normalized === "paid" ||
            normalized === "draft"
        ) {
            return "Pending";
        }

        return normalized.charAt(0).toUpperCase()
            + normalized.slice(1);
    }


    /* =====================================================
       RENDER DASHBOARD
       ===================================================== */

    function renderDashboard(data) {

        const summary = data.summary || {};


        const totalApplications =
            document.getElementById("totalApplications");

        const pendingApplications =
            document.getElementById("pendingApplications");

        const pendingCount =
            document.getElementById("pendingCount");

        const approvedApplications =
            document.getElementById("approvedApplications");

        const totalRevenue =
            document.getElementById("totalRevenue");


        if (totalApplications) {

            totalApplications.textContent =
                Number(
                    summary.totalApplications || 0
                ).toLocaleString("en-IN");
        }


        if (pendingApplications) {

            pendingApplications.textContent =
                Number(
                    summary.pendingApplications || 0
                ).toLocaleString("en-IN");
        }


        if (pendingCount) {

            pendingCount.textContent =
                Number(
                    summary.pendingApplications || 0
                ).toLocaleString("en-IN");
        }


        if (approvedApplications) {

            approvedApplications.textContent =
                Number(
                    summary.approvedApplications || 0
                ).toLocaleString("en-IN");
        }


        if (totalRevenue) {

            totalRevenue.textContent =
                formatMoney(summary.totalRevenue);
        }


        /* =================================================
           APPLICATION LIST
           ================================================= */

        const list =
            document.getElementById("applicationList");

        if (!list) return;


        const applications = (Array.isArray(data.applications) ? data.applications : []).filter(isSubmittedApplication);


        list.innerHTML = applications.map(function (application) {

            const rawStatus =
                String(
                    application.status || "pending"
                ).toLowerCase();


            const status =
                rawStatus === "paid" ||
                rawStatus === "draft"
                    ? "pending"
                    : rawStatus;


            const createdAt =
                new Date(
                    application.createdAt || Date.now()
                );


            const when =
                createdAt.toDateString() ===
                new Date().toDateString()

                    ? "Today"

                    : createdAt.toLocaleDateString(
                        "en-IN",
                        {
                            day: "2-digit",
                            month: "short"
                        }
                    );


            return `
                <button
                    class="application-item"
                    type="button"
                    data-id="${application.applicationId || ""}"
                >

                    <span class="application-avatar">
                        <i class="fa-solid fa-user"></i>
                    </span>


                    <span class="application-details">

                        <h3>
                            ${application.fullName || "Citizen application"}
                        </h3>

                        <p>
                            ${application.applicantId || application.applicationId || ""}
                        </p>

                        <span>
                            ${application.passType || "Bus Pass"}
                        </span>

                    </span>


                    <span class="application-status">

                        <b class="status ${status}">
                            ${statusLabel(application.status)}
                        </b>

                        <small>
                            ${when}
                        </small>

                    </span>


                    <i class="fa-solid fa-chevron-right application-arrow"></i>

                </button>
            `;

        }).join("");

        const recentEmpty = document.getElementById("recentEmpty");
        if (recentEmpty) {
            recentEmpty.style.display = applications.length ? "none" : "flex";
        }


        /* =================================================
           APPLICATION CLICK
           ================================================= */

        document
            .querySelectorAll(".application-item")
            .forEach(function (item) {

                item.addEventListener(
                    "click",
                    function () {

                        const applicationId =
                            item.dataset.id;


                        if (applicationId) {

                            localStorage.setItem(
                                "selectedApplicationId",
                                applicationId
                            );
                        }


                        window.location.href =
                            `application-details.html?applicationId=${encodeURIComponent(String(applicationId))}`;
                    }
                );

            });
    }


    /* =====================================================
       LOAD DASHBOARD
       ===================================================== */

    async function loadDashboard(showFeedback) {

        try {

            const response = await fetch(
                "http://localhost:5000/api/admin/dashboard"
            );


            if (!response.ok) {
                throw new Error("Dashboard API unavailable");
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || "Dashboard API error");
            }

            saveDashboardSnapshot(data);
            renderDashboard(data);


            if (showFeedback) {

                showToast(
                    "Live dashboard data refreshed",
                    "success"
                );
            }

        } catch (error) {

            console.log("Dashboard API unavailable:", error);

            // Even if a dashboard aggregate query fails, keep the Admin Home
            // application list connected to the persistent MySQL application feed.
            let applicationFeed = null;
            try {
                const feedResponse = await fetch("http://localhost:5000/api/admin/applications", {
                    cache: "no-store",
                    headers: { "Accept": "application/json" }
                });
                if (feedResponse.ok) {
                    const feed = await feedResponse.json();
                    if (feed.success && Array.isArray(feed.applications)) {
                        applicationFeed = feed.applications.filter(isSubmittedApplication);
                    }
                }
            } catch (feedError) {
                console.log("Admin application feed unavailable:", feedError);
            }

            const snapshot = getDashboardSnapshot();
            if (snapshot) {
                renderDashboard(applicationFeed ? { ...snapshot, applications: applicationFeed } : snapshot);
            } else if (applicationFeed) {
                renderDashboard({
                    summary: {
                        totalApplications: null,
                        pendingApplications: null,
                        approvedApplications: null,
                        totalRevenue: null
                    },
                    applications: applicationFeed
                });
                ["totalApplications", "pendingApplications", "pendingCount", "approvedApplications"].forEach(id => {
                    const node = document.getElementById(id);
                    if (node) node.textContent = "—";
                });
                const revenue = document.getElementById("totalRevenue");
                if (revenue) revenue.textContent = "₹—";
            } else {
                // No successful data has ever been loaded in this browser.
                // Do not display zero values because an API failure is not proof
                // that the database contains zero records.
                renderDashboard({
                    summary: {
                        totalApplications: null,
                        pendingApplications: null,
                        approvedApplications: null,
                        totalRevenue: null
                    },
                    applications: []
                });
                ["totalApplications", "pendingApplications", "pendingCount", "approvedApplications"].forEach(id => {
                    const node = document.getElementById(id);
                    if (node) node.textContent = "—";
                });
                const revenue = document.getElementById("totalRevenue");
                if (revenue) revenue.textContent = "₹—";
            }

            if (showFeedback) {
                showToast(
                    snapshot ? "Showing the last saved dashboard data while the server reconnects." : "Dashboard data is temporarily unavailable.",
                    "info"
                );
            }
        }
    }


    /* =====================================================
       LEFT ADMINISTRATION DRAWER
       ===================================================== */

    const appContainer = document.querySelector(".app-container");
    const menuButton = document.getElementById("menuButton");
    const drawerClose = document.getElementById("drawerClose");
    const drawerBackdrop = document.getElementById("drawerBackdrop");
    const adminDrawer = document.getElementById("adminDrawer");

    function setDrawer(open) {
        if (!appContainer || !menuButton || !adminDrawer) return;

        appContainer.classList.toggle("drawer-open", open);
        menuButton.setAttribute("aria-expanded", String(open));
        adminDrawer.setAttribute("aria-hidden", String(!open));
    }

    if (menuButton) {
        menuButton.addEventListener("click", function () {
            setDrawer(true);
        });
    }

    if (drawerClose) {
        drawerClose.addEventListener("click", function () {
            setDrawer(false);
        });
    }

    if (drawerBackdrop) {
        drawerBackdrop.addEventListener("click", function () {
            setDrawer(false);
        });
    }

    document.getElementById("drawerLogout")?.addEventListener("click", function () {
        // Keep saved application data intact; only end the administrator session.
        sessionStorage.removeItem("adminAuthenticated");
        localStorage.removeItem("adminAuthenticated");
        window.location.href = "admin-login.html";
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") setDrawer(false);
    });


    /* =====================================================
       NORMAL DATA-GO BUTTONS
       ===================================================== */

    document
        .querySelectorAll("[data-go]")
        .forEach(function (control) {

            control.addEventListener(
                "click",
                function () {

                    const target =
                        control.dataset.go;


                    if (target) {

                        window.location.href =
                            target;
                    }
                }
            );
        });


    /* =====================================================
       REVIEW NOW
       ===================================================== */

    const reviewButton =
        document.getElementById("reviewButton");

    if (reviewButton) {

        reviewButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-applications.html";
            }
        );
    }


    /* =====================================================
       ADMIN PROFILE
       ===================================================== */

    const adminProfileButton =
        document.getElementById("adminProfileButton");

    if (adminProfileButton) {

        adminProfileButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-profile.html";
            }
        );
    }


    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    const notificationButton =
        document.getElementById("notificationButton");

    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            function () {

                showToast(
                    "New citizen applications are awaiting review.",
                    "info"
                );

            }
        );
    }


    /* =====================================================
       REFRESH
       ===================================================== */

    const refreshButton =
        document.getElementById("refreshButton");

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            function () {

                loadDashboard(true);

            }
        );
    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(message, type) {

        const oldToast =
            document.querySelector(".admin-toast");


        if (oldToast) {

            oldToast.remove();
        }


        const toast =
            document.createElement("div");


        toast.className =
            "admin-toast " + type;


        toast.innerHTML = `
            <i class="fa-solid ${
                type === "success"
                    ? "fa-circle-check"
                    : "fa-circle-info"
            }"></i>

            <span>
                ${message}
            </span>
        `;


        const container =
            document.querySelector(".app-container");


        if (!container) return;


        container.appendChild(toast);


        setTimeout(
            function () {

                toast.classList.add("show");

            },
            20
        );


        setTimeout(
            function () {

                toast.classList.remove("show");


                setTimeout(
                    function () {

                        toast.remove();

                    },
                    250
                );

            },
            2800
        );
    }


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    loadDashboard(false);

    // Keep every dashboard count current as users submit applications, make
    // payments, or receive an admin decision in another browser session.
    window.setInterval(function () {
        if (!document.hidden) loadDashboard(false);
    }, 5000);

});
