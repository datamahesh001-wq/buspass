const passType = localStorage.getItem("selectedPassType") || "Student Pass";
const isEmployee = passType === "Employee Pass";
const urlParams = new URLSearchParams(window.location.search);
const isRenewalEdit = urlParams.get("mode") === "renew-edit" || localStorage.getItem("renewalEdit") === "true";
const isReapply = urlParams.get("mode") === "reapply" || localStorage.getItem("reapplyMode") === "true";
const form = document.getElementById("studentDetailsForm");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const formBackBtn = document.getElementById("formBackBtn");

const fields = {
    fullName: document.getElementById("fullName"),
    dob: document.getElementById("dob"),
    gender: document.getElementById("gender"),
    mobile: document.getElementById("mobile"),
    email: document.getElementById("email"),
    aadhaar: document.getElementById("aadhaar"),
    collegeName: document.getElementById("collegeName"),
    classCourse: document.getElementById("classCourse"),
    fatherName: document.getElementById("fatherName"),
    motherName: document.getElementById("motherName"),
    contactNumber: document.getElementById("contactNumber"),
    city: document.getElementById("city"),
    district: document.getElementById("district"),
    state: document.getElementById("state"),
    pinCode: document.getElementById("pinCode"),
    permanentAddress: document.getElementById("permanentAddress")
};

const formGroups = {};
Object.keys(fields).forEach(id => {
    formGroups[id] = fields[id] ? fields[id].closest(".form-group") : null;
});

function setText(selector, text) {
    const element = document.querySelector(selector);
    if (element) element.textContent = text;
}

function setPlaceholder(id, text) {
    if (fields[id]) fields[id].placeholder = text;
}

function setLabel(id, text) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) label.textContent = text;
}

function getFieldLabel(id) {
    const label = document.querySelector(`label[for="${id}"]`);
    return label ? label.textContent.trim() : id;
}

function showMissingFields(missingFields) {
    const missingList = missingFields.map(id => `- ${getFieldLabel(id)}`).join("\n");

    showPopup(
        "error",
        "Missing Details",
        `Please enter:\n${missingList}`
    );

    fields[missingFields[0]].focus();
}

function configureContent() {
    document.title = `${passType} Details - BusPass`;
    setText("#selectedPassTitle", isRenewalEdit ? `${passType} • Edit Details` : isReapply ? `${passType} • Correct & Reapply` : passType);
    setText(".details-card h2", isEmployee ? "Employee Details" : "Student Details");

    const employeeLabels = {
        fullName: "Employee Name",
        aadhaar: "Employee ID",
        collegeName: "Company / Organization Name",
        fatherName: "Designation",
        motherName: "Department",
        contactNumber: "Office Contact Number"
    };

    if (isEmployee) {
        ["classCourse"].forEach(id => {
            if (formGroups[id]) formGroups[id].hidden = true;
            fields[id].required = false;
        });
        document.querySelectorAll("label").forEach(label => {
            if (employeeLabels[label.htmlFor]) {
                label.textContent = employeeLabels[label.htmlFor];
            }
        });

        const sectionTitles = document.querySelectorAll(".section-title");
        if (sectionTitles[0]) sectionTitles[0].textContent = "Organization Details";
        if (sectionTitles[1]) sectionTitles[1].textContent = "Employment Details";
        setPlaceholder("fullName", "Enter employee name");
        setPlaceholder("aadhaar", "Enter employee ID");
        setPlaceholder("collegeName", "Enter company name");
        setPlaceholder("fatherName", "Enter designation");
        setPlaceholder("motherName", "Enter department");
        setPlaceholder("contactNumber", "Enter office contact number");
    } else {
        form.classList.remove("is-hidden");
        nextBtn.disabled = false;
    }
}

function allowNumbers(field, length) {
    if (!field) return;
    field.addEventListener("input", () => {
        field.value = field.value.replace(/\D/g, "").slice(0, length);
    });
}

allowNumbers(fields.mobile, 10);
allowNumbers(fields.contactNumber, 10);
allowNumbers(fields.pinCode, 6);


// ==========================================
// LOCATION CASCADE (State -> District -> City)
// ==========================================
// 1. Mundu ga STATE select cheyali.
// 2. State base chesukoni DISTRICT options automatic ga
//    unique ga vastayi.
// 3. District base chesukoni CITY/TOWN options automatic
//    ga unique ga vastayi.

setupLocationDropdowns({
    stateSelect: fields.state,
    districtSelect: fields.district,
    citySelect: fields.city,
    statePlaceholder: "Select State",
    districtPlaceholder: "Select District",
    cityPlaceholder: "Select City/Town"
});

// Custom dropdowns (no native select popup) for State/District/City
// — same single reusable component used by the Route screens too.

if (typeof BP_CustomDropdown !== "undefined") {
    if (fields.gender) BP_CustomDropdown.attach(fields.gender, { placeholder: "Select Gender", searchPlaceholder: "Search gender..." });
    if (fields.state) BP_CustomDropdown.attach(fields.state, { placeholder: "Select State", searchPlaceholder: "Search state..." });
    if (fields.district) BP_CustomDropdown.attach(fields.district, { placeholder: "Select District", searchPlaceholder: "Search district..." });
    if (fields.city) BP_CustomDropdown.attach(fields.city, { placeholder: "Select City/Town", searchPlaceholder: "Search city/town..." });
}

