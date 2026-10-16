const email = sessionStorage.getItem("resetEmail");
const resetToken = sessionStorage.getItem("resetToken");
const form = document.getElementById("resetForm");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const message = document.getElementById("message");

if (!email || !resetToken) window.location.href = "forgot-password.html";
document.querySelectorAll("[data-toggle]").forEach(toggle => toggle.addEventListener("click", () => {
    const input = document.getElementById(toggle.dataset.toggle);
    input.type = input.type === "password" ? "text" : "password";
    toggle.classList.toggle("fa-eye");
    toggle.classList.toggle("fa-eye-slash");
}));

form.addEventListener("submit", async event => {
    event.preventDefault();
    const password = newPassword.value;
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        message.textContent = "Use 8+ characters with at least one letter and number.";
        return;
    }
    if (password !== confirmPassword.value) { message.textContent = "Passwords do not match."; return; }
    try {
        const response = await fetch("http://localhost:5000/forgot-password/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, resetToken, password }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        sessionStorage.removeItem("resetEmail");
        sessionStorage.removeItem("resetToken");
        showPopup(
            "success",
            "Password Reset",
            "Your password has been reset successfully! Please login with your new password.",
            { onOk: function () { window.location.href = "login.html"; } }
        );
    } catch (error) { message.textContent = error.message || "Unable to reset password."; }
});
