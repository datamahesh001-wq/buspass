// Show the persisted decision from MySQL, including after the browser is closed
// and opened again. localStorage is not used as the decision source.
document.addEventListener("DOMContentLoaded", async () => {
    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    if (!user?.id) return;
    let decision = "";
    try {
        const response = await fetch(`http://localhost:5000/api/history?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" });
        const result = await response.json();
        if (response.ok && result.success) {
            const applicationId = String(localStorage.getItem("applicationId") || "");
            const matching = result.history.find(app => String(app.application_id) === applicationId);
            const latest = matching || result.history.find(app => ["approved", "rejected"].includes(String(app.application_status).toLowerCase()));
            decision = String(latest?.application_status || "").toLowerCase();
        }
    } catch (error) {
        console.warn("Could not refresh application decision:", error);
    }
    if (decision !== "rejected") return;
    setTimeout(() => {
        const pill = document.getElementById("statusPill");
        const title = document.getElementById("progressTitle");
        const count = document.getElementById("progressCount");
        const icon = document.querySelector(".status-icon i");
        const nextTitle = document.getElementById("nextTitle");
        const nextText = document.getElementById("nextText");
        if (pill) { pill.className = "status-pill rejected"; pill.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Rejected'; }
        if (title) title.textContent = "Application needs attention";
        if (count) count.textContent = "—";
        if (icon) icon.className = "fa-solid fa-circle-xmark";
        if (nextTitle) nextTitle.textContent = "Your application was not approved.";
        if (nextText) nextText.textContent = "Please review your submitted details and documents, then contact the Transport Office or submit a fresh application.";
    }, 80);
});
