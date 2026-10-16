document.addEventListener("DOMContentLoaded", function () {

    /* =========================================
       GET ALL REQUIRED ELEMENTS
    ========================================= */

    const editProfileButton =
        document.getElementById("editProfileButton");

    const editProfileModal =
        document.getElementById("editProfileModal");

    const closeEditModal =
        document.getElementById("closeEditModal");

    const cancelEditButton =
        document.getElementById("cancelEditButton");

    const editProfileForm =
        document.getElementById("editProfileForm");


    const changePasswordButton =
        document.getElementById("changePasswordButton");

    const passwordModal =
        document.getElementById("passwordModal");

    const closePasswordModal =
        document.getElementById("closePasswordModal");

    const cancelPasswordButton =
        document.getElementById("cancelPasswordButton");

    const changePasswordForm =
        document.getElementById("changePasswordForm");


    const themeButton =
        document.getElementById("themeButton");

    const languageButton =
        document.getElementById("languageButton");

    const logoutButton =
        document.getElementById("logoutButton");

    const logoutConfirmModal = document.getElementById("logoutConfirmModal");
    const logoutCancelButton = document.getElementById("logoutCancelButton");
    const logoutConfirmButton = document.getElementById("logoutConfirmButton");

    const menuButton =
        document.getElementById("menuButton");

    const notificationButton =
        document.getElementById("notificationButton");

    const changePhotoButton =
        document.getElementById("changePhotoButton");

    const profileImage =
        document.getElementById("profileImage");


    /* Profile Display Elements */

    const adminName =
        document.getElementById("adminName");

    const adminEmail =
        document.getElementById("adminEmail");

    const adminPhone =
        document.getElementById("adminPhone");

    const fullNameValue =
        document.getElementById("fullNameValue");

    const emailValue =
        document.getElementById("emailValue");

    const mobileValue =
        document.getElementById("mobileValue");


    /* Form Fields */

    const editFullName =
        document.getElementById("editFullName");

    const editEmail =
        document.getElementById("editEmail");

    const editMobile =
        document.getElementById("editMobile");


    /* Theme and Language */

    const themeStatus =
        document.getElementById("themeStatus");

    const languageStatus =
        document.getElementById("languageStatus");


    /* Toast */

    const toastMessage =
        document.getElementById("toastMessage");

    const toastText =
        document.getElementById("toastText");

    const toastIcon =
        document.getElementById("toastIcon");


    /* =========================================
       DEFAULT PROFILE DATA
    ========================================= */

    const defaultProfile = {

        fullName: "Mahesh Admin",

        email: "admin@buspass.com",

        mobile: "+91 98765 43210",

        profileImage:
            "../image/buslogo1.png"

    };


    /* =========================================
       CURRENT PROFILE DATA
    ========================================= */

    let adminProfile =
        getSavedProfile();


    /* =========================================
       GET SAVED PROFILE
    ========================================= */

    function getSavedProfile() {

        const savedProfile =
            localStorage.getItem(
                "adminProfile"
            );


        if (!savedProfile) {

            return defaultProfile;

        }


        try {

            return JSON.parse(
                savedProfile
            );

        }

        catch (error) {

            console.error(
                "Profile loading error:",
                error
            );

            return defaultProfile;

        }

    }


    /* =========================================
       SAVE PROFILE
    ========================================= */

    function saveProfile() {

        localStorage.setItem(
            "adminProfile",
            JSON.stringify(adminProfile)
        );

    }


    /* =========================================
       DISPLAY PROFILE
    ========================================= */

    function displayProfile() {

        if (adminName) {

            adminName.textContent =
                adminProfile.fullName;

        }


        if (adminEmail) {

            adminEmail.textContent =
                adminProfile.email;

        }


        if (adminPhone) {

            adminPhone.textContent =
                adminProfile.mobile;

        }


        if (fullNameValue) {

            fullNameValue.textContent =
                adminProfile.fullName;

        }


        if (emailValue) {

            emailValue.textContent =
                adminProfile.email;

        }


        if (mobileValue) {

            mobileValue.textContent =
                adminProfile.mobile;

        }


        if (
            profileImage &&
            adminProfile.profileImage
        ) {

            profileImage.src =
                adminProfile.profileImage;

        }

    }


    /* =========================================
       OPEN EDIT PROFILE MODAL
    ========================================= */

    function openEditProfileModal() {

        if (!editProfileModal) {

            return;

        }


        editFullName.value =
            adminProfile.fullName;

        editEmail.value =
            adminProfile.email;

        editMobile.value =
            adminProfile.mobile;


        editProfileModal.classList.add(
            "show"
        );

    }


    if (editProfileButton) {

        editProfileButton.addEventListener(
            "click",
            openEditProfileModal
        );

    }


    /* =========================================
       CLOSE EDIT PROFILE MODAL
    ========================================= */

    function closeProfileModal() {

        if (editProfileModal) {

            editProfileModal.classList.remove(
                "show"
            );

        }

    }


    if (closeEditModal) {

        closeEditModal.addEventListener(
            "click",
            closeProfileModal
        );

    }


    if (cancelEditButton) {

        cancelEditButton.addEventListener(
            "click",
            closeProfileModal
        );

    }


    /* =========================================
       SAVE EDITED PROFILE
    ========================================= */

    if (editProfileForm) {

        editProfileForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const fullName =
                    editFullName.value.trim();

                const email =
                    editEmail.value.trim();

                const mobile =
                    editMobile.value.trim();


                /* Validation */

                if (fullName.length < 3) {

                    showToast(
                        "Please enter a valid full name.",
                        "error"
                    );

                    return;

                }


                if (!validateEmail(email)) {

                    showToast(
                        "Please enter a valid email address.",
                        "error"
                    );

                    return;

                }


                if (mobile.length < 10) {

                    showToast(
                        "Please enter a valid mobile number.",
                        "error"
                    );

                    return;

                }


                /* Update Profile */

                adminProfile.fullName =
                    fullName;

                adminProfile.email =
                    email;

                adminProfile.mobile =
                    mobile;


                saveProfile();

                displayProfile();

                closeProfileModal();


                showToast(
                    "Profile changes are saved in this browser only; MySQL account updates are not connected.",
                    "error"
                );

            }
        );

    }


    /* =========================================
       EMAIL VALIDATION
    ========================================= */

    function validateEmail(email) {

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        return emailPattern.test(email);

    }


    /* =========================================
       CHANGE PASSWORD MODAL
    ========================================= */

    function openPasswordModal() {

        if (!passwordModal) {

            return;

        }


        changePasswordForm.reset();

        passwordModal.classList.add(
            "show"
        );

    }


    if (changePasswordButton) {

        changePasswordButton.addEventListener(
            "click",
            openPasswordModal
        );

    }


    /* =========================================
       CLOSE PASSWORD MODAL
    ========================================= */

    function closePasswordChangeModal() {

        if (passwordModal) {

            passwordModal.classList.remove(
                "show"
            );

        }

    }


    if (closePasswordModal) {

        closePasswordModal.addEventListener(
            "click",
            closePasswordChangeModal
        );

    }


    if (cancelPasswordButton) {

        cancelPasswordButton.addEventListener(
            "click",
            closePasswordChangeModal
        );

    }


    /* =========================================
       PASSWORD CHANGE
    ========================================= */

    if (changePasswordForm) {

        changePasswordForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const currentPassword =
                    document
                        .getElementById(
                            "currentPassword"
                        )
                        .value;

                const newPassword =
                    document
                        .getElementById(
                            "newPassword"
                        )
                        .value;

                const confirmPassword =
                    document
                        .getElementById(
                            "confirmPassword"
                        )
                        .value;


                /* Validation */

                if (
                    currentPassword.length === 0
                ) {

                    showToast(
                        "Please enter your current password.",
                        "error"
                    );

                    return;

                }


                if (newPassword.length < 6) {

                    showToast(
                        "Password must contain at least 6 characters.",
                        "error"
                    );

                    return;

                }


                if (
                    newPassword !==
                    confirmPassword
                ) {

                    showToast(
                        "New passwords do not match.",
                        "error"
                    );

                    return;

                }


                if (
                    currentPassword ===
                    newPassword
                ) {

                    showToast(
                        "New password must be different.",
                        "error"
                    );

                    return;

                }


                showToast(
                    "Password was not changed: Admin sign-in is not connected to a database password update.",
                    "error"
                );
                return;

            }
        );

    }


    /* =========================================
       THEME SETTINGS
    ========================================= */

    function loadTheme() {

        const savedTheme =
            localStorage.getItem(
                "adminTheme"
            );


        if (
            savedTheme === "dark"
        ) {

            document.body.classList.add(
                "dark-theme"
            );

            if (themeStatus) {

                themeStatus.textContent =
                    "Dark Mode";

            }

        }

        else {

            if (themeStatus) {

                themeStatus.textContent =
                    "Light Mode";

            }

        }

    }


    if (themeButton) {

        themeButton.addEventListener(
            "click",
            function () {

                const isDark =
                    document.body.classList.toggle(
                        "dark-theme"
                    );


                if (isDark) {

                    localStorage.setItem(
                        "adminTheme",
                        "dark"
                    );

                    themeStatus.textContent =
                        "Dark Mode";


                    showToast(
                        "Dark mode enabled.",
                        "success"
                    );

                }

                else {

                    localStorage.setItem(
                        "adminTheme",
                        "light"
                    );

                    themeStatus.textContent =
                        "Light Mode";


                    showToast(
                        "Light mode enabled.",
                        "success"
                    );

                }

            }
        );

    }


    /* =========================================
       LANGUAGE SETTINGS
    ========================================= */

    if (languageButton) {

        languageButton.addEventListener(
            "click",
            function () {

                const currentLanguage =
                    localStorage.getItem(
                        "adminLanguage"
                    ) ||
                    "English (India)";


                let newLanguage;


                if (
                    currentLanguage ===
                    "English (India)"
                ) {

                    newLanguage =
                        "తెలుగు";

                }

                else {

                    newLanguage =
                        "English (India)";

                }


                localStorage.setItem(
                    "adminLanguage",
                    newLanguage
                );


                languageStatus.textContent =
                    newLanguage;


                showToast(
                    "Language preference updated.",
                    "success"
                );

            }
        );

    }


    /* =========================================
       LOAD LANGUAGE
    ========================================= */

    function loadLanguage() {

        const savedLanguage =
            localStorage.getItem(
                "adminLanguage"
            );


        if (
            savedLanguage &&
            languageStatus
        ) {

            languageStatus.textContent =
                savedLanguage;

        }

    }


    /* =========================================
       PROFILE PHOTO CHANGE
    ========================================= */

    const profilePhotoInput =
        document.getElementById("profilePhotoInput");

    if (changePhotoButton && profilePhotoInput) {

        changePhotoButton.addEventListener(
            "click",
            function () {
                profilePhotoInput.click();
            }
        );

        profilePhotoInput.addEventListener(
            "change",
            function () {
                const file = profilePhotoInput.files?.[0];

                if (!file) {
                    return;
                }

                if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
                    showToast(
                        "Please choose a PNG, JPG or WEBP image.",
                        "error"
                    );
                    profilePhotoInput.value = "";
                    return;
                }

                if (file.size > 2 * 1024 * 1024) {
                    showToast(
                        "Profile photo must be 2 MB or smaller.",
                        "error"
                    );
                    profilePhotoInput.value = "";
                    return;
                }

                const reader = new FileReader();

                reader.onload = function () {
                    adminProfile.profileImage = reader.result;
                    saveProfile();
                    displayProfile();
                    showToast(
                        "Profile photo is updated in this browser only.",
                        "error"
                    );
                    profilePhotoInput.value = "";
                };

                reader.onerror = function () {
                    showToast(
                        "Could not read the selected photo.",
                        "error"
                    );
                    profilePhotoInput.value = "";
                };

                reader.readAsDataURL(file);
            }
        );

    }


    /* =========================================
       LOGOUT
    ========================================= */

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                logoutConfirmModal?.classList.add("show");
                logoutConfirmModal?.setAttribute("aria-hidden", "false");

            }
        );

    }

    function closeLogoutConfirmation() {
        logoutConfirmModal?.classList.remove("show");
        logoutConfirmModal?.setAttribute("aria-hidden", "true");
    }

    logoutCancelButton?.addEventListener("click", closeLogoutConfirmation);
    logoutConfirmModal?.addEventListener("click", event => {
        if (event.target === logoutConfirmModal) closeLogoutConfirmation();
    });
    logoutConfirmButton?.addEventListener("click", () => {
        localStorage.removeItem("adminLoggedIn");
        showToast("Logging out...", "success");
        setTimeout(() => { window.location.href = "admin-login.html"; }, 700);
    });


    /* =========================================
       NOTIFICATION BUTTON
    ========================================= */

    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            function () {

                showToast(
                    "No new notifications.",
                    "info"
                );

            }
        );

    }


    /* =========================================
       MENU BUTTON
    ========================================= */

    if (menuButton) {

        menuButton.addEventListener(
            "click",
            function () {

                if (editProfileButton) {

                    editProfileButton.click();

                }

            }
        );

    }


    /* =========================================
       CLOSE MODAL ON OVERLAY CLICK
    ========================================= */

    if (editProfileModal) {

        editProfileModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    editProfileModal
                ) {

                    closeProfileModal();

                }

            }
        );

    }


    if (passwordModal) {

        passwordModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    passwordModal
                ) {

                    closePasswordChangeModal();

                }

            }
        );

    }


    /* =========================================
       BOTTOM NAVIGATION
    ========================================= */

    const homeNav =
        document.getElementById(
            "homeNav"
        );

    const applicationsNav =
        document.getElementById(
            "applicationsNav"
        );

    const managementNav =
        document.getElementById(
            "managementNav"
        );

    const moreNav =
        document.getElementById(
            "moreNav"
        );

    const profileEditShortcut =
        document.getElementById("profileEditShortcut");

    const profilePasswordShortcut =
        document.getElementById("profilePasswordShortcut");

    if (profileEditShortcut && editProfileButton) {
        profileEditShortcut.addEventListener("click", function () {
            editProfileButton.click();
        });
    }

    if (profilePasswordShortcut && changePasswordButton) {
        profilePasswordShortcut.addEventListener("click", function () {
            changePasswordButton.click();
        });
    }


    /* HOME */

    if (homeNav) {

        homeNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-dashboard.html";

            }
        );

    }


    /* APPLICATIONS */

    if (applicationsNav) {

        applicationsNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-applications.html";

            }
        );

    }


    /* MANAGEMENT */

    if (managementNav) {

        managementNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-routes.html";

            }
        );

    }


    /* MORE / PROFILE */

    if (moreNav) {

        moreNav.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin-profile.html";

            }
        );

    }


    /* =========================================
       TOAST MESSAGE FUNCTION
    ========================================= */

    function showToast(
        message,
        type = "success"
    ) {

        if (
            !toastMessage ||
            !toastText
        ) {

            return;

        }


        toastText.textContent =
            message;


        if (toastIcon) {

            if (type === "error") {

                toastIcon.className =
                    "fa-solid fa-circle-exclamation";

                toastIcon.style.color =
                    "#ef6262";

            }

            else if (type === "info") {

                toastIcon.className =
                    "fa-solid fa-circle-info";

                toastIcon.style.color =
                    "#5d48c0";

            }

            else {

                toastIcon.className =
                    "fa-solid fa-circle-check";

                toastIcon.style.color =
                    "#34a76a";

            }

        }


        toastMessage.classList.add(
            "show"
        );


        clearTimeout(
            window.adminProfileToastTimer
        );


        window.adminProfileToastTimer =
            setTimeout(
                function () {

                    toastMessage.classList.remove(
                        "show"
                    );

                },
                2800
            );

    }


    /* =========================================
       ESC KEY FUNCTION
    ========================================= */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                if (
                    editProfileModal &&
                    editProfileModal.classList.contains(
                        "show"
                    )
                ) {

                    closeProfileModal();

                }


                if (
                    passwordModal &&
                    passwordModal.classList.contains(
                        "show"
                    )
                ) {

                    closePasswordChangeModal();

                }

            }

        }
    );


    /* =========================================
       INITIALIZE PROFILE
    ========================================= */

    displayProfile();

    loadTheme();

    loadLanguage();

});
