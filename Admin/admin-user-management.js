/* User Management screen only. Reads the existing application feed first, with dashboard fallback; no backend changes. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const apiBase = 'http://localhost:5000';
  const $ = id => document.getElementById(id);
  const list = $('screenList');
  const empty = $('screenEmpty');
  const loading = $('userListLoading');
  const search = $('screenSearch');
  const tabs = $('userTabs');
  const filterOverlay = $('userFilterOverlay');
  let applications = [];
  let profiles = [];
  let activeTab = 'all';
  let appliedType = 'all';
  let appliedStatus = 'all';
  let sortMode = 'recent';
  let loaded = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const text = value => value === null || value === undefined || String(value).trim() === '' ? 'Not available' : String(value).trim();
  const statusOf = row => String(row.status || '').trim().toLowerCase();
  const isActive = row => ['active', 'approved', 'completed'].includes(statusOf(row));
  const typeOf = row => {
    const userType = String(row.userType || '').toLowerCase();
    const id = String(row.applicantId || '').toUpperCase();
    const passType = String(row.passType || '').toLowerCase();
    return userType.includes('employee') || id.startsWith('EMP') || passType.includes('employee') ? 'employee' : 'student';
  };
  const createdValue = row => row.createdAt || row.applicationDate || row.updatedAt || '';
  const timeOf = row => {
    const value = Date.parse(createdValue(row));
    return Number.isFinite(value) ? value : 0;
  };
  const shortDate = value => {
    if (!value) return 'Date not recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  };
  const fromStop = row => row.fromStop || row.from || row.origin || 'Not available';
  const toStop = row => row.toStop || row.to || row.destination || 'Not available';
  const organisation = row => row.organizationName || row.organization || row.collegeName || row.college || 'Not recorded';
  const accountKey = row => {
    const applicant = String(row.applicantId || row.userId || '').trim().toLowerCase();
    if (applicant) return `applicant:${applicant}`;
    const email = String(row.email || '').trim().toLowerCase();
    if (email) return `email:${email}`;
    const mobile = String(row.mobile || row.mobileNumber || '').replace(/\D/g, '');
    if (mobile) return `mobile:${mobile}`;
    return `application:${String(row.applicationId || row.id || [row.fullName || row.name || 'unknown', row.createdAt || row.applicationDate || '', row.passType || ''].join('|'))}`;
  };

  function uniqueProfiles(rows) {
    const latest = new Map();
    rows.forEach(row => {
      const key = accountKey(row);
      const prior = latest.get(key);
      if (!prior || timeOf(row) >= timeOf(prior)) latest.set(key, row);
    });
    return [...latest.values()];
  }

  function updateStats() {
    $('totalUsers').textContent = profiles.length.toLocaleString('en-IN');
    $('studentUsers').textContent = profiles.filter(row => typeOf(row) === 'student').length.toLocaleString('en-IN');
    $('employeeUsers').textContent = profiles.filter(row => typeOf(row) === 'employee').length.toLocaleString('en-IN');
  }

  function normalizedStatus(row) {
    const value = statusOf(row);
    if (['active', 'approved', 'completed'].includes(value)) return { key:'active', label:value === 'completed' ? 'Completed' : value === 'approved' ? 'Approved' : 'Active', icon:'fa-circle-check' };
    if (['pending', 'paid', 'draft', 'submitted', 'under review', 'under_review'].includes(value)) return { key:'pending', label:'Pending', icon:'fa-clock' };
    if (['rejected', 'declined', 'cancelled', 'canceled'].includes(value)) return { key:'rejected', label:'Rejected', icon:'fa-circle-xmark' };
    if (value === 'expired') return { key:'expired', label:'Expired', icon:'fa-calendar-xmark' };
    return { key:'pending', label:text(row.status) === 'Not available' ? 'Unknown' : text(row.status), icon:'fa-circle-question' };
  }

  function profileCard(row) {
    const type = typeOf(row);
    const status = normalizedStatus(row);
    const appId = row.applicationId ?? row.id ?? '';
    const detailsHref = /^\d+$/.test(String(appId)) ? `admin-user-details.html?applicationId=${encodeURIComponent(String(appId))}` : `admin-user-details.html?applicantId=${encodeURIComponent(String(row.applicantId || ''))}`;
    const displayName = text(row.fullName || row.name);
    const applicantId = text(row.applicantId || (appId ? `APP-${appId}` : 'ID not recorded'));
    const mobile = text(row.mobile || row.mobileNumber || row.phone);
    const route = `${fromStop(row)} → ${toStop(row)}`;
    return `<a class="user-card" href="${esc(detailsHref)}" aria-label="Open details for ${esc(displayName)}">
      <div class="user-card-head">
        <span class="user-avatar ${type === 'employee' ? 'employee' : ''}"><i class="fa-solid ${type === 'employee' ? 'fa-user-tie' : 'fa-user-graduate'}" aria-hidden="true"></i></span>
        <span class="user-card-title"><strong>${esc(displayName)}</strong><small>${type === 'employee' ? 'Employee' : 'Student'} ID: ${esc(applicantId)}</small></span>
        <span class="user-status-pill ${status.key}"><i class="fa-solid ${status.icon}" aria-hidden="true"></i>${esc(status.label)}</span>
        <i class="fa-solid fa-chevron-right user-card-arrow" aria-hidden="true"></i>
      </div>
      <div class="user-card-divider"></div>
      <div class="user-card-fields">
        <span class="user-field"><i class="fa-solid ${type === 'employee' ? 'fa-building' : 'fa-school'}" aria-hidden="true"></i><span class="field-label">${type === 'employee' ? 'Organization' : 'College'}</span><span class="field-colon">:</span><strong>${esc(organisation(row))}</strong></span>
        <span class="user-field"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span class="field-label">Route</span><span class="field-colon">:</span><strong>${esc(route)}</strong></span>
        <span class="user-field"><i class="fa-solid fa-ticket" aria-hidden="true"></i><span class="field-label">Pass Type</span><span class="field-colon">:</span><strong>${esc(text(row.passType || row.planName))}</strong></span>
      </div>
      <div class="user-card-footer"><span class="user-last-updated"><i class="fa-regular fa-calendar" aria-hidden="true"></i> ${esc(shortDate(createdValue(row)))}</span><span class="user-open-hint">View profile <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></span></div>
      <span class="user-mobile-hidden" hidden>${esc(mobile)}</span>
    </a>`;
  }

  function syncTabButtons() {
    tabs.querySelectorAll('button[data-filter]').forEach(button => {
      const active = button.dataset.filter === activeTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function statusMatches(row) {
    if (appliedStatus === 'all') return true;
    if (appliedStatus === 'active') return isActive(row);
    return normalizedStatus(row).key === appliedStatus;
  }

  function render() {
    if (!list) return;
    const query = String(search?.value || '').trim().toLowerCase();
    let visible = profiles.filter(row => {
      const type = typeOf(row);
      if (activeTab === 'student' && type !== 'student') return false;
      if (activeTab === 'employee' && type !== 'employee') return false;
      if (activeTab === 'active' && !isActive(row)) return false;
      if (appliedType !== 'all' && type !== appliedType) return false;
      if (!statusMatches(row)) return false;
      if (!query) return true;
      return [row.fullName, row.name, row.applicantId, row.applicationId, row.mobile, row.mobileNumber, row.email, row.passType, row.planName, row.status, organisation(row), fromStop(row), toStop(row)]
        .some(value => String(value || '').toLowerCase().includes(query));
    });
    if (sortMode === 'name-asc') visible.sort((a,b) => String(a.fullName || a.name || '').localeCompare(String(b.fullName || b.name || '')));
    else if (sortMode === 'name-desc') visible.sort((a,b) => String(b.fullName || b.name || '').localeCompare(String(a.fullName || a.name || '')));
    else visible.sort((a,b) => timeOf(b) - timeOf(a));
    list.innerHTML = visible.map(profileCard).join('');
    $('userResultCount').textContent = `${visible.length} ${visible.length === 1 ? 'profile' : 'profiles'}`;
    $('userListSubtitle').textContent = query || activeTab !== 'all' || appliedType !== 'all' || appliedStatus !== 'all' ? 'Matching your selected filters' : 'Latest available profiles';
    loading.hidden = true;
    empty.hidden = visible.length > 0;
    list.hidden = visible.length === 0;
    if (visible.length === 0) {
      $('userEmptyTitle').textContent = profiles.length ? 'No matching profiles' : 'No users available';
      $('userEmptyText').textContent = profiles.length ? 'Try another search or clear the selected filters.' : 'User profiles will appear here when records are available from the existing server.';
    }
    $('clearUserSearch').hidden = !search.value;
    const anyFilter = appliedType !== 'all' || appliedStatus !== 'all' || sortMode !== 'recent';
    $('filterCount').hidden = !anyFilter;
    $('filterCount').textContent = String(Number(appliedType !== 'all') + Number(appliedStatus !== 'all') + Number(sortMode !== 'recent'));
    syncTabButtons();
  }

  async function fetchApplicationFeed(path) {
    // The admin pages may be served by a separate static server, so request the
    // same backend origin used by the other Admin data screens.
    const response = await fetch(`${apiBase}${path}`, { cache:'no-store', headers:{ Accept:'application/json' } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || !payload.success || !Array.isArray(payload.applications)) {
      throw new Error(payload?.message || `${path} returned ${response.status}`);
    }
    return payload.applications;
  }

  function enrichApplications(primaryRows, dashboardRows) {
    const dashboardById = new Map((dashboardRows || []).map(row => [String(row.applicationId ?? row.id ?? ''), row]));
    return primaryRows.map(row => {
      const id = String(row.applicationId ?? row.id ?? '');
      const dashboardRow = dashboardById.get(id);
      // Keep the dedicated application feed's identity/contact/status values;
      // use dashboard values only for extra fields absent from that feed.
      return dashboardRow ? { ...dashboardRow, ...row } : row;
    });
  }

  async function loadProfiles() {
    loading.hidden = false;
    empty.hidden = true;
    list.hidden = true;
    try {
      // The dedicated application feed does not depend on dashboard summary/revenue
      // queries, so a metric-query issue will not stop users from appearing here.
      const applicationFeedPromise = fetchApplicationFeed('/api/admin/applications');
      // The dashboard feed enriches cards with college/organization fields when available.
      // Its failure is non-fatal because the application feed is the primary source.
      const dashboardFeedPromise = fetchApplicationFeed('/api/admin/dashboard');
      const [applicationResult, dashboardResult] = await Promise.allSettled([applicationFeedPromise, dashboardFeedPromise]);

      if (applicationResult.status === 'fulfilled') {
        applications = applicationResult.value;
        const dashboardRows = dashboardResult.status === 'fulfilled' ? dashboardResult.value : [];
        applications = enrichApplications(applications, dashboardRows);
        if (dashboardResult.status === 'rejected') {
          console.warn('Dashboard enrichment unavailable; showing application-feed data:', dashboardResult.reason);
        }
      } else if (dashboardResult.status === 'fulfilled') {
        // Last-resort fallback lets the page still display records if the dedicated feed fails.
        console.warn('Dedicated application feed unavailable; using dashboard records:', applicationResult.reason);
        applications = dashboardResult.value;
      } else {
        throw new Error(`Application feed failed: ${applicationResult.reason?.message || 'unknown error'}. Dashboard feed failed: ${dashboardResult.reason?.message || 'unknown error'}.`);
      }

      profiles = uniqueProfiles(applications);
      loaded = true;
      $('retryUserLoad').hidden = true;
      updateStats();
      render();
    } catch (error) {
      console.error('Admin user directory load failed:', error);
      applications = [];
      profiles = [];
      updateStats();
      loading.hidden = true;
      list.innerHTML = '';
      list.hidden = true;
      empty.hidden = false;
      $('userEmptyTitle').textContent = 'Could not load users';
      $('userEmptyText').textContent = 'Could not reach the existing application API. Confirm that the project server and MySQL database are running, then select Retry.';
      $('userResultCount').textContent = 'Unavailable';
      $('retryUserLoad').hidden = false;
    }
  }

  function openFilter() {
    filterOverlay.hidden = false;
    $('filterUserType').value = appliedType;
    $('filterUserStatus').value = appliedStatus;
    $('filterUserSort').value = sortMode;
    $('closeUserFilter').focus();
  }
  function closeFilter() { filterOverlay.hidden = true; $('screenFilter').focus(); }
  function resetFilters() {
    appliedType = 'all'; appliedStatus = 'all'; sortMode = 'recent'; activeTab = 'all';
    $('filterUserType').value = appliedType;
    $('filterUserStatus').value = appliedStatus;
    $('filterUserSort').value = sortMode;
    if (search) search.value = '';
    render();
  }

  tabs.querySelectorAll('button[data-filter]').forEach(button => button.addEventListener('click', () => {
    activeTab = button.dataset.filter || 'all';
    // Main tabs set their own role scope; the popup's status and sort refinements remain applied.
    appliedType = 'all';
    render();
  }));
  document.querySelectorAll('[data-stat-filter]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.statFilter;
    activeTab = value === 'all' ? 'all' : value;
    appliedType = 'all';
    render();
    document.querySelector('.user-list-heading')?.scrollIntoView({ behavior:'smooth', block:'start' });
  }));
  search.addEventListener('input', render);
  $('clearUserSearch').addEventListener('click', () => { search.value = ''; render(); search.focus(); });
  $('screenFilter').addEventListener('click', openFilter);
  $('closeUserFilter').addEventListener('click', closeFilter);
  $('closeUserFilterBackdrop').addEventListener('click', closeFilter);
  $('applyUserFilters').addEventListener('click', () => {
    appliedType = $('filterUserType').value;
    appliedStatus = $('filterUserStatus').value;
    sortMode = $('filterUserSort').value;
    activeTab = 'all';
    closeFilter(); render();
  });
  $('clearUserFilters').addEventListener('click', resetFilters);
  $('resetUserFilters').addEventListener('click', () => { resetFilters(); search.focus(); });
  $('retryUserLoad').addEventListener('click', loadProfiles);
  $('backButton').addEventListener('click', () => { window.location.href = 'admin-dashboard.html'; });
  $('notificationButton').addEventListener('click', () => { window.location.href = 'admin-profile.html#notifications'; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !filterOverlay.hidden) closeFilter(); });

  loadProfiles();
  // Keep profile state fresh from the existing server without changing backend behavior.
  window.setInterval(() => { if (!document.hidden) loadProfiles(); }, 15000);
});
