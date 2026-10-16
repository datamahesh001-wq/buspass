document.addEventListener('DOMContentLoaded', async () => {
  const state = { type: 'all', status: 'all', search: '' };
  const list = document.getElementById('applicationsList');
  const count = document.getElementById('applicationCount');
  const empty = document.getElementById('emptyState');
  const search = document.getElementById('applicationSearch');
  const clear = document.getElementById('searchClearButton');
  const filterOverlay = document.getElementById('filterOverlay');
  const filterLabel = document.getElementById('activeFilterLabel');
  const labels = { all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
  let allApplications = [];
  let loading = false;

  const requestedStatus = new URLSearchParams(window.location.search).get('status');
  const requestedType = new URLSearchParams(window.location.search).get('type');
  if (requestedType && ['all', 'student', 'employee'].includes(requestedType)) {
    state.type = requestedType;
    document.querySelectorAll('.type-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.type === requestedType));
  }
  if (requestedStatus && labels[requestedStatus]) {
    state.status = requestedStatus;
    document.querySelectorAll('.filter-option').forEach(o =>
      o.classList.toggle('active-filter', o.dataset.status === requestedStatus)
    );
  }

  function esc(v) {
    return String(v ?? '').replace(/[&<>'"]/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] || c)
    );
  }

  // Only a paid application has been submitted to the Admin queue. Drafts
  // and in-progress applications must never appear here.
  function normalizeStatus(v) {
    const s = String(v || '').toLowerCase();
    return (s === 'paid' || s === 'payment_pending') ? 'pending' : s;
  }

  function isSubmittedApplication(a) {
    return ['paid', 'approved', 'rejected', 'completed'].includes(String(a?.status || '').toLowerCase());
  }

  function inferType(a) {
    return String(a.passType || '').toLowerCase().includes('employee') ||
      String(a.applicantId || '').toUpperCase().startsWith('EMP')
      ? 'employee' : 'student';
  }

  function formatDate(v) {
    const d = new Date(v);
    return isNaN(d) ? 'Date unavailable' :
      d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  }

  function render() {
    const rows = allApplications
      .map(a => ({...a, type: a.type || inferType(a),
        status: normalizeStatus(a.status),
        id: String(a.applicationId || a.id || '')}))
      .filter(a => a.id)
      .filter(a => state.type === 'all' || a.type === state.type)
      .filter(a => state.status === 'all' || a.status === state.status)
      .filter(a => {
        const q = state.search.toLowerCase();
        return !q || [a.fullName, a.applicantId, a.applicationId, a.passType]
          .some(v => String(v || '').toLowerCase().includes(q));
      });

    list.innerHTML = rows.map(a => `<article class="application-card" data-id="${esc(a.id)}">
      <div class="app-top">
        <div class="app-photo"><i class="fa-solid fa-user"></i></div>
        <div class="app-main"><h3>${esc(a.fullName || 'Applicant')}</h3>
          <p>${esc(a.applicantId || a.id)}</p></div>
        <span class="app-status ${esc(a.status)}">${esc(a.status.charAt(0).toUpperCase()+a.status.slice(1))}</span>
      </div>
      <div class="app-details-grid">
        <div class="app-field"><span>Pass Type</span><strong>${esc(a.passType || 'Bus Pass')}</strong></div>
        <div class="app-field"><span>Application ID</span><strong>APP-${esc(a.id)}</strong></div>
      </div>
      ${a.rejectionReason ? `<div class="app-rejection-note"><i class="fa-solid fa-circle-info"></i><span><strong>Rejection reason:</strong> ${esc(a.rejectionReason)}</span></div>` : ''}
      <div class="app-footer"><small>Applied on ${esc(formatDate(a.createdAt))}</small>
        <button class="view-button" type="button" data-id="${esc(a.id)}">View details <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </article>`).join('');

    count.textContent = rows.length;
    filterLabel.textContent = labels[state.status];
    empty.classList.toggle('show', rows.length === 0);

    list.querySelectorAll('.application-card').forEach(card =>
      card.addEventListener('click', () => open(card.dataset.id))
    );
    list.querySelectorAll('.view-button').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); open(btn.dataset.id); })
    );
  }

  function open(applicationId) {
    if (!applicationId) return;
    location.href = `application-details.html?applicationId=${encodeURIComponent(String(applicationId))}`;
  }

  async function load(showError = true) {
    if (loading) return;
    loading = true;
    try {
      const r = await fetch('http://localhost:5000/api/admin/applications', {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      if (!r.ok) throw new Error('API unavailable');
      const d = await r.json();
      if (!d.success) throw new Error(d.message || 'Could not load applications');

      // MySQL is the only source of truth for the admin application list.
      // This endpoint is independent of dashboard summary/revenue queries, so
      // a metric error cannot make real applications disappear from review.
      allApplications = (Array.isArray(d.applications) ? d.applications : []).filter(isSubmittedApplication);
      render();
    } catch (err) {
      console.error('Admin applications load failed:', err);
      // Do not use a browser snapshot when MySQL is unavailable.
      allApplications = [];
      render();

    } finally {
      loading = false;
    }
  }

  document.getElementById('backButton')?.addEventListener('click', () => {
    const openedFromSettings = new URLSearchParams(location.search).get('from') === 'settings'
      || document.referrer.endsWith('/admin-settings.html');
    const returnTarget = openedFromSettings
      ? 'admin-settings.html'
      : 'admin-dashboard.html';
    location.href = returnTarget;
  });
  document.getElementById('notificationButton')?.addEventListener('click', () => load(false));
  document.querySelectorAll('.type-tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.type-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    state.type = t.dataset.type;
    render();
  }));
  search?.addEventListener('input', () => {
    state.search = search.value.trim();
    clear.classList.toggle('show', !!state.search);
    render();
  });
  clear?.addEventListener('click', () => {
    search.value = ''; state.search = '';
    clear.classList.remove('show'); render(); search.focus();
  });
  document.getElementById('filterButton')?.addEventListener('click', () => filterOverlay.classList.add('show'));
  document.getElementById('closeFilterButton')?.addEventListener('click', () => filterOverlay.classList.remove('show'));
  filterOverlay?.addEventListener('click', e => {
    if (e.target === filterOverlay) filterOverlay.classList.remove('show');
  });
  document.querySelectorAll('.filter-option').forEach(o => o.addEventListener('click', () => {
    document.querySelectorAll('.filter-option').forEach(x => x.classList.remove('active-filter'));
    o.classList.add('active-filter');
    state.status = o.dataset.status;
    filterOverlay.classList.remove('show');
    render();
  }));

  await load(true);
  // Keep the admin application list in sync when a user applies in another browser.
  setInterval(() => load(false), 5000);
});
