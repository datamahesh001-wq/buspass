// ==========================================
// PASS TYPE SELECTION
// ==========================================

// Get Elements

const studentPass = document.getElementById("studentPass");
const employeePass = document.getElementById("employeePass");
const continueBtn = document.getElementById("continueBtn");
const backBtn = document.getElementById("backBtn");


// ==========================================
// SELECTED PASS TYPE
// ==========================================

let selectedPassType = "";


// ==========================================
// SELECT STUDENT PASS
// ==========================================

studentPass.addEventListener("click", function () {

    // Save selected pass
    selectedPassType = "Student Pass";

    // Add selected class
    studentPass.classList.add("selected");

    // Remove selected class from Employee
    employeePass.classList.remove("selected");

    // Enable Continue Button
    continueBtn.disabled = false;

    // Store in Browser
    localStorage.setItem(
        "selectedPassType",
        selectedPassType
    );

});


// ==========================================
// SELECT EMPLOYEE PASS
// ==========================================

employeePass.addEventListener("click", function () {

    // Save selected pass
    selectedPassType = "Employee Pass";

    // Add selected class
    employeePass.classList.add("selected");

    // Remove selected class from Student
    studentPass.classList.remove("selected");

    // Enable Continue Button
    continueBtn.disabled = false;

    // Store in Browser
    localStorage.setItem(
        "selectedPassType",
        selectedPassType
    );

});


// ==========================================
// CONTINUE BUTTON
// ==========================================

continueBtn.addEventListener("click", async function () {

    // Check if pass is selected

    if (selectedPassType === "") {

        showPopup(
            "error",
            "Pass Type Required",
            "Please select a pass type."
        );

        return;

    }

    continueBtn.disabled = true;
    try {
        await BPApplication.startNew(selectedPassType);
        localStorage.removeItem("renewalMode");
        localStorage.removeItem("reapplyMode");
        window.location.href = selectedPassType === "Employee Pass" ? "employee-details.html" : "student-details.html";
    } catch (error) {
        showPopup("error", "Could Not Start Application", error.message);
        continueBtn.disabled = false;
    }

});


// ==========================================
// RESTORE PREVIOUS SELECTION
// ==========================================

window.addEventListener("load", function () {

    const savedPassType = localStorage.getItem(
        "selectedPassType"
    );

    if (savedPassType === "Student Pass") {

        selectedPassType = "Student Pass";

        studentPass.classList.add("selected");

        employeePass.classList.remove("selected");

        continueBtn.disabled = false;

    }

    if (savedPassType === "Employee Pass") {

        selectedPassType = "Employee Pass";

        employeePass.classList.add("selected");

        studentPass.classList.remove("selected");

        continueBtn.disabled = false;

    }

});

