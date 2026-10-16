/* User details reads the existing application endpoint and dashboard payload. No write operations. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const apiBase = 'http://localhost:5000';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const selectedId = params.get('applicationId');
  const selectedApplicant = params.get('applicantId');
  let currentApplication = null;
  let copyTimer = null;

  const escText = value => value === null || value === undefined || String(value).trim() === '' ? 'Not available' : String(value).trim();
  const setText = (id, value, fallback = 'Not available') => {
    const node = $(id);
    if (!node) return;
    const raw = value === null || value === undefined || String(value).trim() === '' ? fallback : String(value);
    node.textContent = raw;
  };
  const typeOf = row => {
    const userType = String(row.userType || '').toLowerCase();
    const applicantId = String(row.applicantId || '').toUpperCase();
    const passType = String(row.passType || '').toLowerCase();
    return userType.includes('employee') || applicantId.startsWith('EMP') || passType.includes('employee') ? 'employee' : 'student';
  };
  const statusOf = row => String(row.status || '').trim().toLowerCase();
  const statusMeta = row => {
    const value = statusOf(row);
    if (['active','approved','completed'].includes(value)) return { label: value === 'completed' ? 'Completed' : value === 'approved' ? 'Approved' : 'Active', key: 'active', icon: 'fa-circle-check' };
    if (['pending','paid','draft','submitted','under review','under_review'].includes(value)) return { label: 'Pending', key: 'pending', icon: 'fa-clock' };
    if (['rejected','declined','cancelled','canceled'].includes(value)) return { label: 'Rejected', key: 'rejected', icon: 'fa-circle-xmark' };
    if (value === 'expired') return { label: 'Expired', key: 'expired', icon: 'fa-calendar-xmark' };
    return { label: escText(row.status), key: 'pending', icon: 'fa-circle-question' };
  };
  const parseDate = value => {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  };
  const parseDateTime = value => {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  };
  const amount = value => {
    if (value === null || value === undefined || value === '') return 'Not recorded';
    const parsed = Number(String(value).replace(/[₹,\s]/g, ''));
    return Number.isFinite(parsed) ? `₹${parsed.toLocaleString('en-IN', { maximumFractionDigits:2 })}` : escText(value);
  };
  const origin = row => row.fromStop || row.from || row.origin || 'Not recorded';
  const destination = row => row.toStop || row.to || row.destination || 'Not recorded';
  const org = row => row.organizationName || row.organization || row.collegeName || row.college || 'Not recorded';
  const numericApplicationId = row => row.applicationId ?? row.id ?? '';

  function showError(title, message) {
    $('userDetailsLoading').hidden = true;
    $('userDetailsContent').hidden = true;
    $('userDetailsError').hidden = false;
    setText('userDetailsErrorTitle', title);
    setText('userDetailsErrorText', message);
  }

  function setLink(id, href, disabled = false) {
    const node = $(id);
    if (!node) return;
    node.href = href || '#';
    if (disabled || !href) {
      node.setAttribute('aria-disabled', 'true');
      node.addEventListener('click', event => event.preventDefault(), { once: true });
    } else {
      node.removeAttribute('aria-disabled');
    }
  }

  function render(row) {
    currentApplication = row;
    const type = typeOf(row);
    const status = statusMeta(row);
    const applicationId = numericApplicationId(row);
    const applicantId = row.applicantId || (applicationId ? `APP-${applicationId}` : 'ID not recorded');
    const mobile = row.mobile || row.mobileNumber || row.phone || '';
    const email = row.email || '';
    const organisationLabel = type === 'employee' ? 'Employer / Organization' : 'College / Institution';

    const avatar = $('profileAvatar');
    avatar.classList.toggle('employee', type === 'employee');
    avatar.innerHTML = `<i class="fa-solid ${type === 'employee' ? 'fa-user-tie' : 'fa-user-graduate'}" aria-hidden="true"></i>`;
    $('profileStatus').className = `detail-status-pill ${status.key}`;
    $('profileStatus').innerHTML = `<i class="fa-solid ${status.icon}" aria-hidden="true"></i> ${escText(status.label)}`;
    setText('profileType', `${type.toUpperCase()} PROFILE`);
    setText('profileName', row.fullName || row.name);
    setText('profileApplicantId', applicantId);

    setText('detailMobile', mobile || 'Not recorded');
    setText('detailEmail', email || 'Not recorded');
    setText('detailAddress', row.address || row.permanentAddress || row.currentAddress || row.residentialAddress || 'Not recorded');
    setText('detailType', type === 'employee' ? 'Employee' : 'Student');
    setText('detailStatus', status.label);
    $('detailStatus').className = `status-${status.key}`;
    setText('detailOrganisationLabel', organisationLabel);
    setText('detailOrganisation', org(row));
    setText('detailApplicationId', applicationId ? `#${applicationId}` : 'Not recorded');
    setText('detailApplicationDate', parseDate(row.createdAt || row.applicationDate));
    setText('detailFromStop', origin(row));
    setText('detailToStop', destination(row));
    setText('detailPassType', row.passType || row.passPlan || 'Not recorded');
    setText('detailPlanName', row.planName || row.plan || 'Not recorded');
    setText('detailPlanAmount', amount(row.planAmount));
    setText('detailPassId', row.passId || 'Not issued');
    setText('detailDistance', row.distance ? `${row.distance} km` : 'Not recorded');
    setText('detailValidTo', parseDate(row.validTo));
    setText('detailPaymentStatus', row.paymentStatus || (row.transactionId ? 'Successful' : 'Not recorded'));
    setText('detailAmountPaid', amount(row.paidAmount));
    setText('detailTransactionId', row.transactionId || 'Not recorded');

    setLink('reviewApplicationButton', applicationId ? `application-details.html?applicationId=${encodeURIComponent(applicationId)}` : 'admin-applications.html', !applicationId);
    setLink('openFullApplication', applicationId ? `application-details.html?applicationId=${encodeURIComponent(applicationId)}` : 'admin-applications.html', !applicationId);
    setLink('paymentDetailsButton', applicationId ? `admin-payment-details.html?applicationId=${encodeURIComponent(applicationId)}` : 'admin-payments.html', !applicationId);
    if (mobile) { setLink('callUserButton', `tel:${String(mobile).replace(/[^+\d]/g, '')}`); } else setLink('callUserButton', '', true);
    if (email) { setLink('emailUserButton', `mailto:${encodeURIComponent(email)}`); } else setLink('emailUserButton', '', true);
    $('userDetailsLoading').hidden = true;
    $('userDetailsError').hidden = true;
    $('userDetailsContent').hidden = false;
  }

  async function fetchApplication(id) {
    const response = await fetch(`${apiBase}/api/admin/applications/${encodeURIComponent(String(id))}`, { cache:'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.success || !payload.application) throw new Error(payload.message || 'Could not load the requested application');
    return payload.application;
  }

  async function loadDetails() {
    $('userDetailsLoading').hidden = false;
    $('userDetailsError').hidden = true;
    $('userDetailsContent').hidden = true;
    try {
      if (selectedId && /^\d+$/.test(selectedId)) {
        render(await fetchApplication(selectedId));
        return;
      }
      const response = await fetch(`${apiBase}/api/admin/dashboard`, { cache:'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success || !Array.isArray(payload.applications)) throw new Error('Could not load dashboard records');
      const matches = payload.applications.filter(row => String(row.applicantId || '').toLowerCase() === String(selectedApplicant || '').toLowerCase());
      if (!matches.length) throw new Error('No matching applicant was found');
      matches.sort((a,b) => (Date.parse(b.createdAt || b.applicationDate || '') || 0) - (Date.parse(a.createdAt || a.applicationDate || '') || 0));
      const appId = numericApplicationId(matches[0]);
      render(/^\d+$/.test(String(appId)) ? await fetchApplication(appId) : matches[0]);
    } catch (error) {
      console.error('Admin user detail load failed:', error);
      showError('User details unavailable', 'The selected profile could not be loaded. Check the local server and try again.');
    }
  }

  $('backButton').addEventListener('click', () => { location.href = 'admin-user-management.html'; });
  $('notificationButton').addEventListener('click', () => { location.href = 'admin-profile.html#notifications'; });
  $('retryUserDetails').addEventListener('click', loadDetails);
  $('copyApplicantId').addEventListener('click', async () => {
    if (!currentApplication) return;
    const id = currentApplication.applicantId || (numericApplicationId(currentApplication) ? `APP-${numericApplicationId(currentApplication)}` : '');
    if (!id) return;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(String(id));
      else {
        const area = document.createElement('textarea'); area.value = String(id); area.readOnly = true; area.style.position = 'absolute'; area.style.left = '-9999px'; document.body.appendChild(area); area.select();
        const copied = document.execCommand('copy'); area.remove(); if (!copied) throw new Error('Copy unavailable');
      }
      $('copyUserFeedback').hidden = false;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { $('copyUserFeedback').hidden = true; }, 1600);
    } catch (error) {
      $('copyUserFeedback').textContent = 'Copy is unavailable in this browser'; $('copyUserFeedback').hidden = false;
    }
  });

  if ((!selectedId || !/^\d+$/.test(selectedId)) && !selectedApplicant) showError('No user selected', 'Open User Details by selecting a profile from User Management.');
  else loadDetails();
});
