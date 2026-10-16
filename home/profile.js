// ========================================
// PROFILE PAGE
// ========================================

const API_BASE = "http://localhost:5000";

let currentUser = null;


// ==========================================
// LOAD PROFILE DETAILS
// ==========================================

document.addEventListener("DOMContentLoaded", async function () {

    currentUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");

    if (!currentUser || !currentUser.id) {
        window.location.href = "../login.html";
        return;
    }

    renderProfile(currentUser);
    await loadProfileFromDatabase();
    loadPassCategory();

    const profilePhotoButton = document.getElementById("profilePhotoButton");
    const profilePhotoInput = document.getElementById("profilePhotoInput");
    if (profilePhotoButton && profilePhotoInput) {
        profilePhotoButton.addEventListener("click", () => profilePhotoInput.click());
        profilePhotoInput.addEventListener("change", handleProfilePhotoChange);
    }

});

// Always refresh the profile from MySQL when the Profile screen opens.
// localStorage is only used as a fast fallback/cache for the UI.
async function loadProfileFromDatabase() {
    try {
        const response = await fetch(`${API_BASE}/api/profile?userId=${encodeURIComponent(currentUser.id)}`);
        const result = await response.json();
        if (!response.ok || !result.success || !result.profile) return;

        currentUser = { ...currentUser, ...result.profile };
        localStorage.setItem("loggedInUser", JSON.stringify(currentUser));
        renderProfile(currentUser);
    } catch (error) {
        console.log("Could not refresh profile from MySQL:", error);
    }
}


// Fill the profile screen from a user object
function renderProfile(user) {

    document.querySelector(".profile-name").textContent =
        user.full_name || "User";

    document.querySelector(".profile-email").textContent =
        user.email || "--";

    document.querySelector(".profile-mobile").textContent =
        user.mobile || "--";

    const profileInitial = document.getElementById("profileInitial");
    const profilePhoto = document.getElementById("profilePhoto");
    if (profilePhoto && user.profileImage) {
        profilePhoto.src = user.profileImage;
        profilePhoto.hidden = false;
        profileInitial.hidden = true;
    } else {
        profileInitial.textContent = (user.full_name || "U").charAt(0).toUpperCase();
        profileInitial.hidden = false;
        if (profilePhoto) profilePhoto.hidden = true;
    }

}

function handleProfilePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
        currentUser.profileImage = reader.result;
        localStorage.setItem("loggedInUser", JSON.stringify(currentUser));
        renderProfile(currentUser);
    };
    reader.readAsDataURL(file);

}


// Show current pass category on the profile card
async function loadPassCategory() {

    const categoryElement = document.getElementById("passCategory");
    const actionText = document.getElementById("passActionText");

    try {

        const response = await fetch(
            `${API_BASE}/api/history?userId=${encodeURIComponent(currentUser.id)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) return;

        const history = result.history || [];

        const activePass = history.find(app =>
            app.application_status === "paid" &&
            app.payment_status === "success"
        );

        if (activePass) {
            categoryElement.textContent = activePass.pass_type_name || "Active";
            actionText.textContent = "View your current pass";
        } else {
            categoryElement.textContent = "Not selected";
            actionText.textContent = "Apply for a new pass";
        }

    } catch (error) {

        console.log("Could not load pass category:", error);

    }
}




// ========================================
// EDIT PERSONAL INFORMATION (MODAL)
// ========================================

function openEditProfile() {

    if (!currentUser || !currentUser.id) {

        showPopup(
            "error",
            "Login Required",
            "Please login again to edit your profile.",
            {
                onOk: function () {
                    window.location.href = "../login.html";
                }
            }
        );

        return;
    }

    // Pre-fill the form with current values

    document.getElementById("editFullName").value =
        currentUser.full_name || "";

    document.getElementById("editMobile").value =
        currentUser.mobile || "";

    document.getElementById("editEmail").value =
        currentUser.email || "";

    setFormMessage("");

    document.getElementById("editModal").hidden = false;

}


function closeEditProfile() {

    document.getElementById("editModal").hidden = true;

}


// Close modal when clicking the dark backdrop outside the form
document.addEventListener("click", function (event) {

    if (event.target === document.getElementById("editModal")) {
        closeEditProfile();
    }

});


// Save the edited details to the database
async function saveProfile(event) {

    event.preventDefault();

    const fullName = document.getElementById("editFullName").value.trim();
    const mobile = document.getElementById("editMobile").value.trim();
    const email = document.getElementById("editEmail").value.trim();
    const saveButton = document.querySelector(".save-btn");

    // Validations (same rules as backend)

    if (!fullName) return setFormMessage("Please enter your full name.");
    if (!/^\d{10}$/.test(mobile)) return setFormMessage("Enter a valid 10-digit mobile number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormMessage("Enter a valid email address.");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
    setFormMessage("");

    try {

        const response = await fetch(`${API_BASE}/api/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.id,
                fullName: fullName,
                mobile: mobile,
                email: email
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not update profile.");
        }

        // Update localStorage so other pages also show fresh data

        currentUser.full_name = result.profile.full_name;
        currentUser.mobile = result.profile.mobile;
        currentUser.email = result.profile.email;

        localStorage.setItem("loggedInUser", JSON.stringify(currentUser));

        // Refresh screen instantly

        renderProfile(currentUser);

        closeEditProfile();

        showPopup(
            "success",
            "Profile Updated",
            "Your profile and saved Student/Employee details were updated successfully."
        );

    } catch (error) {

        setFormMessage(error.message || "Could not connect to server. Please ensure the backend is running.");

    } finally {

        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";

    }
}


// Show message inside the form (red for errors, green for success)
function setFormMessage(message, isError = true) {

    const element = document.getElementById("formMessage");

    element.textContent = message;
    element.classList.toggle("success", !isError && message !== "");

}


// ========================================
// OTHER OPTIONS
// ========================================

// My Pass Details - open the pass screen
function openPassDetails() {

    window.location.href = "my-pass.html";

}


// Password & Security - use the forgot password flow
function changePassword() {

    showConfirm(
        "Change Password",
        "We will send a password reset link to your registered email. Continue?",
        function () {
            window.location.href = "../forgot-password.html";
        }
    );

}


// Application notifications toggle
function toggleNotifications(enabled) {

    localStorage.setItem("notificationsEnabled", enabled ? "true" : "false");

    document.getElementById("notificationText").textContent = enabled
        ? "You will receive pass status updates"
        : "Notifications are turned off";

}


// Help & Support
function helpSupport() {

    showPopup(
        "info",
        "Help & Support",
        "APSRTC Passenger Helpline: 1800-xxx-xxx (toll-free)"
    );

}


// Logout
function logout() {

    showConfirm(
        "Logout",
        "Are you sure you want to logout?",
        function () {

            [
                "loggedInUser",
                "selectedPassType",
                "selectedStudentCategory",
                "studentDetails",
                "employeeDetails",
                "studentRoute",
                "employeeRoute",
                "studentPlan",
                "employeePlan",
                "renewalMode"
            ].forEach(key => localStorage.removeItem(key));

            console.log("User logged out");

            window.location.href = "../login.html";

        }
    );

}


// ========================================
// BOTTOM NAVIGATION
// ========================================

function goHome() {

    console.log("Home clicked");

    window.location.href = "dashboard.html";
}


function goMyPass() {

    console.log("My Pass clicked");

    window.location.href = "my-pass.html";
}


function goHistory() {

    console.log("History clicked");

    window.location.href = "history.html";
}