function validateForm() {
    const requiredFields = isEmployee
        ? ["fullName", "dob", "gender", "mobile", "email", "aadhaar", "collegeName", "fatherName", "motherName", "contactNumber", "city", "district", "state", "pinCode", "permanentAddress"]
        : ["fullName", "dob", "gender", "mobile", "email", "aadhaar", "collegeName", "classCourse", "fatherName", "contactNumber", "city", "district", "state", "pinCode", "permanentAddress"];
    const missingFields = requiredFields.filter(id => fields[id] && !fields[id].value.trim());

    if (missingFields.length > 0) {
        showMissingFields(missingFields);
        return false;
    }
    if (fields.mobile.value.length !== 10 || fields.contactNumber.value.length !== 10) {
        showPopup("error", "Invalid Phone Number", "Phone numbers must contain 10 digits.");
        return false;
    }
    if (fields.aadhaar.value.length < 3) {
        showPopup("error", isEmployee ? "Invalid Employee ID" : "Invalid Student ID", `${isEmployee ? "Employee ID" : "Student ID"} is not valid.`);
        return false;
    }
    if (fields.pinCode.value.length !== 6) {
        showPopup("error", "Invalid PIN Code", "PIN Code must contain 6 digits.");
        return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value)) {
        showPopup("error", "Invalid Email", "Please enter a valid email address.");
        return false;
    }
    return true;
}

async function restoreData() {
    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    if (!user || !user.id) return;

    let details = null;
    try {
        const saved = await BPApplication.data();
        details = saved?.details || null;
    } catch (error) {
        console.log("Could not load saved details:", error);
    }

    // Only the current application snapshot may restore values. Do not fall
    // back to the user's older profile/detail row, otherwise a fresh form
    // would open with the previous application data filled in.
    const data = details || {};

    Object.keys(fields).forEach(id => {
        if (!fields[id]) return;
        fields[id].value = data[id] || data[({dob:"date_of_birth", fullName:"full_name", mobile:"mobile", email:"email", aadhaar:"aadhaar_number", collegeName:"college_name", classCourse:"class_course", fatherName:"father_name", motherName:"mother_name", contactNumber:"contact_number", city:"city", district:"district", state:"state", pinCode:"pin_code", permanentAddress:"permanent_address"}[id] || id)] || "";
    });
    // Application snapshots store the student identifier under the common
    // id_number name, while older profile rows use aadhaar_number.
    if (!fields.aadhaar.value && data.id_number) fields.aadhaar.value = data.id_number;

    if (!isEmployee) {
        form.classList.remove("is-hidden");
        nextBtn.disabled = false;
    }

    // Location selects need their dependent options populated before values are restored.
    if (fields.state.value) {
        fields.state.dispatchEvent(new Event("change", { bubbles: true }));
        setTimeout(() => {
            if (data.district || fields.district.value) {
                fields.district.value = data.district || fields.district.value;
                fields.district.dispatchEvent(new Event("change", { bubbles: true }));
                setTimeout(() => {
                    fields.city.value = data.city || fields.city.value;
                    fields.city.dispatchEvent(new Event("change", { bubbles: true }));
                    window.dispatchEvent(new Event("bp:dropdown-refresh"));
                }, 0);
            }
            window.dispatchEvent(new Event("bp:dropdown-refresh"));
        }, 0);
    }

    window.dispatchEvent(new Event("bp:dropdown-refresh"));
}

async function saveAndContinue() {
    if (!validateForm()) return;
    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    const storedApplicationId = localStorage.getItem("applicationId");
    const applicationId = Number(storedApplicationId);

    if (!user || !user.id) {
        showPopup("error", "Login Required", "Please log in to continue.");
        return;
    }
    if (!storedApplicationId || !Number.isSafeInteger(applicationId) || applicationId <= 0) {
        showPopup("error", "Application Session Not Found", "Application session not found. Please start a new application.");
        return;
    }

    const data = {};
    Object.keys(fields).forEach(id => {
        if (fields[id]) data[id] = fields[id].value.trim();
    });
    data.passType = passType;
    data.dateOfBirth = fields.dob.value;

    if (isEmployee) {
        data.employeeId = data.aadhaar;
        data.organization = data.collegeName;
        data.designation = data.fatherName;
        data.department = data.motherName;
        data.permanentAddress = data.permanentAddress;
        localStorage.setItem("employeeDetails", JSON.stringify(data));
    } else {
        localStorage.setItem("studentDetails", JSON.stringify(data));
    }

    try {
        const response = await fetch("http://localhost:5000/api/details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, applicationId, passType, details: data })
        });
        const result = await response.json().catch(() => ({ success: false, message: "Could not save details." }));
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not save details.");
        }
        if (result.applicationId) localStorage.setItem("applicationId", String(result.applicationId));
    } catch (error) {
        showPopup("error", "Could Not Save Details", error.message);
        return;
    }

    BPApplication.update({ studentDetails: data, currentStep: "details", status: "Details Completed" });
    if (isRenewalEdit) {
        localStorage.removeItem("renewalEdit");
        localStorage.removeItem("renewalEditApplicationId");
        window.location.href = "renew-pass.html";
        return;
    }

    if (isReapply) {
        window.location.href = "documents-upload.html";
        return;
    }

    window.location.href = "documents-upload.html";
}

backBtn.addEventListener("click", () => window.history.back());
formBackBtn.addEventListener("click", () => window.location.href = isRenewalEdit ? "renew-pass.html" : "pass-type.html");
nextBtn.addEventListener("click", saveAndContinue);
form.addEventListener("submit", event => {
    event.preventDefault();
    saveAndContinue();
});

configureContent();
restoreData();
