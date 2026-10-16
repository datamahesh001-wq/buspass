const passType = localStorage.getItem("selectedPassType") || "Student Pass";
const isEmployee = passType === "Employee Pass";

const DOCUMENT_CONFIG = isEmployee ? [
    { name: "photo", label: "Passport Size Photo", required: true, db: "passport_photo" },
    { name: "employee ID", label: "Employee ID Card", required: true, db: "employee_id" },
    { name: "company proof", label: "Company / Organization Proof", required: true, db: "company_proof" },
    { name: "employment proof", label: "Employment Proof", required: true, db: "employment_proof" }
] : [
    { name: "photo", label: "Passport Size Photo", required: true, db: "passport_photo" },
    { name: "student ID", label: "Student ID Card", required: true, db: "student_id" },
    { name: "Aadhaar card", label: "Aadhaar Card", required: true, db: "aadhaar" },
    { name: "Address proof", label: "Address Proof", required: false, db: "address_proof" }
];

const docKey = name => `bp_document_${isEmployee ? "employee" : "student"}_${name}`;
const verifiedKey = name => `${docKey(name)}_verified`;
const isReapply = localStorage.getItem("reapplyMode") === "true";
if (isReapply) {
    DOCUMENT_CONFIG.forEach(d => {
        localStorage.removeItem(docKey(d.name));
        localStorage.removeItem(verifiedKey(d.name));
        localStorage.removeItem(`${docKey(d.name)}_preview`);
    });
    localStorage.removeItem("passportPhoto");
}

function configureDocuments() {
    document.title = `${passType} Documents - Bus Pass Application`;
    const title = document.getElementById("passTitle");
    if (title) title.textContent = passType;

    if (isEmployee) {
        const titleTwo = document.getElementById("documentTitleTwo");
        const textTwo = document.getElementById("documentTextTwo");
        const titleThree = document.getElementById("documentTitleThree");
        const textThree = document.getElementById("documentTextThree");
        const titleFour = document.getElementById("documentTitleFour");
        const textFour = document.getElementById("documentTextFour");
        if (titleTwo) titleTwo.textContent = "Employee ID Card";
        if (textTwo) textTwo.innerHTML = "Upload your valid Employee<br>ID card";
        if (titleThree) titleThree.textContent = "Company / Organization Proof";
        if (textThree) textThree.innerHTML = "Upload company or organization<br>proof";
        if (titleFour) titleFour.textContent = "Employment Proof";
        if (textFour) textFour.innerHTML = "Upload appointment letter or<br>employment proof";
    }

    document.querySelectorAll("input[type='file']").forEach(input => {
        input.setAttribute("autocomplete", "off");
    });

    renderAllDocumentStates();
    ensurePreviewModal();
}

function getDocumentConfig(name) {
    return DOCUMENT_CONFIG.find(d => d.name === name);
}

function getDocumentItem(name) {
    const items = Array.from(document.querySelectorAll("[data-document-item]"));
    const index = DOCUMENT_CONFIG.findIndex(d => d.name === name);
    return index >= 0 ? items[index] : null;
}

function getSavedFile(name) {
    return localStorage.getItem(docKey(name)) || "";
}

function isVerified(name) {
    return localStorage.getItem(verifiedKey(name)) === "true";
}

function setDocumentState(name, fileName, verified) {
    if (fileName) localStorage.setItem(docKey(name), fileName);
    else localStorage.removeItem(docKey(name));
    localStorage.setItem(verifiedKey(name), verified ? "true" : "false");
    if (!fileName) localStorage.removeItem(`${docKey(name)}_preview`);
}

function renderAllDocumentStates() {
    DOCUMENT_CONFIG.forEach(d => renderDocumentState(d.name));
    updateVerificationSummary();
}

function updateVerificationSummary() {
    let summary = document.querySelector(".documents-footer-summary");
    if (!summary) {
        const card = document.querySelector(".documents-card");
        const buttons = document.querySelector(".bottom-buttons");
        summary = document.createElement("div");
        summary.className = "documents-footer-summary";
        if (buttons) card.insertBefore(summary, buttons);
        else card.appendChild(summary);
    }
    const required = DOCUMENT_CONFIG.filter(d => d.required);
    const verified = required.filter(d => !!getSavedFile(d.name) && isVerified(d.name)).length;
    const uploaded = required.filter(d => !!getSavedFile(d.name)).length;
    summary.innerHTML = `<strong>${verified}/${required.length}</strong> required documents verified • ${uploaded}/${required.length} uploaded`;

    const next = document.querySelector(".next-button");
    if (next) {
        const ready = verified === required.length;
        next.disabled = !ready;
        next.title = ready ? "Continue to route selection" : "Upload and verify all required documents";
    }
}

