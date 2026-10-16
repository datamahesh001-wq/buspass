document.addEventListener("DOMContentLoaded", function () {

    /* ==========================================
       GET ALL REQUIRED ELEMENTS
    ========================================== */

    const loginForm = document.getElementById("adminLoginForm");

    const adminEmail = document.getElementById("adminEmail");

    const adminPassword = document.getElementById("adminPassword");

    const passwordToggle = document.getElementById("passwordToggle");

    const rememberAdmin = document.getElementById("rememberAdmin");

    const loginButton = document.querySelector(".login-btn");


    /* ==========================================
       REMEMBER ADMIN ID / EMAIL
    ========================================== */

    const savedAdmin = localStorage.getItem("rememberedAdmin");

    if (savedAdmin) {

        adminEmail.value = savedAdmin;

        rememberAdmin.checked = true;

    }


    /* ==========================================
       PASSWORD SHOW / HIDE
    ========================================== */

    passwordToggle.addEventListener("click", function () {

        const icon = passwordToggle.querySelector("i");

        if (adminPassword.type === "password") {

            adminPassword.type = "text";

            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");

            passwordToggle.setAttribute(
                "aria-label",
                "Hide Password"
            );

        } else {

            adminPassword.type = "password";

            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");

            passwordToggle.setAttribute(
                "aria-label",
                "Show Password"
            );

        }

    });


    /* ==========================================
       CREATE ERROR MESSAGE
    ========================================== */

    function showError(input, message) {

        removeError(input);

        const inputBox = input.closest(".input-box");

        const errorMessage = document.createElement("p");

        errorMessage.className = "error-message";

        errorMessage.textContent = message;

        inputBox.classList.add("input-error");

        inputBox.insertAdjacentElement(
            "afterend",
            errorMessage
        );

    }


    /* ==========================================
       REMOVE ERROR MESSAGE
    ========================================== */

    function removeError(input) {

        const inputBox = input.closest(".input-box");

        inputBox.classList.remove("input-error");

        const nextElement = inputBox.nextElementSibling;

        if (
            nextElement &&
            nextElement.classList.contains("error-message")
        ) {

            nextElement.remove();

        }

    }


    /* ==========================================
       CLEAR ALL ERRORS
    ========================================== */

    function clearAllErrors() {

        document
            .querySelectorAll(".error-message")
            .forEach(function (error) {

                error.remove();

            });


        document
            .querySelectorAll(".input-box")
            .forEach(function (box) {

                box.classList.remove("input-error");

            });

    }


    /* ==========================================
       EMAIL VALIDATION FUNCTION
    ========================================== */

    function isValidEmail(email) {

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        return emailPattern.test(email);

    }


    /* ==========================================
       REMOVE ERROR WHILE USER TYPES
    ========================================== */

    adminEmail.addEventListener("input", function () {

        removeError(adminEmail);

    });


    adminPassword.addEventListener("input", function () {

        removeError(adminPassword);

    });


    /* ==========================================
       LOGIN FORM SUBMIT
    ========================================== */

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        clearAllErrors();


        /* Get Input Values */

        const adminValue =
            adminEmail.value.trim();

        const passwordValue =
            adminPassword.value.trim();


        let isValid = true;


        /* ==========================================
           ADMIN ID / EMAIL VALIDATION
        ========================================== */

        if (adminValue === "") {

            showError(
                adminEmail,
                "Please enter your Admin ID or Email"
            );

            isValid = false;

        } else if (
            adminValue.includes("@") &&
            !isValidEmail(adminValue)
        ) {

            showError(
                adminEmail,
                "Please enter a valid email address"
            );

            isValid = false;

        }


        /* ==========================================
           PASSWORD VALIDATION
        ========================================== */

        if (passwordValue === "") {

            showError(
                adminPassword,
                "Please enter your password"
            );

            isValid = false;

        } else if (passwordValue.length < 6) {

            showError(
                adminPassword,
                "Password must contain at least 6 characters"
            );

            isValid = false;

        }


        /* ==========================================
           STOP IF VALIDATION FAILS
        ========================================== */

        if (!isValid) {

            return;

        }


        /* ==========================================
           REMEMBER ADMIN
        ========================================== */

        if (rememberAdmin.checked) {

            localStorage.setItem(
                "rememberedAdmin",
                adminValue
            );

        } else {

            localStorage.removeItem(
                "rememberedAdmin"
            );

        }


        /* ==========================================
           LOGIN BUTTON LOADING STATE
        ========================================== */

        const originalButtonContent =
            loginButton.innerHTML;

        loginButton.disabled = true;

        loginButton.innerHTML = `
            <span>Logging in...</span>
            <div class="login-arrow">
                <i class="fa-solid fa-spinner fa-spin"></i>
            </div>
        `;


        /* ==========================================
           TEMPORARY SUCCESS LOGIN
           
           NOTE:
           Backend connect chesina tarvata
           ee section ni API call tho replace
           cheyyali.
        ========================================== */

        setTimeout(function () {

            /* Redirect to Admin Dashboard */

            window.location.href =
                "admin-dashboard.html";

        }, 1200);


        /* Safety: Restore Button */

        setTimeout(function () {

            if (
                document.querySelector(
                    ".login-btn"
                )
            ) {

                loginButton.disabled = false;

                loginButton.innerHTML =
                    originalButtonContent;

            }

        }, 2500);

    });

});