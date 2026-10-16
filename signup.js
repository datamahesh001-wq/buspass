const signupForm = document.getElementById("signupForm");


/* =========================
   SHOW / HIDE PASSWORD
========================= */

function togglePassword(inputId, button) {

    const input = document.getElementById(inputId);
    const icon = button.querySelector("i");


    if (input.type === "password") {

        input.type = "text";

        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");

    } else {

        input.type = "password";

        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");

    }

    const isVisible = input.type === "text";

    button.setAttribute(
        "title",
        isVisible ? "Hide password" : "Show password"
    );

    button.setAttribute(
        "aria-label",
        isVisible ? "Hide password" : "Show password"
    );
}


document.querySelectorAll("[data-toggle]").forEach(button => {

    const toggle = () =>
        togglePassword(button.dataset.toggle, button);

    button.addEventListener("click", toggle);

    button.addEventListener("keydown", event => {

        if (event.key === "Enter" || event.key === " ") {

            event.preventDefault();

            toggle();
        }

    });

});


/* =========================
   FULL NAME
   LETTERS + SPACE ONLY
========================= */

const fullNameInput = document.getElementById("fullName");


/* Block numbers and special characters while typing */

fullNameInput.addEventListener("keydown", function (event) {

    const key = event.key;

    const allowedKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
        "Tab"
    ];

    if (allowedKeys.includes(key)) {
        return;
    }

    /* Allow only A-Z, a-z and Space */

    if (!/^[A-Za-z ]$/.test(key)) {

        event.preventDefault();

    }

});


/* Remove numbers and special characters from input/paste */

fullNameInput.addEventListener("input", function () {

    this.value = this.value.replace(/[^A-Za-z ]/g, "");

});


/* =========================
   MOBILE NUMBER
========================= */

const mobileInput = document.getElementById("mobile");

mobileInput.addEventListener("input", function () {

    this.value = this.value.replace(/[^0-9]/g, "");

});


/* =========================
   FORM SUBMIT
========================= */

signupForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    const fullName =
        document.getElementById("fullName").value.trim();

    const mobile =
        document.getElementById("mobile").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const dob =
        document.getElementById("dob").value;

    const password =
        document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const terms =
        document.getElementById("terms").checked;


    /* Full Name */

    if (fullName === "") {

        showPopup(
            "error",
            "Name Required",
            "Please enter your full name."
        );

        return;
    }


    /* Mobile */

    if (mobile.length !== 10) {

        showPopup(
            "error",
            "Invalid Mobile Number",
            "Please enter a valid 10-digit mobile number."
        );

        return;
    }


    /* Email */

    if (email === "") {

        showPopup(
            "error",
            "Email Required",
            "Please enter your email address."
        );

        return;
    }


    /* Date of Birth */

    if (dob === "") {

        showPopup(
            "error",
            "Date of Birth Required",
            "Please select your date of birth."
        );

        return;
    }


    /* Password */

    if (password.length < 6) {

        showPopup(
            "error",
            "Weak Password",
            "Password must contain at least 6 characters."
        );

        return;
    }


    /* Confirm Password */

    if (password !== confirmPassword) {

        showPopup(
            "error",
            "Password Mismatch",
            "Password and Confirm Password do not match."
        );

        return;
    }


    /* Terms */

    if (!terms) {

        showPopup(
            "error",
            "Terms & Conditions",
            "Please agree to the Terms & Conditions."
        );

        return;
    }


    try {

        const response = await fetch(
            "http://localhost:5000/signup",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    fullname: fullName,
                    mobile,
                    email,
                    dob,
                    password
                })
            }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            showPopup(
                "error",
                "Registration Failed",
                data.message || "Registration failed."
            );

            return;
        }


        showPopup(
            "success",
            "Account Created!",
            "Account created successfully! Student ID: " + data.student_id,
            {
                onOk: function () {
                    window.location.href = "login.html";
                }
            }
        );


    } catch (error) {

        console.error(
            "Signup request failed:",
            error
        );

    }

});