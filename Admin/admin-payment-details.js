/* Payment details view powered by the existing application detail endpoint. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const applicationId = params.get('applicationId');
  let loadedApplication = null;
  let lastCopyTimer = null;

  const text = (id, value, fallback = 'Not available') => {
    const node = $(id);
    if (node) node.textContent = value === null || value === undefined || value === '' ? fallback : String(value);
  };
  const numberValue = value => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(String(value).replace(/[₹,\s]/g, ''));
    return Number.isFinite(number) ? number : null;
  };
  const money = value => {
    const amount = numberValue(value);
    return amount === null ? 'Not recorded' : `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };
  const date = value => {
    if (!value) return 'Not available';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const shortDate = value => {
    if (!value) return 'Not available';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const normalizePaymentStatus = application => {
    const raw = String(application.paymentStatus || '').toLowerCase().trim();
    if (['success', 'successful', 'paid', 'completed'].includes(raw)) return { key: 'success', label: 'Successful' };
    if (['pending', 'initiated', 'processing', 'payment_pending'].includes(raw)) return { key: 'pending', label: 'Pending' };
    if (['failed', 'failure', 'payment_failed', 'cancelled', 'canceled'].includes(raw)) return { key: 'failed', label: 'Failed' };
    if (application.transactionId) return { key: 'success', label: 'Successful' };
    return { key: 'unknown', label: 'Not recorded' };
  };

  function showError(title, message) {
    $('paymentDetailsLoading').hidden = true;
    $('paymentDetailsContent').hidden = true;
    $('paymentDetailsError').hidden = false;
    text('paymentDetailsErrorTitle', title);
    text('paymentDetailsErrorText', message);
  }

  function render(application) {
    loadedApplication = application;
    const paymentStatus = normalizePaymentStatus(application);
    const paidValue = application.paidAmount ?? null;
    const planValue = application.planAmount ?? null;
    const paymentAmount = paidValue !== null && paidValue !== '' ? money(paidValue) : 'Not recorded';
    const pill = $('paymentStatusPill');
    pill.className = `payment-status-pill ${paymentStatus.key}`;
    pill.innerHTML = `<i class="fa-solid ${paymentStatus.key === 'success' ? 'fa-circle-check' : paymentStatus.key === 'pending' ? 'fa-clock' : paymentStatus.key === 'failed' ? 'fa-circle-xmark' : 'fa-circle-question'}" aria-hidden="true"></i>${paymentStatus.label}`;

    text('transactionAmount', paymentAmount);
    text('transactionId', application.transactionId || 'Not recorded');
    text('detailPaymentStatus', paymentStatus.label);
    text('detailPaymentMethod', application.paymentMethod || 'Not recorded');
    text('detailPaymentDate', date(application.paymentDate));
    text('detailAmountPaid', paymentAmount);

    text('detailApplicantName', application.fullName);
    const applicantType = String(application.userType || application.passType || '').toLowerCase().includes('employee') ? 'Employee' : 'Student';
    text('detailApplicantType', applicantType);
    text('detailApplicantId', application.applicantId);
    text('detailMobile', application.mobile);
    text('detailEmail', application.email);

    text('detailApplicationId', application.applicationId ? `#${application.applicationId}` : 'Not available');
    text('detailApplicationStatus', application.status);
    text('detailPassType', application.passType);
    text('detailPlanName', application.planName);
    text('detailPlanAmount', money(planValue));
    text('detailApplicationDate', shortDate(application.createdAt));

    text('detailFromStop', application.fromStop || 'Origin not recorded');
    text('detailToStop', application.toStop || 'Destination not recorded');
    text('detailDistance', application.distance ? `${application.distance} km` : 'Not available');
    text('detailBusType', application.busType);
    text('detailPassId', application.passId, 'Not issued');
    text('detailValidTo', shortDate(application.validTo));

    const appLink = $('viewApplicationButton');
    appLink.href = `application-details.html?applicationId=${encodeURIComponent(String(application.applicationId || applicationId))}`;
    appLink.setAttribute('aria-label', `View full application ${application.applicationId || applicationId}`);

    const copyButton = $('copyTransactionId');
    const hasTransaction = Boolean(application.transactionId);
    copyButton.disabled = !hasTransaction;
    copyButton.title = hasTransaction ? 'Copy transaction ID' : 'No transaction ID saved';
    copyButton.style.opacity = hasTransaction ? '1' : '.5';
    $('paymentDetailsLoading').hidden = true;
    $('paymentDetailsError').hidden = true;
    $('paymentDetailsContent').hidden = false;
  }

  async function loadDetails() {
    $('paymentDetailsLoading').hidden = false;
    $('paymentDetailsError').hidden = true;
    $('paymentDetailsContent').hidden = true;
    if (!/^\d+$/.test(String(applicationId || ''))) {
      showError('Payment record not selected', 'Open this screen by selecting a transaction from the Admin Payments list.');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/admin/applications/${encodeURIComponent(applicationId)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.application) throw new Error(payload.message || 'Could not load the selected record.');
      render(payload.application);
    } catch (error) {
      console.error('Admin payment detail load failed:', error);
      showError('Payment details unavailable', 'The selected application could not be loaded. Check that the local server is running and try again.');
    }
  }

  $('backButton')?.addEventListener('click', () => { window.location.href = 'admin-payments.html'; });
  $('notificationButton')?.addEventListener('click', () => { window.location.href = 'admin-profile.html#notifications'; });
  $('retryPaymentDetails')?.addEventListener('click', loadDetails);
  $('copyTransactionId')?.addEventListener('click', async () => {
    const transactionId = loadedApplication?.transactionId;
    if (!transactionId) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(String(transactionId));
      } else {
        const helper = document.createElement('textarea');
        helper.value = String(transactionId);
        helper.setAttribute('readonly', '');
        helper.style.position = 'absolute';
        helper.style.left = '-9999px';
        document.body.appendChild(helper);
        helper.select();
        const copied = document.execCommand('copy');
        helper.remove();
        if (!copied) throw new Error('Clipboard unavailable');
      }
      $('transactionCopied').hidden = false;
      if (lastCopyTimer) window.clearTimeout(lastCopyTimer);
      lastCopyTimer = window.setTimeout(() => { $('transactionCopied').hidden = true; }, 1800);
    } catch (error) {
      console.warn('Could not copy transaction ID:', error);
      $('transactionCopied').textContent = 'Copy was not available in this browser';
      $('transactionCopied').hidden = false;
    }
  });

  loadDetails();
});
