document.addEventListener('DOMContentLoaded', () => {
  const main = document.querySelector('.admin-screen-main');
  if (!main) return;

  const screen = main.dataset.screen;
  const list = document.getElementById('screenList');
  const empty = document.getElementById('screenEmpty');
  const search = document.getElementById('screenSearch');
  const tabs = document.getElementById('screenTabs') || document.getElementById('userTabs');
  let rows = [];
  let filter = tabs?.querySelector('.active')?.dataset.filter || 'all';
  if (screen === 'passes') {
    main.classList.add('pass-management-screen');
    const stats = document.createElement('section');
    stats.className = 'pass-stats';
    stats.setAttribute('aria-label', 'Pass summary');
    stats.innerHTML = '<article class="pass-stat active-stat"><span class="pass-stat-icon"><i class="fa-solid fa-ticket"></i></span><span>Active</span><strong id="activePassCount">0</strong></article><article class="pass-stat pending-stat"><span class="pass-stat-icon"><i class="fa-regular fa-clock"></i></span><span>Pending</span><strong id="pendingPassCount">0</strong></article><article class="pass-stat expired-stat"><span class="pass-stat-icon"><i class="fa-solid fa-clock-rotate-left"></i></span><span>Expired</span><strong id="expiredPassCount">0</strong></article>';
    main.querySelector('.mobile-title')?.after(stats);
    const filterButton = document.createElement('button');
    filterButton.type = 'button'; filterButton.className = 'pass-search-filter'; filterButton.setAttribute('aria-label', 'Show all passes');
    filterButton.innerHTML = '<i class="fa-solid fa-sliders"></i>';
    document.querySelector('.toolbar')?.append(filterButton);
    filterButton.addEventListener('click', () => {
      if (search) search.value = '';
      filter = 'all';
      tabs?.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.filter === 'all'));
      render();
    });
  }
  const requestedStatus = new URLSearchParams(location.search).get('status');
  if (requestedStatus && tabs?.querySelector(`[data-filter="${requestedStatus}"]`)) {
    filter = requestedStatus;
    tabs.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
  }

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
  const statusOf = item => String(item.status || '').trim().toLowerCase();
  const isEmployee = item => String(item.userType || '').toLowerCase() === 'employee'
    || String(item.applicantId || '').toUpperCase().startsWith('EMP')
    || String(item.passType || '').toLowerCase().includes('employee');
  const isActive = item => ['active', 'approved'].includes(statusOf(item));
  const userId = item => String(item.applicationId || item.id || item.applicantId || '');

  async function load() {
    try {
      const response = await fetch('http://localhost:5000/api/admin/dashboard', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error('Dashboard data unavailable');
      const serverRows = Array.isArray(data.applications) ? data.applications : [];
      rows = serverRows;
    } catch (error) {
      console.error('Admin data load failed:', error);
    }
    render();
  }

  function matches(item) {
    const query = (search?.value || '').trim().toLowerCase();
    const employee = isEmployee(item);

    if (screen === 'students' && employee) return false;
    if (screen === 'employees' && !employee) return false;
    if (screen === 'users') {
      if (filter === 'student' && employee) return false;
      if (filter === 'employee' && !employee) return false;
      if (filter === 'active' && !isActive(item)) return false;
    }
    if (screen === 'passes') {
      const status = statusOf(item);
      if (filter === 'approved' && !['approved', 'active'].includes(status)) return false;
      if (filter === 'pending' && !['pending', 'paid', 'draft'].includes(status)) return false;
      if (filter === 'expired' && status !== 'expired') return false;
    }
    if (screen === 'payments') {
      const paymentStatus = String(item.paymentStatus || '').toLowerCase();
      if (filter === 'success' && paymentStatus !== 'success') return false;
      if (filter === 'pending' && !['pending', 'paid', 'draft'].includes(statusOf(item))) return false;
      if (filter === 'failed' && paymentStatus !== 'failed') return false;
    }
    if (!query) return true;
    return [item.fullName, item.applicantId, item.applicationId, item.passType, item.status]
      .some(value => String(value || '').toLowerCase().includes(query));
  }

  function userCard(item) {
    const employee = isEmployee(item);
    const origin = item.fromStop || item.from || '--';
    const destination = item.toStop || item.to || '--';
    const organisation = item.organizationName || item.organization || item.collegeName || 'Not available';
    const rawDate = item.createdAt || item.applicationDate || '';
    const dateValue = rawDate ? new Date(rawDate) : null;
    const date = dateValue && !Number.isNaN(dateValue.getTime())
      ? dateValue.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Not available';
    return `<article class="data-card"><div class="data-card-head"><span class="avatar"><i class="fa-solid fa-${employee ? 'briefcase' : 'user'}"></i></span><div class="data-card-title"><strong>${esc(item.fullName || 'Applicant')}</strong><small>${employee ? 'Employee' : 'Student'} ID: ${esc(item.applicantId || 'Not available')}</small></div><span class="badge ${isActive(item) ? 'approved' : 'pending'}">${esc(item.status || 'Pending')}</span></div><div class="card-grid"><div class="kv"><span>${employee ? 'Organization' : 'College'}</span><strong>${esc(organisation)}</strong></div><div class="kv"><span>Route</span><strong>${esc(`${origin} → ${destination}`)}</strong></div><div class="kv"><span>Pass Type</span><strong>${esc(item.passType || 'Not available')}</strong></div><div class="kv"><span>Application Date</span><strong>${esc(date)}</strong></div></div></article>`;
  }

  function card(item) {
    if (screen === 'payments') return `<article class="data-card payment-card"><div class="data-card-head"><span class="avatar"><i class="fa-solid fa-credit-card"></i></span><div class="data-card-title"><strong>${esc(item.fullName || 'Applicant')}</strong><small>Transaction: ${esc(item.transactionId || 'Not available')}</small></div><span class="badge ${isActive(item) ? 'approved' : 'pending'}">${esc(item.status || 'Pending')}</span></div><div class="card-grid"><div class="kv"><span>Application ID</span><strong>${esc(item.applicationId || 'Not available')}</strong></div><div class="kv"><span>Amount</span><strong>₹${esc(item.amount || item.planAmount || '0')}</strong></div></div></article>`;
    if (screen === 'passes') {
      const id = item.applicationId ?? item.id ?? '';
      const rawIssue = item.issueDate || item.createdAt || item.applicationDate || '';
      const issueDate = rawIssue && !Number.isNaN(new Date(rawIssue).getTime()) ? new Date(rawIssue).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'Not available';
      const rawExpiry = item.validUntil || item.validTo || item.expiryDate || item.passExpiryDate || '';
      const validUntil = rawExpiry && !Number.isNaN(new Date(rawExpiry).getTime()) ? new Date(rawExpiry).toLocaleDateString('en-IN', { year:'numeric' }) : 'Not available';
      const type = item.passType || (isEmployee(item) ? 'Employee Pass' : 'Student Pass');
      const status = statusOf(item);
      const statusLabel = status === 'active' ? 'Approved' : (item.status || 'Pending');
      return `<a class="data-card pass-record" href="admin-pass-details.html?applicationId=${encodeURIComponent(String(id))}" aria-label="Open pass details for ${esc(item.fullName || 'Applicant')}"><div class="pass-card-top"><span class="avatar"><i class="fa-solid fa-ticket"></i></span><span class="data-card-title"><strong>${esc(item.fullName || 'Applicant')}</strong><small>Pass #${esc(id || '—')}</small></span><span class="badge ${isActive(item) ? 'approved' : status === 'expired' ? 'expired' : 'pending'}"><i class="fa-solid ${isActive(item) ? 'fa-circle-check' : status === 'expired' ? 'fa-clock-rotate-left' : 'fa-clock'}"></i>${esc(statusLabel)}</span><i class="fa-solid fa-chevron-right pass-card-arrow"></i></div><div class="pass-card-divider"></div><div class="pass-card-fields"><div><i class="fa-solid fa-user"></i><span>Type<strong>${esc(type)}</strong></span></div><div><i class="fa-regular fa-calendar"></i><span>Issue Date<strong>${esc(issueDate)}</strong></span></div><div><i class="fa-regular fa-calendar-check"></i><span>Valid Until<strong>${esc(validUntil)}</strong></span></div></div></a>`;
    }
    return userCard(item);
  }

  function render() {
    if (!list) return;
    if (screen === 'passes') {
      const count = key => rows.filter(item => key === 'active' ? isActive(item) : statusOf(item) === key).length;
      document.getElementById('activePassCount').textContent = count('active');
      document.getElementById('pendingPassCount').textContent = rows.filter(item => ['pending','paid','draft'].includes(statusOf(item))).length;
      document.getElementById('expiredPassCount').textContent = count('expired');
      list.classList.add('pass-list');
    }
    const visibleRows = rows.filter(matches);
    list.innerHTML = visibleRows.map(card).join('');
    if (empty) empty.style.display = visibleRows.length ? 'none' : 'flex';
  }

  tabs?.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    tabs.querySelectorAll('button').forEach(tab => tab.classList.remove('active'));
    button.classList.add('active');
    filter = button.dataset.filter || 'all';
    render();
  }));
  search?.addEventListener('input', render);

  document.getElementById('backButton')?.addEventListener('click', () => { location.href = 'admin-dashboard.html'; });
  document.getElementById('logoutSetting')?.addEventListener('click', () => {
    localStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminAuthenticated');
    location.href = 'admin-login.html';
  });
  load();
  window.setInterval(() => { if (!document.hidden) load(); }, 5000);
});
