const urlParams = new URLSearchParams(window.location.search);
const isRenewalEdit = urlParams.get("mode") === "renew-edit" || localStorage.getItem("renewalEdit") === "true";
const isReapply = urlParams.get("mode") === "reapply" || localStorage.getItem("reapplyMode") === "true";

// ========================================
// BACK HEADER
// ========================================

const backBtn = document.getElementById("backBtn");

backBtn.addEventListener("click", function () {

    window.history.back();

});


// ========================================
// BACK BUTTON
// ========================================

const backFormBtn =
    document.getElementById("backFormBtn");

backFormBtn.addEventListener("click", function () {

    window.history.back();

});


// ========================================
// MOBILE
// ========================================

const mobile =
    document.getElementById("mobile");

mobile.addEventListener("input", function () {

    this.value =
        this.value
        .replace(/\D/g, "")
        .slice(0, 10);

});


// ========================================
// PIN CODE
// ========================================

const pinCode =
    document.getElementById("pinCode");

pinCode.addEventListener("input", function () {

    this.value =
        this.value
        .replace(/\D/g, "")
        .slice(0, 6);

});


// ========================================
// LOCATION CASCADE (State -> District -> City)
// ========================================
// 1. Mundu ga STATE select cheyali.
// 2. State base chesukoni DISTRICT options automatic ga
//    unique ga vastayi.
// 3. District base chesukoni CITY/TOWN options automatic
//    ga unique ga vastayi.

setupLocationDropdowns({
    stateSelect: document.getElementById("state"),
    districtSelect: document.getElementById("district"),
    citySelect: document.getElementById("city"),
    statePlaceholder: "Select State",
    districtPlaceholder: "Select District",
    cityPlaceholder: "Select City / Town"
});

// Custom dropdowns (no native select popup) for State/District/City
// — same single reusable component used by the Route screens too.

if (typeof BP_CustomDropdown !== "undefined") {
    BP_CustomDropdown.attach(document.getElementById("gender"), { placeholder: "Select Gender", searchPlaceholder: "Search gender..." });
    BP_CustomDropdown.attach(document.getElementById("state"), { placeholder: "Select State", searchPlaceholder: "Search state..." });
    BP_CustomDropdown.attach(document.getElementById("district"), { placeholder: "Select District", searchPlaceholder: "Search district..." });
    BP_CustomDropdown.attach(document.getElementById("city"), { placeholder: "Select City / Town", searchPlaceholder: "Search city/town..." });
}


// ========================================
// SAME ADDRESS CHECKBOX
// ========================================

const sameAddress =
    document.getElementById("sameAddress");

sameAddress.addEventListener("change", function () {

    const address =
        document.getElementById("address");

    if (this.checked) {

        address.value =
            "Same as current address";

    } else {

        address.value = "";

    }

});


// ========================================
// RESTORE SAVED EMPLOYEE DETAILS
// ========================================
async function restoreEmployeeDetails() {
    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    if (!user || !user.id) return;

    let data = null;
    try {
        const saved = await BPApplication.data();
        data = saved?.details || null;
    } catch (error) {
        console.log("Could not load employee details:", error);
    }

    // Only restore the current application's snapshot. Never restore an older
    // employee profile from localStorage into a brand-new application.
    data = data || {};
    const map = {
        fullName: "full_name", dob: "date_of_birth", gender: "gender", mobile: "mobile", email: "email",
        organization: "organization_name", employeeId: "employee_id", department: "department",
        designation: "designation", city: "city", district: "district", state: "state", pinCode: "pin_code", address: "permanent_address"
    };

    Object.entries(map).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.value = data[key] || data[id] || "";
    });

    if (document.getElementById("state").value) {
        document.getElementById("state").dispatchEvent(new Event("change", { bubbles: true }));
        setTimeout(() => {
            document.getElementById("district").value = data.district || "";
            document.getElementById("district").dispatchEvent(new Event("change", { bubbles: true }));
            setTimeout(() => {
                document.getElementById("city").value = data.city || "";
                document.getElementById("city").dispatchEvent(new Event("change", { bubbles: true }));
                window.dispatchEvent(new Event("bp:dropdown-refresh"));
            }, 0);
            window.dispatchEvent(new Event("bp:dropdown-refresh"));
        }, 0);
    }
    window.dispatchEvent(new Event("bp:dropdown-refresh"));
}

// ========================================
// NEXT
// ========================================

const nextBtn =
    document.getElementById("nextBtn");

const API_BASE = "http://localhost:5000";

nextBtn.addEventListener("click", async function () {

    const fullName =
        document.getElementById("fullName").value.trim();

    const dob =
        document.getElementById("dob").value;

    const gender =
        document.getElementById("gender").value;

    const mobileNumber =
        mobile.value.trim();

    const email =
        document.getElementById("email").value.trim();

    const organization =
        document.getElementById("organization").value.trim();

    const employeeId =
        document.getElementById("employeeId").value.trim();

    const department =
        document.getElementById("department").value.trim();

    const designation =
        document.getElementById("designation").value.trim();

    const city =
        document.getElementById("city").value;

    const district =
        document.getElementById("district").value;

    const state =
        document.getElementById("state").value;

    const pin =
        pinCode.value.trim();

    const address =
        document.getElementById("address").value.trim();


    if (
        !fullName ||
        !dob ||
        !gender ||
        !mobileNumber ||
        !email ||
        !organization ||
        !employeeId ||
        !department ||
        !designation ||
        !city ||
        !district ||
        !state ||
        !pin ||
        !address
    ) {

        showPopup(
            "error",
            "Incomplete Details",
            "Please fill all employee details."
        );

        return;

    }


    if (mobileNumber.length !== 10) {

        showPopup(
            "error",
            "Invalid Mobile Number",
            "Please enter a valid 10-digit mobile number."
        );

        return;

    }


    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailPattern.test(email)) {

        showPopup(
            "error",
            "Invalid Email",
            "Please enter a valid email address."
        );

        return;

    }


    if (pin.length !== 6) {

        showPopup(
            "error",
            "Invalid PIN Code",
            "Please enter a valid 6-digit PIN code."
        );

        return;

    }


    const employeeData = {

        fullName,

        dateOfBirth: dob,

        gender,

        mobile: mobileNumber,

        email,

        organization,

        employeeId,

        department,

        designation,

        city,

        district,

        state,

        pinCode: pin,

        permanentAddress: address

    };


    localStorage.setItem(
        "employeeDetails",
        JSON.stringify(employeeData)
    );


    nextBtn.disabled = true;
    nextBtn.textContent = "Saving...";

    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    const applicationId = BPApplication.id() || localStorage.getItem("applicationId");

    try {
        const response = await fetch("http://localhost:5000/api/details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user?.id, passType, details: employeeData, applicationId })
        });
        const result = await response.json().catch(() => ({ success: false, message: "Could not save details." }));
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not save details.");
        }
        if (result.applicationId) localStorage.setItem("applicationId", String(result.applicationId));
    } catch (error) {
        showPopup("error", "Could Not Save Details", error.message);
        nextBtn.disabled = false;
        nextBtn.textContent = "Next";
        return;
    }

    BPApplication.update({ employeeDetails: employeeData, currentStep: "details", status: "Details Completed" });

    nextBtn.disabled = false;
    nextBtn.textContent = "Next";

    if (isRenewalEdit) {
        localStorage.removeItem("renewalEdit");
        localStorage.removeItem("renewalEditApplicationId");
        window.location.href = "renew-pass.html";
        return;
    }

    window.location.href = "empdoc-upload.html";

});

restoreEmployeeDetails();
