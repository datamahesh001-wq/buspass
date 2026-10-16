(() => {
    const loginPath = "login.html";
    const redirectDelay = 4200;
    const clock = document.getElementById("splashTime");
    const loadingText = document.getElementById("loadingText");

    function updateClock() {
        if (clock) {
            clock.textContent = new Intl.DateTimeFormat([], {
                hour: "numeric",
                minute: "2-digit"
            }).format(new Date());
        }
    }

    updateClock();
    window.setInterval(updateClock, 1000);

    window.setTimeout(() => {
        if (loadingText) loadingText.textContent = "Your journey is ready...";
    }, 2800);

    window.setTimeout(() => {
        window.location.href = loginPath;
    }, redirectDelay);
})();
