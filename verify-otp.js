const email = sessionStorage.getItem("resetEmail");
const form = document.getElementById("otpForm");
const otpInput = document.getElementById("otp");
const message = document.getElementById("message");
const resend = document.getElementById("resend");

if (!email) window.location.href = "forgot-password.html";
otpInput.addEventListener("input", () => { otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6); });

async function sendOtp() {
    message.textContent = "Sending OTP...";
    try {
        const response = await fetch("http://localhost:5000/forgot-password/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        message.textContent = "A new OTP was sent.";
    } catch (error) { message.textContent = error.message || "Unable to resend OTP."; }
}

resend.addEventListener("click", event => { event.preventDefault(); sendOtp(); });
form.addEventListener("submit", async event => {
    event.preventDefault();
    if (otpInput.value.length !== 6) { message.textContent = "Enter the complete 6-digit OTP."; return; }
    try {
        const response = await fetch("http://localhost:5000/forgot-password/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp: otpInput.value }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        sessionStorage.setItem("resetToken", result.resetToken);
        window.location.href = "reset-password.html";
    } catch (error) { message.textContent = error.message || "Invalid or expired OTP."; }
});
