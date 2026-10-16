// =====================================================
// GET ELEMENTS
// =====================================================

const loginForm = document.getElementById("loginForm");

const usernameInput = document.getElementById("username");

const passwordInput = document.getElementById("password");

const usernameError = document.getElementById("usernameError");

const passwordError = document.getElementById("passwordError");

const togglePassword = document.getElementById("togglePassword");

const signupBtn = document.getElementById("signupBtn");

const forgotPassword = document.getElementById("forgotPassword");

const popupOverlay = document.getElementById("popupOverlay");

const popupIcon = document.getElementById("popupIcon");

const popupTitle = document.getElementById("popupTitle");

const popupMessage = document.getElementById("popupMessage");

const popupButton = document.getElementById("popupButton");

const loginClock = document.getElementById("loginClock");

function clearLoginFields() {
    usernameInput.value = "";
    passwordInput.value = "";
}

clearLoginFields();
window.addEventListener("pageshow", clearLoginFields);

function updateLoginClock() {
    if (loginClock) {
        loginClock.textContent = new Intl.DateTimeFormat([], {
            hour: "numeric",
            minute: "2-digit"
        }).format(new Date());
    }
}

updateLoginClock();
setInterval(updateLoginClock, 1000);

forgotPassword.addEventListener("click", function (event) {
    event.preventDefault();
    window.location.href = "forgot-password.html";
});


// =====================================================
// PASSWORD SHOW / HIDE
// =====================================================

togglePassword.addEventListener("click", function () {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        this.classList.remove("fa-eye-slash");

        this.classList.add("fa-eye");

    } else {

        passwordInput.type = "password";

        this.classList.remove("fa-eye");

        this.classList.add("fa-eye-slash");

    }

    const isVisible = passwordInput.type === "text";
    this.setAttribute("title", isVisible ? "Hide password" : "Show password");
    this.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");

});

togglePassword.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.click();
    }
});


// =====================================================
// CLEAR ERROR
// =====================================================

function clearErrors() {

    usernameError.textContent = "";

    passwordError.textContent = "";

    usernameInput.closest(".input-box")
        .classList.remove("error");

    passwordInput.closest(".input-box")
        .classList.remove("error");

}


// =====================================================
// SHOW USERNAME ERROR
// =====================================================

function showUsernameError(message) {

    usernameError.textContent = message;

    usernameInput.closest(".input-box")
        .classList.add("error");

}


// =====================================================
// SHOW PASSWORD ERROR
// =====================================================

function showPasswordError(message) {

    passwordError.textContent = message;

    passwordInput.closest(".input-box")
        .classList.add("error");

}


// =====================================================
// VALIDATE USERNAME TYPE
// =====================================================
//
// Accept:
// 1. Email
// 2. Mobile number
// 3. Student ID
//
// Reject:
// abc
// hello
// test@
// 123abc
// etc.
// =====================================================

function validateUsername(value) {

    // EMAIL
    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    // MOBILE - Indian 10 digit
    const mobilePattern =
        /^[6-9][0-9]{9}$/;


    // STUDENT ID
    // Example:
// STU12345
// STUDENT123
// AP123456
    const studentIdPattern =
        /^(STU|STUDENT|AP)[0-9]{3,}$/i;


    if (emailPattern.test(value)) {

        return "email";

    }


    if (mobilePattern.test(value)) {

        return "mobile";

    }


    if (studentIdPattern.test(value)) {

        return "student";

    }


    return null;
}


// =====================================================
// LOGIN FORM
// =====================================================

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    clearErrors();


    const username =
        usernameInput.value.trim();


    const userPassword =
        passwordInput.value;
    

    // =================================================
    // EMPTY USERNAME
    // =================================================

    if (username === "") {

        showUsernameError(
            "Please enter Student ID, Email or Mobile Number."
        );

        usernameInput.focus();

        return;
    }


    // =================================================
    // USERNAME FORMAT
    // =================================================

    const usernameType =
        validateUsername(username);


    if (!usernameType) {

        showUsernameError(
            "Enter a valid Student ID, Email or 10-digit Mobile Number."
        );

        usernameInput.focus();

        return;
    }


    // =================================================
    // EMPTY PASSWORD
    // =================================================

    if (userPassword === "") {

        showPasswordError(
            "Please enter your password."
        );

        passwordInput.focus();

        return;
    }


    // =================================================
    // PASSWORD LENGTH
    // =================================================

    if (userPassword.length < 6) {

        showPasswordError(
            "Password must contain at least 6 characters."
        );

        passwordInput.focus();

        return;
    }


    try {

        const response = await fetch("http://localhost:5000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                identifier: username,
                password: userPassword
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            showPopup(
                "error",
                "Login Failed!",
                data.message || "Invalid login details."
            );
            return;
        }

        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(data.user)
        );

        localStorage.setItem(
            "username",
            data.user.full_name || data.user.fullname || data.user.name
        );

        showPopup(
            "success",
            "Login Successful!",
            "Welcome to BusPass."
        );

    } catch (error) {

        console.error("Login request failed:", error);

    }

});


// =====================================================
// POPUP FUNCTION
// =====================================================

function showPopup(type, title, message) {

    popupOverlay.classList.add("show");

    popupTitle.textContent = title;

    popupMessage.textContent = message;


    if (type === "success") {

        popupIcon.className = "popup-icon";

        popupIcon.innerHTML =
            '<i class="fa-solid fa-check"></i>';

    } else {

        popupIcon.className =
            "popup-icon error";

        popupIcon.innerHTML =
            '<i class="fa-solid fa-xmark"></i>';

    }

}


// =====================================================
// POPUP OK BUTTON
// =====================================================

popupButton.addEventListener("click", function () {

    popupOverlay.classList.remove("show");


    // If login was successful,
    // go to dashboard after clicking OK.

    if (
        popupTitle.textContent ===
        "Login Successful!"
    ) {

        window.location.href =
            "home/dashboard.html";

    }

});


// =====================================================
// CLOSE POPUP WHEN CLICKING OUTSIDE
// =====================================================

popupOverlay.addEventListener("click", function (event) {

    if (event.target === popupOverlay) {

        popupOverlay.classList.remove("show");

    }

});


// =====================================================
// SIGN UP
// =====================================================

signupBtn.addEventListener("click", function () {

    window.location.href = "signup.html";

});


// =====================================================
// FORGOT PASSWORD
// =====================================================

forgotPassword.addEventListener("click", function (event) {

    event.preventDefault();

    showPopup(
        "error",
        "Forgot Password",
        "Please contact BusPass support to reset your password."
    );

});