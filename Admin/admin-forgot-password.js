document.getElementById("resetForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const email = document.getElementById("resetEmail");
    const error = document.getElementById("emailError");
    const success = document.getElementById("successMessage");
    const button = document.getElementById("resetButton");
    const value = email.value.trim();

    error.textContent = "";
    success.textContent = "";
    if (!/^\S+@\S+\.\S+$/.test(value)) {
        error.textContent = "Please enter a valid admin email address.";
        email.focus();
        return;
    }
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    setTimeout(function () {
        success.textContent = "Reset link sent to " + value + ". Please check your inbox.";
        button.disabled = false;
        button.innerHTML = 'Send reset link <i class="fa-solid fa-paper-plane"></i>';
        document.getElementById("resetForm").reset();
    }, 700);
});
