document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const queryApplicationId = params.get('applicationId');
  const storedApplicationId = localStorage.getItem('selectedApplicationId');
  const appId = /^\d+$/.test(String(queryApplicationId || '')) ? String(queryApplicationId) : storedApplicationId;

  const set = (id, value, fallback = 'Not available') => {
    const el = document.getElementById(id);
    if (el) {
      const safeValue = value === null || value === undefined || value === '' ? fallback : value;
      el.textContent = safeValue;
    }
  };

  const normalizeStatus = status => {
    const value = String(status || 'pending').toLowerCase();
    return ['paid', 'draft', 'submitted'].includes(value) ? 'pending' : value;
  };

  const formatDate = value => value ? new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : 'Not available';

  const descCap = value => String(value || 'pending').replace(/^./, char => char.toUpperCase());

  let application = null;
  let documents = [];

  function renderApplication() {
    if (!application) return;

    const employee = String(application.userType || application.passType || '').toLowerCase().includes('employee');
    const organization = employee ? application.organizationName : application.collegeName;
    const status = normalizeStatus(application.status);
    const statusElement = document.getElementById('applicationStatus');
    if (statusElement) {
      statusElement.textContent = descCap(status);
      statusElement.className = `status-chip ${status}`;
    }

    set('applicantName', application.fullName || 'Applicant');
    set('applicationId', application.applicantId || `APP-${application.applicationId}`);
    set('applicationDate', `Applied on ${formatDate(application.createdAt)}`);
    set('fullName', application.fullName || 'Not available');
    set('mobileNumber', application.mobile || 'Not available');
    set('emailAddress', application.email || 'Not available');
    set('dateOfBirth', formatDate(application.studentDob || application.employeeDob));
    set('gender', application.studentGender || application.employeeGender || 'Not available');
    set('organizationLabel', employee ? 'Company Name' : 'School / College');
    set('organizationName', organization || 'Not available');
    const studentCategory = String(application.studentCategory || '').toLowerCase();
    set('studentCategory', employee ? 'Employee' : studentCategory === 'ssc below' ? 'School Student' : studentCategory === 'ssc above' ? 'College Student' : 'Student');
    set('aadhaarNumber', application.studentIdNumber || 'Not available');
    set('fatherName', application.fatherName || 'Not available');
    set('motherName', application.motherName || 'Not available');
    set('contactNumber', application.contactNumber || 'Not available');
    set('employeeId', application.employeeId || 'Not available');
    set('department', application.department || 'Not available');
    set('designation', application.designation || 'Not available');
    set('city', employee ? application.employeeCity : application.studentCity || 'Not available');
    set('district', employee ? application.employeeDistrict : application.studentDistrict || 'Not available');
    set('state', employee ? application.employeeState : application.studentState || 'Not available');
    set('pinCode', employee ? application.employeePinCode : application.studentPinCode || 'Not available');
    set('permanentAddress', employee ? application.employeeAddress : application.studentAddress || 'Not available');
    set('fromLocation', application.fromStop || 'Not available');
    set('toLocation', application.toStop || 'Not available');
    set('distance', application.distance || 'Not available');
    set('busType', application.busType || 'Not available');
    set('passPlanName', application.planName || 'Not available');
    set('passAmount', Number(application.planAmount || application.paidAmount || 0).toLocaleString('en-IN'), '0');
    set('paymentStatus', descCap(application.paymentStatus || application.status || 'pending'));
    set('paymentMethod', application.paymentMethod || 'Not available');
    set('transactionId', application.transactionId || 'Not available');
    set('paymentAmount', `₹${Number(application.paidAmount || application.planAmount || 0).toLocaleString('en-IN')}`);

    const typeText = document.getElementById('applicationTypeText');
    if (typeText) {
      typeText.innerHTML = `<i class="fa-solid ${employee ? 'fa-briefcase' : 'fa-graduation-cap'}"></i> ${employee ? 'Employee' : 'Student'} Pass Application`;
    }

    const documentCount = document.getElementById('documentCount');
    if (documentCount) {
      documentCount.textContent = `${documents.length} Files`;
    }

    const list = document.getElementById('documentsList');
    if (list) {
      list.innerHTML = documents.length
        ? documents.map(doc => `
          <div class="doc-card">
            <div class="doc-thumb"><i class="fa-regular fa-file-lines"></i></div>
            <h4>${String(doc.documentType || 'Document').replace(/_/g, ' ')}</h4>
            <p>${doc.fileName || 'Uploaded document'}</p>
            <div class="doc-state"><span class="pending">Uploaded</span><span>Review</span></div>
          </div>
        `).join('')
        : '<p class="empty-documents">No documents uploaded.</p>';
    }
  }

  function showLoadingState() {
    ['applicantName','fullName','mobileNumber','emailAddress','dateOfBirth','gender','organizationName','studentCategory','aadhaarNumber','fatherName','motherName','contactNumber','employeeId','department','designation','city','district','state','pinCode','permanentAddress','fromLocation','toLocation','distance','busType','passPlanName','passAmount','paymentStatus','paymentMethod','transactionId','paymentAmount'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Loading…';
    });
    const status = document.getElementById('applicationStatus');
    if (status) { status.textContent = 'Loading'; status.className = 'status-chip pending'; }
    const list = document.getElementById('documentsList');
    if (list) list.innerHTML = '<p class="empty-documents">Loading selected application…</p>';
  }

  async function loadApplication() {
    if (!appId || !/^\d+$/.test(String(appId))) {
      set('applicantName', 'Application not selected');
      set('applicationId', 'Not available');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/admin/applications/${encodeURIComponent(appId)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not load the application.');

      application = result.application || null;
      documents = Array.isArray(result.documents) ? result.documents : [];
      renderApplication();
    } catch (error) {
      console.error('Admin application record load failed:', error);

      set('applicantName', 'Application unavailable');
      set('applicationId', 'Not available');
      const statusElement = document.getElementById('applicationStatus');
      if (statusElement) {
        statusElement.textContent = 'Unavailable';
        statusElement.className = 'status-chip pending';
      }
    }
  }

  function gotoVerification() {
    if (!appId || !/^\d+$/.test(String(appId))) {
      return;
    }
    localStorage.setItem('selectedApplicationId', String(appId));
    window.location.href = `admin-verification.html?applicationId=${encodeURIComponent(String(appId))}`;
  }

  const backButton = document.getElementById('backButton');
  if (backButton) backButton.addEventListener('click', () => window.location.href = 'admin-applications.html');

  const verifyNowButton = document.getElementById('verifyNowButton');
  if (verifyNowButton) verifyNowButton.addEventListener('click', gotoVerification);

  const openVerificationButton = document.getElementById('openVerificationButton');
  if (openVerificationButton) openVerificationButton.addEventListener('click', gotoVerification);

  // Each summary section can take the administrator to verification for this same application.
  document.querySelectorAll('.clickable-section').forEach(section => {
    section.addEventListener('click', event => {
      if (event.target.closest('button,a,input,select,textarea')) return;
      gotoVerification();
    });
  });

  showLoadingState();
  await loadApplication();
});
