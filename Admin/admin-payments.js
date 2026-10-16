/* Admin Payments page behavior. Uses existing read-only Admin dashboard/application APIs. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const $ = id => document.getElementById(id);
  const list = $('screenList');
  const empty = $('screenEmpty');
  const loadError = $('paymentLoadError');
  const search = $('screenSearch');
  const tabs = $('screenTabs');
  const backdrop = $('paymentFilterBackdrop');
  const filterButton = $('screenFilter');
  const filterForm = $('paymentFilterForm');

  const state = {
    rows: [],
    summary: {},
    status: 'all',
    search: '',
    fromDate: '',
    toDate: '',
    minAmount: '',
    maxAmount: '',
    sort: 'newest',
    loading: false,
    hasError: false
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const numeric = value => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(String(value).replace(/[₹,\s]/g, ''));
    return Number.isFinite(number) ? number : null;
  };
  const currency = value => {
    const number = numeric(value);
    return number === null ? '—' : `₹${number.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };
  const validDate = value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const formatDate = value => {
    const date = validDate(value);
    return date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not available';
  };
  const statusOf = item => {
    const payment = String(item.paymentStatus || '').toLowerCase().trim();
    if (['success', 'successful', 'completed', 'paid'].includes(payment)) return 'success';
    if (['pending', 'initiated', 'processing', 'payment_pending'].includes(payment)) return 'pending';
    if (['failed', 'failure', 'payment_failed', 'cancelled', 'canceled'].includes(payment)) return 'failed';
    if (item.transactionId) return 'success';
    const applicationStatus = String(item.status || '').toLowerCase().trim();
    if (['payment_pending', 'pending', 'draft', 'submitted', 'paid'].includes(applicationStatus)) return 'pending';
    if (['payment_failed', 'failed'].includes(applicationStatus)) return 'failed';
    return 'unknown';
  };
  const amountOf = item => numeric(item.paidAmount ?? item.amount ?? item.planAmount);
  const searchCorpus = item => [
    item.fullName, item.applicantId, item.applicationId, item.transactionId,
    item.passType, item.planName, item.fromStop, item.toStop, item.status, item.paymentStatus
  ].map(value => String(value ?? '')).join(' ').toLowerCase();

  function updateTabs() {
    tabs?.querySelectorAll('[data-filter]').forEach(button => {
      const active = button.dataset.filter === state.status;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function updateStats() {
    const successful = state.rows.filter(item => statusOf(item) === 'success');
    const pending = state.rows.filter(item => statusOf(item) === 'pending');
    const rowRevenue = successful.reduce((sum, item) => sum + (amountOf(item) || 0), 0);
    const revenueValue = numeric(state.summary.totalRevenue);
    $('totalRevenue').textContent = currency(revenueValue === null ? rowRevenue : revenueValue);
    $('successfulCount').textContent = successful.length.toLocaleString('en-IN');
    $('pendingCount').textContent = pending.length.toLocaleString('en-IN');
  }

  function matches(item) {
    const status = statusOf(item);
    if (state.status !== 'all' && status !== state.status) return false;

    const query = state.search.trim().toLowerCase();
    if (query && !searchCorpus(item).includes(query)) return false;

    const date = validDate(item.createdAt || item.applicationDate);
    if (state.fromDate) {
      const from = new Date(`${state.fromDate}T00:00:00`);
      if (!date || date < from) return false;
    }
    if (state.toDate) {
      const to = new Date(`${state.toDate}T23:59:59.999`);
      if (!date || date > to) return false;
    }

    const amount = amountOf(item);
    const min = state.minAmount === '' ? null : numeric(state.minAmount);
    const max = state.maxAmount === '' ? null : numeric(state.maxAmount);
    if (min !== null && (amount === null || amount < min)) return false;
    if (max !== null && (amount === null || amount > max)) return false;
    return true;
  }

  function sortRows(rows) {
    return rows.sort((a, b) => {
      if (state.sort === 'highest' || state.sort === 'lowest') {
        const difference = (amountOf(a) ?? -1) - (amountOf(b) ?? -1);
        return state.sort === 'highest' ? -difference : difference;
      }
      const aDate = validDate(a.createdAt || a.applicationDate)?.getTime() || 0;
      const bDate = validDate(b.createdAt || b.applicationDate)?.getTime() || 0;
      return state.sort === 'oldest' ? aDate - bDate : bDate - aDate;
    });
  }

  function statusPill(item) {
    const status = statusOf(item);
    const details = {
      success: { label: 'Successful', icon: 'fa-circle-check' },
      pending: { label: 'Pending', icon: 'fa-clock' },
      failed: { label: 'Failed', icon: 'fa-circle-xmark' },
      unknown: { label: 'Not recorded', icon: 'fa-circle-question' }
    }[status];
    return `<span class="payment-status-pill ${status}"><i class="fa-solid ${details.icon}" aria-hidden="true"></i>${details.label}</span>`;
  }

  function renderCard(item) {
    const appId = String(item.applicationId ?? '');
    const hasId = /^\d+$/.test(appId);
    const href = hasId ? `admin-payment-details.html?applicationId=${encodeURIComponent(appId)}` : '#';
    const name = item.fullName || 'Applicant name unavailable';
    const transaction = item.transactionId || (statusOf(item) === 'pending' ? 'Awaiting transaction ID' : 'Transaction ID not recorded');
    const amount = currency(amountOf(item));
    const amountLabel = amount === '—' ? 'Amount unavailable' : amount;
    const date = formatDate(item.createdAt || item.applicationDate);
    return `<a class="payment-record" href="${href}" data-application-id="${esc(appId)}" ${hasId ? '' : 'aria-disabled="true"'} aria-label="Open payment details for ${esc(name)}, application ${esc(appId || 'not available')}">
      <div class="payment-record-top">
        <span class="payment-record-icon"><i class="fa-solid fa-credit-card" aria-hidden="true"></i></span>
        <span class="payment-record-title"><strong>${esc(name)}</strong><small>Txn ID: ${esc(transaction)}</small></span>
        ${statusPill(item)}
      </div>
      <div class="payment-record-divider"></div>
      <div class="payment-record-meta">
        <span class="payment-meta-item"><span>Application #</span><strong>${esc(appId ? `#${appId}` : 'Not available')}</strong></span>
        <span class="payment-meta-item amount"><span>Amount</span><strong>${esc(amountLabel)}</strong></span>
        <span class="payment-meta-item date"><span>Application Date</span><strong>${esc(date)}</strong></span>
        <i class="payment-record-chevron fa-solid fa-chevron-right" aria-hidden="true"></i>
      </div>
    </a>`;
  }

  function render() {
    if (!list) return;
    updateTabs();
    const visible = sortRows(state.rows.filter(matches));
    list.innerHTML = visible.map(renderCard).join('');
    list.setAttribute('aria-busy', state.loading ? 'true' : 'false');
    empty.hidden = visible.length !== 0 || state.loading || state.hasError;
    loadError.hidden = !state.hasError;
    $('paymentResultCount').textContent = `${visible.length} ${visible.length === 1 ? 'record' : 'records'}${state.status === 'all' ? '' : ` · ${state.status === 'success' ? 'Successful' : state.status[0].toUpperCase() + state.status.slice(1)}`}`;
  }

  async function loadPayments() {
    if (state.loading) return;
    state.loading = true;
    state.hasError = false;
    if (list) list.setAttribute('aria-busy', 'true');
    render();
    try {
      const response = await fetch('http://localhost:5000/api/admin/dashboard', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load payment data.');
      state.rows = Array.isArray(payload.applications) ? payload.applications : [];
      state.summary = payload.summary || {};
      state.hasError = false;
      updateStats();
    } catch (error) {
      console.error('Admin payments could not load:', error);
      state.hasError = true;
    } finally {
      state.loading = false;
      render();
    }
  }

  function openFilter() {
    if (!backdrop) return;
    $('filterStatus').value = state.status;
    $('filterFromDate').value = state.fromDate;
    $('filterToDate').value = state.toDate;
    $('filterMinAmount').value = state.minAmount;
    $('filterMaxAmount').value = state.maxAmount;
    $('filterSort').value = state.sort;
    $('filterValidation').hidden = true;
    backdrop.hidden = false;
    filterButton?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('payment-filter-open');
    $('closePaymentFilter')?.focus();
  }

  function closeFilter() {
    if (!backdrop) return;
    backdrop.hidden = true;
    filterButton?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('payment-filter-open');
    filterButton?.focus();
  }

  function clearFilters({ clearSearch = true } = {}) {
    state.status = 'all';
    state.fromDate = '';
    state.toDate = '';
    state.minAmount = '';
    state.maxAmount = '';
    state.sort = 'newest';
    if (clearSearch) {
      state.search = '';
      if (search) search.value = '';
      $('clearSearch').hidden = true;
    }
    if (filterForm) filterForm.reset();
    updateTabs();
    render();
  }

  tabs?.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    state.status = button.dataset.filter || 'all';
    updateTabs();
    render();
  }));

  document.querySelectorAll('[data-stat-filter]').forEach(button => button.addEventListener('click', () => {
    state.status = button.dataset.statFilter || 'all';
    updateTabs();
    render();
    $('paymentsMain')?.scrollTo({ top: 225, behavior: 'smooth' });
  }));

  search?.addEventListener('input', () => {
    state.search = search.value;
    $('clearSearch').hidden = !search.value;
    render();
  });
  $('clearSearch')?.addEventListener('click', () => {
    search.value = '';
    state.search = '';
    $('clearSearch').hidden = true;
    search.focus();
    render();
  });
  filterButton?.addEventListener('click', openFilter);
  $('closePaymentFilter')?.addEventListener('click', closeFilter);
  backdrop?.addEventListener('click', event => { if (event.target === backdrop) closeFilter(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && backdrop && !backdrop.hidden) closeFilter();
  });

  filterForm?.addEventListener('submit', event => {
    event.preventDefault();
    const from = $('filterFromDate').value;
    const to = $('filterToDate').value;
    const min = $('filterMinAmount').value;
    const max = $('filterMaxAmount').value;
    const minNumber = min === '' ? null : numeric(min);
    const maxNumber = max === '' ? null : numeric(max);
    if ((from && to && from > to) || (minNumber !== null && minNumber < 0) || (maxNumber !== null && maxNumber < 0) || (minNumber !== null && maxNumber !== null && minNumber > maxNumber)) {
      $('filterValidation').hidden = false;
      return;
    }
    state.status = $('filterStatus').value;
    state.fromDate = from;
    state.toDate = to;
    state.minAmount = min;
    state.maxAmount = max;
    state.sort = $('filterSort').value || 'newest';
    closeFilter();
    render();
    $('paymentsMain')?.scrollTo({ top: 225, behavior: 'smooth' });
  });

  $('clearPaymentFilters')?.addEventListener('click', () => {
    clearFilters();
    openFilter();
  });
  $('resetPaymentFilters')?.addEventListener('click', () => clearFilters());
  $('refreshPayments')?.addEventListener('click', loadPayments);
  $('retryPayments')?.addEventListener('click', loadPayments);
  $('backButton')?.addEventListener('click', () => { window.location.href = 'admin-dashboard.html'; });
  $('notificationButton')?.addEventListener('click', () => { window.location.href = 'admin-profile.html#notifications'; });

  // Invalid IDs cannot open the details API. Keep the record visible without allowing a dead link.
  list?.addEventListener('click', event => {
    const link = event.target.closest('.payment-record[aria-disabled="true"]');
    if (link) event.preventDefault();
  });
  list?.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const link = event.target.closest('.payment-record[aria-disabled="true"]');
    if (link) event.preventDefault();
  });

  const requestedStatus = new URLSearchParams(window.location.search).get('status');
  if (['all', 'success', 'pending', 'failed'].includes(requestedStatus)) state.status = requestedStatus;
  loadPayments();
});