async function uploadFile(input, documentName) {
    const file = input.files && input.files[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
        showPopup("error", "File Too Large", `${documentName} must be less than 2MB.`);
        input.value = "";
        return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
        showPopup("error", "Invalid File Type", "Please upload JPG or PNG file only.");
        input.value = "";
        return;
    }

    // Re-uploading replaces the previous file and always resets verification.
    setDocumentState(documentName, file.name, false);
    input.value = "";

    if (documentName === "photo") await storePassportPhoto(file);
    await storeDocumentPreview(file, documentName);
    try {
        await saveDocumentToServer(documentName, file.name);
    } catch (error) {
        showPopup("error", "Could Not Save Document", error.message);
        return;
    }

    showPopup("success", "Upload Complete", `${getDocumentConfig(documentName)?.label || documentName} uploaded. Please review and verify it.`);
    renderDocumentState(documentName);
    updateVerificationSummary();

    const config = getDocumentConfig(documentName);
    if (config?.db) {
        const state = BPApplication.state();
        BPApplication.update({ documents: { ...state.documents, [config.db]: { document_type: config.db, file_name: file.name, preview_data: localStorage.getItem(`${docKey(documentName)}_preview`) || "", document_status: "uploaded" } }, currentStep: "documents" });
    }

    // Keep the current file available for the View action during this page session.
    window.__bpDocumentFiles = window.__bpDocumentFiles || {};
    window.__bpDocumentFiles[documentName] = file;
}

