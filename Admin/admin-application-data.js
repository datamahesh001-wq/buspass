// Loads the selected applicant directly from MySQL for both Admin review pages.
// This deliberately does not depend on data stored in the applicant's browser.
document.addEventListener("DOMContentLoaded", async () => {
    const applicationId = localStorage.getItem("selectedApplicationId");
    if (!applicationId || !/^\d+$/.test(String(applicationId))) return;

    const byId = id => document.getElementById(id);
    const put = (id, value, fallback = "Not available") => {
        const element = byId(id);
        if (element) element.textContent = value === null || value === undefined || value === "" ? fallback : value;
    };
    const formatDate = value => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not available";
    const title = value => String(value || "pending").replace(/^./, char => char.toUpperCase());

    try {
        const response = await fetch(`http://localhost:5000/api/admin/applications/${encodeURIComponent(applicationId)}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not load the application.");
        const app = result.application;
        const employee = app.passType === "Employee Pass" || app.userType === "employee";
        const organization = employee ? app.organizationName : app.collegeName;
        const dob = employee ? app.employeeDob : app.studentDob;
        const gender = employee ? app.employeeGender : app.studentGender;
        const city = employee ? app.employeeCity : app.studentCity;
        const district = employee ? app.employeeDistrict : app.studentDistrict;
        const state = employee ? app.employeeState : app.studentState;
        const pinCode = employee ? app.employeePinCode : app.studentPinCode;
        const address = employee ? app.employeeAddress : app.studentAddress;
        const normalizedStatus = ["paid", "draft", "submitted"].includes(String(app.status).toLowerCase()) ? "pending" : String(app.status).toLowerCase();

        put("applicantName", app.fullName); put("applicationId", `APP-${app.applicationId}`); put("applicationDate", `Applied on ${formatDate(app.createdAt)}`);
        put("fullName", app.fullName); put("mobileNumber", app.mobile); put("emailAddress", app.email); put("dateOfBirth", formatDate(dob)); put("gender", gender);
        put("organizationLabel", employee ? "Company Name" : "School / College"); put("organizationName", organization);
        const studentCategory = String(app.studentCategory || "").toLowerCase();
        put("studentCategory", employee ? "Employee" : studentCategory === "ssc below" ? "School Student" : studentCategory === "ssc above" ? "College Student" : "Student"); put("aadhaarNumber", app.studentIdNumber); put("fatherName", app.fatherName);
        put("motherName", app.motherName); put("contactNumber", app.contactNumber); put("employeeId", app.employeeId); put("department", app.department); put("designation", app.designation);
        put("city", city); put("district", district); put("state", state); put("pinCode", pinCode); put("permanentAddress", address);
        put("fromLocation", app.fromStop); put("toLocation", app.toStop); put("busType", app.busType); put("passPlanName", app.planName);
        put("passAmount", Number(app.planAmount || app.paidAmount || 0).toLocaleString("en-IN"), "0"); put("paymentStatus", title(app.paymentStatus || app.status));
        put("paymentMethod", app.paymentMethod); put("transactionId", app.transactionId); put("paymentAmount", `₹${Number(app.paidAmount || app.planAmount || 0).toLocaleString("en-IN")}`);

        put("verificationName", app.fullName); put("verificationId", app.applicantId || `APP-${app.applicationId}`); put("verificationType", app.passType);
        put("vFullName", app.fullName); put("vMobile", app.mobile); put("vEmail", app.email); put("vOrgLabel", employee ? "Company Name" : "School / College"); put("vOrg", organization);
        put("vFrom", app.fromStop); put("vTo", app.toStop); put("vBusType", app.busType); put("vPlan", app.planName); put("vAmount", `₹${Number(app.planAmount || 0).toLocaleString("en-IN")}`);
        put("vPaymentMethod", app.paymentMethod); put("vTransaction", app.transactionId); put("vPaidAmount", `₹${Number(app.paidAmount || app.planAmount || 0).toLocaleString("en-IN")}`);

        const statusElement = byId("applicationStatus") || byId("verificationAppStatus");
        if (statusElement) { statusElement.textContent = title(normalizedStatus); statusElement.className = `status-chip ${normalizedStatus}`; }
        const documents = Array.isArray(result.documents) ? result.documents : [];
        put("documentCount", `${documents.length} Files`, "0 Files");
        const documentList = byId("documentsList");
        if (documentList) documentList.innerHTML = documents.length ? documents.map(doc => `<div class="doc-card"><div class="doc-thumb"><i class="fa-regular fa-file-lines"></i></div><h4>${doc.documentType.replace(/_/g, " ")}</h4><p>${doc.fileName}</p><div class="doc-state"><span class="pending">Uploaded</span><span>Review</span></div></div>`).join("") : "<p class=\"empty-documents\">No documents uploaded.</p>";
        const verificationDocuments = byId("verificationDocuments");
        if (verificationDocuments) verificationDocuments.innerHTML = documents.length ? documents.map(doc => `<div class="verify-doc"><div class="doc-icon"><i class="fa-regular fa-file-lines"></i></div><div><h4>${doc.documentType.replace(/_/g, " ")}</h4><p>${doc.fileName}</p></div><span class="verified">Uploaded</span></div>`).join("") : "<p>No documents uploaded.</p>";
        put("documentProgress", `${documents.length} uploaded`, "0 uploaded");

        // The administrator may now make the final decision after reviewing the
        // server-provided record. The confirmation handler persists it to MySQL.
        const submit = byId("submitVerificationButton");
        if (submit && ["paid", "submitted", "pending", "draft"].includes(String(app.status).toLowerCase())) submit.disabled = false;
        document.querySelectorAll('input[name="decision"]').forEach(input => input.addEventListener("change", () => setTimeout(() => { if (submit) submit.disabled = false; }, 0)));
    } catch (error) {
        console.error("Admin application record load failed:", error);
    }
});
