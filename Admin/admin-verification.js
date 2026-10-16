document.addEventListener("DOMContentLoaded", async () => {
    const apiBase = "http://localhost:5000";
    const params = new URLSearchParams(window.location.search);
    const queryApplicationId = params.get("applicationId");
    const storedApplicationId = localStorage.getItem("selectedApplicationId");
    const id = /^\d+$/.test(String(queryApplicationId || "")) ? String(queryApplicationId) : storedApplicationId;
    if (id) localStorage.setItem("selectedApplicationId", String(id));
    const submit = document.getElementById("submitVerificationButton");
    const completed = new Set();
    let documentCount = 0;
    let loadedApplicationStatus = "pending";
    const reviewKey = id ? `adminVerificationChecks_${id}` : "";
    const readReviewState = () => {
        if (!reviewKey) return { checks: [], documents: [], fields: [] };
        try {
            const saved = JSON.parse(localStorage.getItem(reviewKey) || "{}");
            return {
                checks: Array.isArray(saved.checks) ? saved.checks : [],
                documents: Array.isArray(saved.documents) ? saved.documents.map(String) : [],
                fields: Array.isArray(saved.fields) ? saved.fields.map(String) : []
            };
        } catch (_) {
            return { checks: [], documents: [], fields: [] };
        }
    };
    const saveReviewState = async (documents = null) => {
        if (!id) throw new Error("Select an application before saving verification.");
        const next = {
            checks: [...completed],
            documents: (documents === null ? reviewState.documents : documents).map(String),
            fields: [...fieldVerified]
        };
        const response = await fetch(`${apiBase}/api/admin/applications/${encodeURIComponent(id)}/verification`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || "Could not save verification checks.");
        reviewState.checks = next.checks;
        reviewState.documents = next.documents;
        reviewState.fields = next.fields;
        localStorage.setItem(reviewKey, JSON.stringify({ ...next, savedAt: new Date().toISOString() }));
        return result.verification;
    };
    const reviewState = readReviewState();
    reviewState.checks.forEach(key => completed.add(key));

    const put = (key, value, fallback = "Not available") => {
        const node = document.getElementById(key);
        if (node) node.textContent = value || fallback;
    };
    const decision = () => document.querySelector('input[name="decision"]:checked')?.value;
    const date = value => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not available";


    // Field-level actions: every submitted value can be tapped and reviewed.
    const fieldVerified = new Set((reviewState.fields || []).map(String));
    let activeField = null;
    const fieldOverlay = document.getElementById("fieldActionOverlay");
    const fieldTitle = document.getElementById("fieldActionTitle");
    const fieldValue = document.getElementById("fieldActionValue");
    const fieldMeta = document.getElementById("fieldActionMeta");
    const fieldVerify = document.getElementById("fieldActionVerify");
    const fieldKeyFor = (node, index) => `${node.querySelector("strong")?.id || node.querySelector("span")?.textContent || "field"}-${index}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const saveFieldState = () => saveReviewState();
    const closeFieldAction = () => { fieldOverlay?.classList.remove("show"); fieldOverlay?.setAttribute("aria-hidden", "true"); activeField = null; };
    const openFieldAction = (node, index, group) => {
        const label = String(node.querySelector("span")?.textContent || group || "Field").replace(/\s+/g, " ").trim();
        let value = String(node.querySelector("strong")?.textContent || node.textContent || "Not available").replace(/\s+/g, " ").trim();
        if (node.classList.contains("plan-row")) value = `${document.getElementById("vPlan")?.textContent || "Pass plan"} • ${document.getElementById("vAmount")?.textContent || "Amount not available"}`;
        const key = node.dataset.fieldKey || fieldKeyFor(node, index);
        activeField = { node, key, label, value };
        if (fieldTitle) fieldTitle.textContent = label;
        if (fieldValue) fieldValue.textContent = value || "Not available";
        const kicker = document.getElementById("fieldActionKicker"); if (kicker) kicker.textContent = `${String(group || "FIELD").toUpperCase()} REVIEW`;
        const already = fieldVerified.has(key);
        if (fieldMeta) fieldMeta.innerHTML = already ? '<i class="fa-solid fa-circle-check"></i> Checked by administrator' : '<i class="fa-regular fa-hand-pointer"></i> Review the submitted value, then mark it verified';
        if (fieldVerify) { fieldVerify.disabled = already; fieldVerify.innerHTML = already ? 'Field Verified <i class="fa-solid fa-circle-check"></i>' : 'Verify Field <i class="fa-solid fa-check"></i>'; }
        fieldOverlay?.classList.add("show"); fieldOverlay?.setAttribute("aria-hidden", "false");
    };
    const markFieldVerified = async () => {
        if (!activeField) return;
        fieldVerified.add(activeField.key);
        try { await saveFieldState(); }
        catch (error) { fieldVerified.delete(activeField.key); window.alert(error.message || "Could not save field verification."); return; }
        activeField.node.classList.add("field-is-verified");
        if (fieldMeta) fieldMeta.innerHTML = '<i class="fa-solid fa-circle-check"></i> Checked by administrator';
        if (fieldVerify) { fieldVerify.disabled = true; fieldVerify.innerHTML = 'Field Verified <i class="fa-solid fa-circle-check"></i>'; }
    };
    document.getElementById("fieldActionClose")?.addEventListener("click", closeFieldAction);
    fieldOverlay?.addEventListener("click", e => { if (e.target === fieldOverlay) closeFieldAction(); });
    fieldVerify?.addEventListener("click", markFieldVerified);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && fieldOverlay?.classList.contains("show")) closeFieldAction(); });
    function makeFieldsInteractive() {
        const nodes = [
            ...document.querySelectorAll(".check-card .data-rows > div"),
            ...document.querySelectorAll(".submitted-data-rows > div"),
            ...document.querySelectorAll(".route-box > div"),
            ...document.querySelectorAll(".route-meta > div")
        ];
        const seen = new Set();
        nodes.forEach((node, index) => {
            if (seen.has(node)) return;
            seen.add(node);
            const card = node.closest(".check-card");
            const heading = String(card?.querySelector(".card-head h3")?.textContent || "Field").toLowerCase();
            const group = heading.includes("route") ? "route" : heading.includes("payment") ? "payment" : "applicant";
            node.classList.add("field-action");
            node.dataset.fieldKey = fieldKeyFor(node, index);
            node.tabIndex = 0;
            node.setAttribute("role", "button");
            node.setAttribute("aria-label", `Review ${String(node.querySelector("span")?.textContent || "field").trim()}`);
            if (fieldVerified.has(node.dataset.fieldKey)) node.classList.add("field-is-verified");
            const arrow = document.createElement("i");
            arrow.className = "fa-solid fa-chevron-right field-chevron";
            arrow.setAttribute("aria-hidden", "true");
            node.appendChild(arrow);
            node.addEventListener("click", event => {
                if (event.target.closest("button")) return;
                openFieldAction(node, index, group);
            });
            node.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openFieldAction(node, index, group);
                }
            });
        });
    }

    function updateProgress() {
        const total = 3 + (documentCount ? 1 : 0);
        const done = completed.size;
        put("reviewProgress", `${done} of ${total} checks complete`);
        const bar = document.getElementById("reviewProgressBar");
        if (bar) bar.style.width = `${total ? done / total * 100 : 0}%`;
        const action = decision();
        const ready = done === total && Boolean(action);
        if (submit) {
            submit.disabled = !ready;
            submit.classList.toggle("enabled", ready);
            submit.classList.toggle("reject-action", ready && action === "rejected");
            submit.innerHTML = action === "rejected"
                ? 'Confirm Rejection <i class="fa-solid fa-xmark"></i>'
                : 'Confirm Approval <i class="fa-solid fa-check"></i>';
        }
    }

    async function verifySection(key, button) {
        completed.add(key);
        try { await saveReviewState(); }
        catch (error) { completed.delete(key); window.alert(error.message || "Could not save verification."); updateProgress(); return; }
        button.disabled = true;
        button.classList.add("done");
        button.innerHTML = "Verified <i class=\"fa-solid fa-circle-check\"></i>";
        const status = document.getElementById({ details: "detailsStatus", route: "routeStatus", payment: "paymentStatusBadge" }[key]);
        if (status) { status.textContent = "Verified"; status.className = "verified-text"; }
        updateProgress();
    }

    function renderDocuments(documents) {
        documentCount = documents.length;
        const box = document.getElementById("verificationDocuments");
        if (!box) return;

        if (!documents.length) {
            box.innerHTML = "<p class=\"no-documents\">No documents were submitted with this application.</p>";
            put("documentProgress", "No documents");
            updateProgress();
            return;
        }

        const reviewed = new Set(reviewState.documents.map(String));

        box.innerHTML = documents.map((doc, index) => {
            const key = String(doc.id || index);
            const verified = reviewed.has(key);
            return `<article class="verify-doc ${verified ? "is-verified" : ""}" data-doc="${key}">
                <div class="doc-icon"><i class="fa-regular fa-file-lines"></i></div>
                <div>
                    <h4>${String(doc.documentType || "Document").replace(/_/g, " ")}</h4>
                    <p>${doc.fileName || "Uploaded document"}</p>
                    <small class="doc-review-state">${verified ? "Checked by administrator" : "Awaiting manual review"}</small>
                </div>
                <button type="button" data-review="${key}" ${verified ? "disabled class=\"verified\"" : ""}>${verified ? "Verified" : "Mark verified"}</button>
            </article>`;
        }).join("");

        put("documentProgress", `${reviewed.size}/${documents.length} verified`);

        box.querySelectorAll("[data-review]").forEach(button => button.addEventListener("click", async () => {
            const key = String(button.dataset.review);
            reviewed.add(key);
            if (reviewed.size === documents.length) completed.add("documents");
            try { await saveReviewState([...reviewed]); }
            catch (error) { reviewed.delete(key); if (reviewed.size !== documents.length) completed.delete("documents"); window.alert(error.message || "Could not save document verification."); return; }

            const row = button.closest(".verify-doc");
            row?.classList.add("is-verified");

            const state = row?.querySelector(".doc-review-state");
            if (state) state.textContent = "Checked by administrator";

            button.textContent = "Verified";
            button.disabled = true;
            button.classList.add("verified");

            put("documentProgress", `${reviewed.size}/${documents.length} verified`);

            updateProgress();
        }));

        if (reviewed.size === documents.length) completed.add("documents");
        updateProgress();

        // Tapping a document opens a preview/review sheet; the existing button still marks it verified.
        box.querySelectorAll(".verify-doc").forEach((row, rowIndex) => {
            row.addEventListener("click", event => {
                if (event.target.closest("[data-review]")) return;
                const doc = documents[rowIndex] || {};
                const key = String(doc.id || rowIndex);
                const overlay = document.getElementById("documentPreviewOverlay");
                const title = document.getElementById("verificationDocTitle");
                const name = document.getElementById("verificationDocName");
                const image = document.getElementById("verificationDocImage");
                const placeholder = document.getElementById("verificationDocPlaceholder");
                const verify = document.getElementById("verificationDocVerify");
                if (title) title.textContent = String(doc.documentType || "Document").replace(/_/g, " ");
                if (name) name.textContent = doc.fileName || "Uploaded document";
                const documentType = String(doc.documentType || "").toLowerCase();
                const localPreviewKeys = {
                    passport_photo: ["bp_document_student_photo_preview", "bp_document_employee_photo_preview", "passport_photo_preview"],
                    student_id: ["bp_document_student_student ID_preview", "bp_document_student_student id_preview", "student_id_preview"],
                    employee_id: ["bp_document_employee_employee ID_preview", "bp_document_employee_employee id_preview", "employee_id_preview"],
                    aadhaar: ["bp_document_student_Aadhaar card_preview", "bp_document_student_aadhaar card_preview", "aadhaar_preview"],
                    address_proof: ["bp_document_student_Address proof_preview", "bp_document_student_address proof_preview", "address_proof_preview"]
                }[documentType] || [`${documentType}_preview`, `document_${documentType}_preview`];
                const src = doc.previewData || localPreviewKeys.map(key => localStorage.getItem(key)).find(Boolean) || "";
                if (image) { image.src = src || ""; image.classList.toggle("show", Boolean(src)); }
                if (placeholder) placeholder.hidden = Boolean(src);
                if (verify) {
                    verify.disabled = reviewed.has(key); verify.innerHTML = reviewed.has(key) ? "Verified" : "Mark verified <i class=\"fa-solid fa-check\"></i>";
                    verify.onclick = async () => {
                        reviewed.add(key); row.classList.add("is-verified");
                        if (reviewed.size === documents.length) completed.add("documents");
                        try { await saveReviewState([...reviewed]); }
                        catch (error) { reviewed.delete(key); row.classList.remove("is-verified"); if (reviewed.size !== documents.length) completed.delete("documents"); window.alert(error.message || "Could not save document verification."); return; }
                        const state = row.querySelector(".doc-review-state"); if (state) state.textContent = "Checked by administrator";
                        const original = row.querySelector("[data-review]"); if (original) { original.textContent = "Verified"; original.disabled = true; original.classList.add("verified"); }
                        verify.disabled = true; verify.textContent = "Verified";
                        put("documentProgress", `${reviewed.size}/${documents.length} verified`);
                        updateProgress();
                    };
                }
                overlay?.classList.add("show");
            });
        });
        document.getElementById("closeVerificationDoc")?.addEventListener("click", () => document.getElementById("documentPreviewOverlay")?.classList.remove("show"));

    }

    // Keep navigation tied to the exact application selected in the list.
    document.getElementById("backButton")?.addEventListener("click", () => {
        window.location.href = `application-details.html?applicationId=${encodeURIComponent(String(id || ""))}`;
    });
    document.getElementById("detailsButton")?.addEventListener("click", () => {
        window.location.href = `application-details.html?applicationId=${encodeURIComponent(String(id || ""))}`;
    });

    if (!id || !/^\d+$/.test(id)) { put("verificationName", "Application not selected"); return; }
    try {
        const response = await fetch(`${apiBase}/api/admin/applications/${encodeURIComponent(id)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not load application.");
        const app = result.application;
        const verificationResponse = await fetch(`${apiBase}/api/admin/applications/${encodeURIComponent(id)}/verification`, { cache: "no-store" });
        const verificationResult = await verificationResponse.json().catch(() => ({}));
        if (!verificationResponse.ok || !verificationResult.success) throw new Error(verificationResult.message || "Could not load saved verification checks.");
        reviewState.checks = verificationResult.verification?.checks || [];
        reviewState.documents = verificationResult.verification?.documents || [];
        reviewState.fields = verificationResult.verification?.fields || [];
        completed.clear(); reviewState.checks.forEach(key => completed.add(String(key)));
        fieldVerified.clear(); reviewState.fields.forEach(key => fieldVerified.add(String(key)));
        [["verifyDetailsButton", "details"], ["verifyRouteButton", "route"], ["verifyPaymentButton", "payment"]].forEach(([buttonId, key]) => {
            if (!completed.has(key)) return;
            const button = document.getElementById(buttonId);
            if (button) { button.disabled = true; button.classList.add("done"); button.innerHTML = "Verified <i class=\"fa-solid fa-circle-check\"></i>"; }
            const statusNode = document.getElementById({ details: "detailsStatus", route: "routeStatus", payment: "paymentStatusBadge" }[key]);
            if (statusNode) { statusNode.textContent = "Verified"; statusNode.className = "verified-text"; }
        });
        const employee = app.userType === "employee" || String(app.passType).toLowerCase().includes("employee");
        const org = employee ? app.organizationName : app.collegeName;
        put("verificationName", app.fullName); put("verificationId", app.applicantId || `APP-${app.applicationId}`); put("verificationType", app.passType);
        const status = document.getElementById("verificationAppStatus");
        loadedApplicationStatus = String(app.status || "pending").toLowerCase();
        if (status) {
            const value = loadedApplicationStatus;
            status.textContent = value.replace(/^./, c => c.toUpperCase());
            status.className = `status-chip ${value === "paid" ? "pending" : value}`;
        }
        if (["approved", "rejected", "completed"].includes(loadedApplicationStatus)) {
            document.querySelectorAll('input[name="decision"]').forEach(input => {
                input.disabled = true;
            });
            if (submit) {
                submit.disabled = true;
                submit.innerHTML = loadedApplicationStatus === "rejected"
                    ? 'Application Rejected <i class="fa-solid fa-xmark"></i>'
                    : 'Application Already Approved <i class="fa-solid fa-check"></i>';
            }
        }
        put("vFullName", app.fullName); put("vMobile", app.mobile); put("vEmail", app.email); put("vOrgLabel", employee ? "Organization" : "College"); put("vOrg", org);
        put("vDob", date(app.studentDob || app.employeeDob)); put("vGender", app.studentGender || app.employeeGender); put("vIdNumber", employee ? app.employeeId : app.studentIdNumber); put("vFatherName", app.fatherName); put("vMotherName", app.motherName); put("vDepartment", app.department); put("vDesignation", app.designation); put("vCity", employee ? app.employeeCity : app.studentCity); put("vDistrict", employee ? app.employeeDistrict : app.studentDistrict); put("vState", employee ? app.employeeState : app.studentState); put("vPinCode", employee ? app.employeePinCode : app.studentPinCode); put("vAddress", employee ? app.employeeAddress : app.studentAddress);
        put("vFrom", app.fromStop); put("vTo", app.toStop); put("vDistance", app.distance); put("vBusType", app.busType); put("vPlan", app.planName); put("vAmount", `₹${Number(app.planAmount || app.paidAmount || 0).toLocaleString("en-IN")}`); put("vPaymentMethod", app.paymentMethod); put("vTransaction", app.transactionId); put("vPaidAmount", `₹${Number(app.paidAmount || app.planAmount || 0).toLocaleString("en-IN")}`);
        renderDocuments(Array.isArray(result.documents) ? result.documents : []);
        makeFieldsInteractive();
        [["verifyDetailsButton", "details"], ["verifyRouteButton", "route"], ["verifyPaymentButton", "payment"]].forEach(([buttonId, key]) => document.getElementById(buttonId)?.addEventListener("click", event => verifySection(key, event.currentTarget)));
        document.querySelectorAll('input[name="decision"]').forEach(input => input.addEventListener("change", () => {
            updateProgress();
            const card = document.querySelector(".decision-card");
            if (card) card.classList.toggle("rejection-selected", input.value === "rejected" && input.checked);
            document.getElementById("decisionOverlay")?.classList.remove("show");
            input.blur();
        }));
        const decisionOverlay = document.getElementById("decisionOverlay");
        const decisionReason = document.getElementById("decisionReason");
        const decisionConfirm = document.getElementById("decisionConfirm");
        function openDecisionScreen(action) {
            const approved = action === "approved";
            const ready = completed.size === 3 + (documentCount ? 1 : 0);
            const icon = document.getElementById("decisionIcon");
            if (icon) {
                icon.className = `decision-modal-icon ${approved ? "approved" : "rejected"}`;
                icon.innerHTML = `<i class="fa-solid ${approved ? "fa-circle-check" : "fa-circle-xmark"}"></i>`;
            }
            put("decisionKicker", approved ? "APPROVAL ACTION" : "REJECTION ACTION");
            put("decisionTitle", approved ? "Approve Application?" : "Reject Application?");
            put("decisionMessage", approved ? "The pass will be issued after the application is approved." : "Add a reason so the applicant understands why this application was rejected.");
            const warning = document.getElementById("checkWarning");
            if (warning) warning.hidden = ready;
            if (decisionReason) {
                decisionReason.hidden = approved;
                decisionReason.value = approved ? "" : decisionReason.value;
            }
            if (decisionConfirm) {
                decisionConfirm.className = approved ? "approve-confirm" : "reject-confirm";
                decisionConfirm.innerHTML = approved ? 'Approve Application <i class="fa-solid fa-check"></i>' : 'Reject Application <i class="fa-solid fa-xmark"></i>';
                decisionConfirm.disabled = !ready || (!approved && !decisionReason?.value.trim());
            }
            decisionOverlay?.classList.add("show");
            decisionOverlay?.scrollTo?.(0, 0);
        }
        decisionReason?.addEventListener("input", () => {
            if (decisionConfirm && decision() === "rejected") decisionConfirm.disabled = completed.size !== 3 + (documentCount ? 1 : 0) || !decisionReason.value.trim();
        });
        document.getElementById("decisionCancel")?.addEventListener("click", () => decisionOverlay?.classList.remove("show"));
        decisionConfirm?.addEventListener("click", () => {
            if (decisionConfirm.disabled) return;
            if (decision() === "rejected") {
                const rejectionReason = document.getElementById("rejectionReason");
                if (rejectionReason) rejectionReason.value = decisionReason?.value.trim() || "Application details or documents could not be verified.";
            }
            decisionOverlay?.classList.remove("show");
            submit?.click();
        });
        submit?.addEventListener("click", () => {
            const action = decision(); if (!action || submit.disabled) return;
            put("confirmTitle", action === "approved" ? "Approve application?" : "Reject application?");
            put("confirmText", action === "approved" ? "All manual checks are complete. This decision will be saved." : "This will close the application as rejected.");
            document.getElementById("confirmOverlay")?.classList.add("show");
        });
        document.getElementById("confirmationCancel")?.addEventListener("click", () => document.getElementById("confirmOverlay")?.classList.remove("show"));
        document.getElementById("confirmationSubmit")?.addEventListener("click", async event => {
            const action = decision();
            if (!action) return;
            if (["approved", "rejected", "completed"].includes(loadedApplicationStatus)) return;
            event.currentTarget.disabled = true;
            try {
                const save = await fetch(`${apiBase}/api/admin/applications/${encodeURIComponent(id)}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action, reason: action === "rejected" ? (document.getElementById("rejectionReason")?.value.trim() || decisionReason?.value.trim() || "") : "" }) });
                const saved = await save.json(); if (!save.ok || !saved.success) throw new Error(saved.message || "Could not save the decision.");
                localStorage.setItem(`adminApplicationStatus_${id}`, action);
                if (reviewKey) localStorage.removeItem(reviewKey);
                if (action === "rejected") localStorage.setItem(`adminApplicationRejection_${id}`, document.getElementById("rejectionReason")?.value.trim() || decisionReason?.value.trim() || "");
                document.getElementById("confirmOverlay")?.classList.remove("show");
                const resultOverlay = document.getElementById("resultOverlay");
                const resultIcon = document.getElementById("resultIcon");
                const resultTitle = document.getElementById("resultTitle");
                const resultText = document.getElementById("resultText");
                const resultPrimary = document.getElementById("resultPrimary");
                if (resultIcon) {
                    resultIcon.className = `result-icon ${action}`;
                    resultIcon.innerHTML = `<i class="fa-solid ${action === "approved" ? "fa-circle-check" : "fa-circle-xmark"}"></i>`;
                }
                if (resultTitle) resultTitle.textContent = action === "approved" ? "Application Approved" : "Application Rejected";
                if (resultText) resultText.textContent = action === "approved"
                    ? "The applicant's pass is now ready in Approved Passes."
                    : "The application was marked rejected and the applicant will see the updated status.";
                if (resultPrimary) {
                    resultPrimary.innerHTML = action === "approved"
                        ? 'Open Approved Passes <i class="fa-solid fa-arrow-right"></i>'
                        : 'View Rejected Applications <i class="fa-solid fa-arrow-right"></i>';
                    resultPrimary.onclick = () => { window.location.href = action === "approved" ? "admin-approved.html" : "admin-applications.html?status=rejected"; };
                }
                document.getElementById("resultSecondary")?.addEventListener("click", () => { window.location.href = "admin-applications.html"; }, { once: true });
                resultOverlay?.classList.add("show");
            } catch (error) {
                event.currentTarget.disabled = false;
                console.error("Unable to save the verification decision:", error);
            }
        });
    } catch (error) { console.error(error); put("verificationName", "Application unavailable"); put("verificationAppStatus", "Unavailable"); }
});
