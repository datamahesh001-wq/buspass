document.addEventListener("DOMContentLoaded", function () {
  const apiBase = "http://localhost:5000";
  const backButton = document.getElementById("backButton");
  const moreButton = document.getElementById("moreButton");
  const moreMenu = document.getElementById("moreMenu");
  const printPassButton = document.getElementById("printPassButton");
  const downloadPassButton = document.getElementById("downloadPassButton");
  const sharePassButton = document.getElementById("sharePassButton");
  const toastMessage = document.getElementById("toastMessage");
  const toastText = document.getElementById("toastText");
  const approvedUserPicker = document.getElementById("approvedUserPicker");
  const adminPassView = document.getElementById("adminPassView");
  const approvedContent = document.getElementById("approvedContent");
  const headerKicker = document.querySelector(".header-title p");
  const headerTitle = document.querySelector(".header-title h1");

  const editPassButton = document.getElementById("editPassButton");
  const passEditPanel = document.getElementById("passEditPanel");
  const closeEditButton = document.getElementById("closeEditButton");
  const cancelEditButton = document.getElementById("cancelEditButton");
  const saveEditButton = document.getElementById("saveEditButton");

  const fields = {
    passId: document.getElementById("passId"),
    studentName: document.getElementById("studentName"),
    collegeName: document.getElementById("collegeName"),
    courseName: document.getElementById("courseName"),
    distance: document.getElementById("distance"),
    validUntil: document.getElementById("validUntil"),
    routeFrom: document.getElementById("routeFrom"),
    routeTo: document.getElementById("routeTo"),
    barcodeNumber: document.getElementById("barcodeNumber"),
    barcodeText: document.getElementById("barcodeText"),
    passStatus: document.getElementById("passStatus"),
    validityStatus: document.getElementById("validityStatus"),
    controlText: document.getElementById("controlText")
  };

  let approvedApplications = [];
  let selectedApplication = null;

  function showApprovedUsers() {
    if (approvedUserPicker) approvedUserPicker.hidden = false;
    if (adminPassView) adminPassView.hidden = true;
    if (headerKicker) headerKicker.textContent = "ISSUED PASSES";
    if (headerTitle) headerTitle.textContent = "Approved Bus Passes";
    if (approvedContent) approvedContent.scrollTop = 0;
  }

  function showSelectedPass() {
    if (approvedUserPicker) approvedUserPicker.hidden = true;
    if (adminPassView) adminPassView.hidden = false;
    if (headerKicker) headerKicker.textContent = "APPROVED APPLICATION";
    if (headerTitle) headerTitle.textContent = "Government Bus Pass";
    if (approvedContent) approvedContent.scrollTop = 0;
  }

  const editors = {
    studentName: document.getElementById("editStudentName"),
    collegeName: document.getElementById("editCollegeName"),
    courseName: document.getElementById("editCourseName"),
    distance: document.getElementById("editDistance"),
    routeFrom: document.getElementById("editRouteFrom"),
    routeTo: document.getElementById("editRouteTo"),
    validUntil: document.getElementById("editValidUntil"),
    status: document.getElementById("editStatus")
  };

  // Keep editing in an overlay owned by the phone screen, not in the scrolling pass content.
  const appContainer = document.querySelector(".app-container");
  if (appContainer && passEditPanel) appContainer.appendChild(passEditPanel);

  function getStoredPass() {
    try {
      const stored = JSON.parse(localStorage.getItem("approvedApplication") || "null");
      return stored && typeof stored === "object" ? stored : null;
    } catch (_) {
      return null;
    }
  }

  function renderPass(data) {
    if (!data) return;
    const passType = data.passType || "Bus Pass";
    const photoElement = document.getElementById("studentPhoto");
    const passTypeElement = document.getElementById("adminPassType");
    if (photoElement) {
      if (data.passportPhoto) {
        photoElement.src = data.passportPhoto;
        photoElement.style.display = "block";
      } else {
        photoElement.removeAttribute("src");
        photoElement.style.display = "none";
      }
    }
    if (passTypeElement) passTypeElement.textContent = passType.toUpperCase();
    fields.passId.textContent = data.passId || "--";
    fields.studentName.textContent = data.studentName || "--";
    fields.collegeName.textContent = data.collegeName || "--";
    fields.courseName.textContent = data.courseName || "--";
    fields.distance.textContent = data.distance === "Not available" || data.distance === "" || data.distance === null || data.distance === undefined
      ? "--"
      : (String(data.distance).match(/\bkm\b/i) ? data.distance : `${data.distance} KM`);
    fields.validUntil.textContent = data.validUntil || "--";
    fields.routeFrom.textContent = data.from || "--";
    fields.routeTo.textContent = data.to || "--";
    fields.barcodeNumber.textContent = data.passId || "--";
    fields.barcodeText.textContent = data.passId || "--";
    const status = String(data.status || "ACTIVE").toUpperCase();
    fields.passStatus.innerHTML = `<i class="fa-solid ${status === "ACTIVE" ? "fa-circle-check" : "fa-circle-xmark"}"></i> ${status}`;
    fields.passStatus.classList.toggle("inactive-status", status !== "ACTIVE");
    fields.validityStatus.textContent = status;
    fields.controlText.textContent = status === "ACTIVE" ? "Pass is active and ready for travel." : `Pass is ${status.toLowerCase()}.`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function renderApprovedUsers() {
    const list = document.getElementById("approvedUserList");
    const count = document.getElementById("approvedUserCount");
    const empty = document.getElementById("approvedUserEmpty");
    if (!list) return;
    if (count) count.textContent = approvedApplications.length;
    if (empty) empty.hidden = approvedApplications.length > 0;
    list.innerHTML = approvedApplications.map(application => `
      <button class="approved-user-card ${selectedApplication && String(selectedApplication.applicationId) === String(application.applicationId) ? "active" : ""}" type="button" data-application-id="${escapeHtml(application.applicationId)}">
        <span class="approved-user-avatar"><i class="fa-solid fa-user"></i></span>
        <span class="approved-user-copy"><strong>${escapeHtml(application.fullName || "Applicant")}</strong><small>${escapeHtml(application.applicantId || `APP-${application.applicationId}`)} · ${escapeHtml(application.passType || "Bus Pass")}</small></span>
        <span class="approved-user-status"><i class="fa-solid fa-circle-check"></i> Approved</span>
      </button>`).join("");
    list.querySelectorAll("[data-application-id]").forEach(button => {
      button.addEventListener("click", () => selectApprovedApplication(button.dataset.applicationId));
    });
  }

  function dateInputValue(value) {
    if (!value) return "";
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatPassDate(value) {
    const iso = dateInputValue(value);
    if (!iso) return "";
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function displayPassStatus(value) {
    const status = String(value || "active").toLowerCase();
    if (["cancelled", "suspended", "inactive"].includes(status)) return "INACTIVE";
    if (status === "expired") return "EXPIRED";
    return "ACTIVE";
  }

  function passDataFromApplication(application) {
    const employee = String(application.userType || application.passType || "").toLowerCase().includes("employee");
    const validToISO = dateInputValue(application.validTo || application.valid_to || application.validToISO || application.validUntil);
    return {
      applicationId: application.applicationId || application.application_id || "",
      passId: application.passId || application.pass_id || application.transactionId || `BP${String(application.applicationId || application.application_id || 0).padStart(8, "0")}`,
      studentName: application.fullName || application.holderName || "",
      collegeName: employee ? (application.organizationName || application.collegeName || "") : (application.collegeName || application.organizationName || ""),
      courseName: employee ? (application.designation || application.classCourse || application.planName || application.passType) : (application.classCourse || application.courseName || application.planName || application.passType),
      passType: application.passType || (employee ? "Employee Pass" : "Student Pass"),
      from: application.fromStop || application.from_stop || "",
      to: application.toStop || application.to_stop || "",
      distance: application.distance || application.distanceKm || application.distance_km || "Not available",
      validToISO,
      validUntil: formatPassDate(validToISO) || application.validUntil || "",
      status: displayPassStatus(application.passStatus || application.pass_status),
      passportPhoto: application.passportPhoto || application.passport_photo || ""
    };
  }

  async function selectApprovedApplication(applicationId) {
    const cachedApplication = approvedApplications.find(application => String(application.applicationId) === String(applicationId));
    try {
      const response = await fetch(`${apiBase}/api/admin/applications/${encodeURIComponent(applicationId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load approved pass.");
      selectedApplication = result.application;
      const passportPhoto = (result.documents || []).find(document => document.documentType === "passport_photo")?.previewData || "";
      selectedApplication.passportPhoto = passportPhoto;
      localStorage.setItem("selectedApplicationId", String(applicationId));
      localStorage.setItem("approvedApplication", JSON.stringify(passDataFromApplication(selectedApplication)));
      renderApprovedUsers();
      renderPass(passDataFromApplication(selectedApplication));
      showSelectedPass();
      showToast(`${selectedApplication.fullName || "User"}'s approved pass loaded.`);
    } catch (error) {
      if (cachedApplication) {
        selectedApplication = cachedApplication;
        localStorage.setItem("selectedApplicationId", String(applicationId));
        renderApprovedUsers();
        renderPass(passDataFromApplication(selectedApplication));
        showSelectedPass();
      }
      showToast("Could not load this approved user's pass.");
      console.error("Approved pass load failed:", error);
    }
  }

  async function loadApprovedApplications() {
    try {
      const response = await fetch(`${apiBase}/api/admin/dashboard`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load approved passes.");
      const serverApplications = Array.isArray(result.applications) ? result.applications : [];
      approvedApplications = serverApplications
        .filter(application => ["approved", "completed"].includes(String(application.status || "").toLowerCase()));
      renderApprovedUsers();
    } catch (error) {
      // Keep the currently rendered server-backed records on a temporary
      // outage; never substitute a disconnected browser cache as the source.
      renderApprovedUsers();
      console.error("Approved applications load failed:", error);
    }
  }

  function fillEditor(data) {
    editors.studentName.value = data.studentName || "";
    editors.collegeName.value = data.collegeName || "";
    editors.courseName.value = data.courseName || "";
    editors.distance.value = data.distance || "";
    editors.routeFrom.value = data.from || "";
    editors.routeTo.value = data.to || "";
    editors.validUntil.value = data.validToISO || dateInputValue(data.validUntil) || "";
    editors.status.value = displayPassStatus(data.status);
  }

  function openEditor() {
    const data = getStoredPass();
    if (!data) {
      showToast("No issued pass is selected to edit.");
      return;
    }
    fillEditor(data);
    passEditPanel.hidden = false;
    editors.studentName.focus();
  }

  function closeEditor() { passEditPanel.hidden = true; }

  async function saveEditor() {
    const current = selectedApplication ? passDataFromApplication(selectedApplication) : getStoredPass();
    const applicationId = selectedApplication?.applicationId || localStorage.getItem("selectedApplicationId") || current?.applicationId;
    if (!current || !applicationId) {
      showToast("No issued pass is selected.");
      return;
    }

    const validTo = dateInputValue(editors.validUntil.value);
    if (!validTo) {
      showToast("Enter the expiry date as YYYY-MM-DD.");
      editors.validUntil.focus();
      return;
    }

    const updated = {
      ...current,
      applicationId,
      studentName: editors.studentName.value.trim(),
      collegeName: editors.collegeName.value.trim(),
      courseName: editors.courseName.value.trim(),
      distance: editors.distance.value.trim(),
      from: editors.routeFrom.value.trim(),
      to: editors.routeTo.value.trim(),
      validToISO: validTo,
      validUntil: formatPassDate(validTo),
      status: displayPassStatus(editors.status.value)
    };

    try {
      const response = await fetch(`${apiBase}/api/admin/passes/${encodeURIComponent(applicationId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holderName: updated.studentName,
          institution: updated.collegeName,
          course: updated.courseName,
          distance: updated.distance,
          fromStop: updated.from,
          toStop: updated.to,
          validTo: updated.validToISO,
          status: updated.status
        })
      });
      const result = await response.json().catch(() => ({ success: false, message: "Could not save pass details." }));
      if (!response.ok || !result.success) throw new Error(result.message || "Could not save pass details.");

      updated.status = displayPassStatus(result.passStatus || updated.status);
      updated.validToISO = result.validTo || updated.validToISO;
      updated.validUntil = formatPassDate(updated.validToISO) || updated.validUntil;
      if (selectedApplication) {
        selectedApplication.fullName = updated.studentName;
        if (String(selectedApplication.passType || "").toLowerCase().includes("employee")) {
          selectedApplication.organizationName = updated.collegeName;
          selectedApplication.designation = updated.courseName;
        } else {
          selectedApplication.collegeName = updated.collegeName;
          selectedApplication.classCourse = updated.courseName;
        }
        selectedApplication.fromStop = updated.from;
        selectedApplication.toStop = updated.to;
        selectedApplication.distance = updated.distance;
        selectedApplication.validTo = updated.validToISO;
        selectedApplication.passStatus = updated.status === "INACTIVE" || updated.status === "SUSPENDED" ? "cancelled" : updated.status.toLowerCase();
      }
      localStorage.setItem("approvedApplication", JSON.stringify(updated));
      renderPass(updated);
      closeEditor();
      showToast("Pass details updated successfully.");
    } catch (error) {
      console.error("Could not save issued pass:", error);
      showToast(error.message || "Could not save pass details.");
    }
  }

  function showToast(message) {
    if (!toastMessage || !toastText) return;
    toastText.textContent = message;
    toastMessage.classList.add("show");
    setTimeout(() => toastMessage.classList.remove("show"), 2300);
  }

  backButton?.addEventListener("click", () => {
    if (adminPassView && !adminPassView.hidden) { showApprovedUsers(); return; }
    window.location.href = "admin-dashboard.html";
  });
  editPassButton?.addEventListener("click", openEditor);
  closeEditButton?.addEventListener("click", closeEditor);
  cancelEditButton?.addEventListener("click", closeEditor);
  saveEditButton?.addEventListener("click", saveEditor);

  moreButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    moreMenu?.classList.toggle("show");
  });
  document.addEventListener("click", (event) => {
    if (moreMenu && moreButton && !moreMenu.contains(event.target) && !moreButton.contains(event.target)) moreMenu.classList.remove("show");
  });

  printPassButton?.addEventListener("click", () => {
    moreMenu.classList.remove("show");
    showToast("Preparing the pass for printing...");
    setTimeout(() => window.print(), 450);
  });

  downloadPassButton?.addEventListener("click", () => {
    moreMenu.classList.remove("show");
    const data = getStoredPass();
    const text = [
      "BUS PASS MANAGEMENT SYSTEM",
      "BUS PASS", "Pass Number: " + (data.passId || ""), "Holder Name: " + (data.studentName || ""),
      "Institution: " + (data.collegeName || ""), "Course: " + (data.courseName || ""),
      "Route: " + (data.from || "") + " -> " + (data.to || ""), "Distance: " + (data.distance || ""),
      "Valid Until: " + (data.validUntil || ""), "Status: " + (data.status || "ACTIVE")
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${data.passId || "bus-pass"}.txt`; a.click();
    URL.revokeObjectURL(url);
    showToast("Pass details downloaded.");
  });

  sharePassButton?.addEventListener("click", async () => {
    moreMenu.classList.remove("show");
    const data = getStoredPass();
    const shareText = `${data.studentName || "User"} — ${data.passId || "Bus Pass"} — ${data.from || ""} to ${data.to || ""}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Bus Pass", text: shareText }); } catch (_) {}
    } else {
      try { await navigator.clipboard.writeText(shareText); showToast("Pass summary copied."); }
      catch (_) { showToast("Share is unavailable in this browser."); }
    }
  });

  showApprovedUsers();
  loadApprovedApplications();
  window.setInterval(() => {
    if (!document.hidden) loadApprovedApplications();
  }, 5000);
});
