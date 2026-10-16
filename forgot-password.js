const form = document.getElementById("emailForm");
const emailInput = document.getElementById("email");
const message = document.getElementById("message");

form.addEventListener("submit", async event => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        message.textContent = "Please enter a valid email address.";
        return;
    }
    message.textContent = "Sending OTP...";
    try {
        const response = await fetch("http://localhost:5000/forgot-password/request", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        if (result.developmentOtp) {
            message.textContent = `${result.message} OTP: ${result.developmentOtp}`;
        }
        sessionStorage.setItem("resetEmail", email);
        window.location.href = "verify-otp.html";
    } catch (error) { message.textContent = error.message || "Unable to send OTP."; }
});