async function saveDocumentToServer(documentName, fileName) {
    const config = getDocumentConfig(documentName);
    const user = BPApplication.user();
    const applicationId = BPApplication.id();
    const previewData = localStorage.getItem(`${docKey(documentName)}_preview`) || "";
    if (!config?.db || !user?.id || !applicationId || !previewData) throw new Error("Application data is missing. Please restart this application.");
    const response = await fetch("http://localhost:5000/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId, userId: user.id, documentType: config.db, fileName, previewData }) });
    const result = await response.json().catch(() => ({ success: false, message: "Could not save document." }));
    if (!response.ok || !result.success) throw new Error(result.message || "Could not save document.");
}

function toggleVerification(name) {
    const fileName = getSavedFile(name);
    if (!fileName) return;
    const next = !isVerified(name);
    localStorage.setItem(verifiedKey(name), next ? "true" : "false");
    const config = getDocumentConfig(name);
    if (config?.db) {
        const state = BPApplication.state();
        const saved = state.documents[config.db] || {};
        BPApplication.update({ documents: { ...state.documents, [config.db]: { ...saved, document_status: next ? "verified" : "uploaded" } } });
    }
    renderDocumentState(name);
    updateVerificationSummary();
}

function openPreview(name) {
    const fileName = getSavedFile(name);
    if (!fileName) return;
    const file = window.__bpDocumentFiles?.[name];
    const savedPreview = localStorage.getItem(`${docKey(name)}_preview`) || "";
    if (!file && !savedPreview) {
        showPopup("info", "Preview Not Available", "The uploaded file name is saved. Use Replace to choose the document again if you need to view it.");
        return;
    }
    const backdrop = document.querySelector(".document-preview-backdrop");
    const title = backdrop.querySelector("[data-preview-title]");
    const image = backdrop.querySelector("[data-preview-image]");
    const fileLabel = backdrop.querySelector("[data-preview-name]");
    title.textContent = getDocumentConfig(name)?.label || "Uploaded Document";
    fileLabel.textContent = fileName;
    if (file) {
        const objectUrl = URL.createObjectURL(file);
        image.src = objectUrl;
        image.onload = () => URL.revokeObjectURL(objectUrl);
    } else {
        image.src = savedPreview;
    }
    backdrop.classList.add("is-open");
}

function closePreview() {
    const backdrop = document.querySelector(".document-preview-backdrop");
    if (backdrop) backdrop.classList.remove("is-open");
}

function ensurePreviewModal() {
    if (document.querySelector(".document-preview-backdrop")) return;
    const backdrop = document.createElement("div");
    backdrop.className = "document-preview-backdrop";
    backdrop.innerHTML = `
        <div class="document-preview" role="dialog" aria-modal="true" aria-label="Document preview">
            <div class="document-preview-head">
                <strong data-preview-title>Uploaded Document</strong>
                <button type="button" class="document-preview-close" aria-label="Close preview"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="document-preview-body"><img data-preview-image alt="Uploaded document preview"></div>
            <div class="document-preview-name" data-preview-name></div>
        </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", e => { if (e.target === backdrop) closePreview(); });
    backdrop.querySelector(".document-preview-close").addEventListener("click", closePreview);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closePreview(); });
}

function goBack() {
    window.location.href = isEmployee ? "employee-details.html" : "student-details.html";
}

function goNext() {
    const missing = DOCUMENT_CONFIG.filter(d => d.required && !getSavedFile(d.name));
    const unverified = DOCUMENT_CONFIG.filter(d => d.required && getSavedFile(d.name) && !isVerified(d.name));
    if (missing.length) {
        showPopup("error", "Missing Document", `Please upload: ${missing.map(d => d.label).join(", ")}.`);
        return;
    }
    if (unverified.length) {
        showPopup("error", "Verification Required", `Please review and verify: ${unverified.map(d => d.label).join(", ")}.`);
        return;
    }
    BPApplication.setStep("documents", "Details Completed");
    window.location.href = isEmployee ? "employee-route.html" : "student-route.html";
}

function storeDocumentPreview(file, documentName) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = event => {
            const img = new Image();
            img.onload = () => {
                const maxWidth = 520;
                const scale = Math.min(1, maxWidth / img.width);
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                try {
                    localStorage.setItem(`${docKey(documentName)}_preview`, canvas.toDataURL("image/jpeg", 0.68));
                } catch (error) {
                    console.log("Could not store document preview.");
                }
                resolve();
            };
            img.onerror = resolve;
            img.src = event.target.result;
        };
        reader.onerror = resolve;
        reader.readAsDataURL(file);
    });
}

function storePassportPhoto(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                const maxWidth = 400;
                const scale = Math.min(1, maxWidth / img.width);
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                try { localStorage.setItem("passportPhoto", canvas.toDataURL("image/jpeg", 0.85)); }
                catch (error) { console.log("Could not store photo preview."); }
                resolve();
            };
            img.onerror = resolve;
            img.src = event.target.result;
        };
        reader.onerror = resolve;
        reader.readAsDataURL(file);
    });
}

configureDocuments();

async function restoreApplicationDocuments() {
    try {
        const saved = await BPApplication.data();
        (saved?.documents || []).forEach(document => {
            const config = DOCUMENT_CONFIG.find(item => item.db === document.document_type);
            if (!config) return;
            setDocumentState(config.name, document.file_name, document.document_status === "verified");
            if (document.preview_data) localStorage.setItem(`${docKey(config.name)}_preview`, document.preview_data);
        });
        renderAllDocumentStates();
    } catch (error) { console.warn("Could not restore application documents:", error.message); }
}
restoreApplicationDocuments();

// Users only upload and view their documents. Verification is intentionally
// reserved for the Transport Office admin after the application is submitted.
function renderDocumentState(name) {
    const item = getDocumentItem(name);
    if (!item) return;
    const config = getDocumentConfig(name);
    const fileName = getSavedFile(name);
    const status = item.querySelector("[data-document-status]");
    const controls = item.querySelector("[data-document-controls]");
    const uploadLabel = item.querySelector(".upload-btn span");
    if (!status || !controls) return;
    controls.innerHTML = "";
    status.className = "document-status";
    if (!fileName) {
        status.textContent = config.required ? "Required - not uploaded" : "Optional - not uploaded";
        if (uploadLabel) uploadLabel.textContent = "Upload";
        return;
    }
    status.textContent = "Ready for review";
    status.classList.add("uploaded");
    if (uploadLabel) uploadLabel.textContent = "Uploaded";
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "doc-mini-btn";
    viewBtn.textContent = "View";
    viewBtn.onclick = () => openPreview(name);
    controls.append(viewBtn);
}

function updateVerificationSummary() {
    let summary = document.querySelector(".documents-footer-summary");
    if (!summary) {
        summary = document.createElement("div");
        summary.className = "documents-footer-summary";
        const buttons = document.querySelector(".bottom-buttons");
        if (buttons) buttons.parentNode.insertBefore(summary, buttons);
    }
    const required = DOCUMENT_CONFIG.filter(d => d.required);
    const uploaded = required.filter(d => !!getSavedFile(d.name)).length;
    summary.innerHTML = `<strong>${uploaded}/${required.length}</strong> required documents uploaded - review by Transport Office`;
    const next = document.querySelector(".next-button");
    if (next) next.disabled = uploaded !== required.length;
}

function goNext() {
    const missing = DOCUMENT_CONFIG.filter(d => d.required && !getSavedFile(d.name));
    if (missing.length) {
        showPopup("error", "Missing Document", `Please upload: ${missing.map(d => d.label).join(", ")}.`);
        return;
    }
    window.location.href = isEmployee ? "employee-route.html" : "student-route.html";
}

const uploadBanner = document.querySelector(".verification-banner div");
if (uploadBanner) uploadBanner.innerHTML = "<strong>Upload and preview</strong><span>The Transport Office will review your documents.</span>";
renderAllDocumentStates();
