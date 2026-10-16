document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('passDetailContent');
  const id = new URLSearchParams(location.search).get('applicationId');
  const apiBase = 'http://localhost:5000';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const value = (...values) => values.find(v => v !== null && v !== undefined && String(v).trim()) || 'Not available';
  const formatDate = raw => {
    if (!raw) return 'Not available';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? String(raw) : date.toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'});
  };
  document.getElementById('backButton')?.addEventListener('click', () => history.length > 1 ? history.back() : location.assign('admin-pass-management.html'));
  if (!id) { content.innerHTML = '<div class="empty-panel"><i class="fa-solid fa-triangle-exclamation"></i><strong>Pass not selected</strong><span>Return to Pass Management and choose a pass.</span></div>'; return; }
  try {
    const response = await fetch(`${apiBase}/api/admin/applications/${encodeURIComponent(String(id))}`, {cache:'no-store'});
    const payload = await response.json();
    const item = payload.application;
    if (!response.ok || !payload.success || !item) throw new Error(payload.message || 'Pass record was not found.');
    const employee = String(item.userType || '').toLowerCase() === 'employee' || String(item.passType || '').toLowerCase().includes('employee') || String(item.applicantId || '').toUpperCase().startsWith('EMP');
    const status = value(item.passStatus, item.status, 'Pending');
    const issue = formatDate(value(item.issueDate, item.createdAt, item.applicationDate) === 'Not available' ? '' : value(item.issueDate, item.createdAt, item.applicationDate));
    const expiry = formatDate(value(item.validUntil, item.validTo, item.expiryDate, item.passExpiryDate) === 'Not available' ? '' : value(item.validUntil, item.validTo, item.expiryDate, item.passExpiryDate));
    const fields = [
      ['Applicant', value(item.fullName, item.name)], ['Applicant ID', value(item.applicantId)], ['Pass Number', value(item.passId, `BP${String(id).padStart(8, '0')}`)], ['Pass Type', value(item.passType, employee ? 'Employee Pass' : 'Student Pass')],
      ['Status', status], ['Issue Date', issue], ['Valid Until', expiry], ['Plan', value(item.passPlanName, item.planName)],
      ['Email', value(item.email, item.emailAddress)], ['Phone', value(item.mobile, item.mobileNumber, item.phone)], ['Organization / College', value(item.organizationName, item.organization, item.collegeName, item.college)], ['Course / Department', value(item.course, item.department, item.designation)],
      ['From', value(item.fromStop, item.from, item.origin)], ['To', value(item.toStop, item.to, item.destination)], ['Distance', value(item.distance, item.distanceKm)], ['Bus Type', value(item.busType)], ['Amount', value(item.amount, item.passAmount, item.planAmount) === 'Not available' ? 'Not available' : `₹${value(item.amount, item.passAmount, item.planAmount)}`]
    ];
    content.innerHTML = `<section class="pass-detail-hero"><span class="pass-detail-icon"><i class="fa-solid fa-ticket"></i></span><div><h2>${esc(value(item.fullName, item.name, 'Pass Holder'))}</h2><p>Pass #${esc(id)} · ${esc(value(item.passType, employee ? 'Employee Pass' : 'Student Pass'))}</p></div><span class="pass-detail-status">${esc(status)}</span></section><section class="pass-detail-section"><h3><i class="fa-solid fa-id-card"></i> PASS INFORMATION</h3><div class="pass-detail-grid">${fields.slice(2,8).map(([label,val])=>`<div class="pass-detail-field"><span>${esc(label)}</span><strong>${esc(val)}</strong></div>`).join('')}</div></section><section class="pass-detail-section"><h3><i class="fa-solid fa-user"></i> HOLDER INFORMATION</h3><div class="pass-detail-grid">${fields.slice(0,2).concat(fields.slice(8,12)).map(([label,val])=>`<div class="pass-detail-field"><span>${esc(label)}</span><strong>${esc(val)}</strong></div>`).join('')}</div></section><section class="pass-detail-section"><h3><i class="fa-solid fa-route"></i> ROUTE</h3><div class="pass-detail-grid">${fields.slice(12).map(([label,val])=>`<div class="pass-detail-field"><span>${esc(label)}</span><strong>${esc(val)}</strong></div>`).join('')}</div></section><button class="pass-detail-action" type="button" onclick="location.href='admin-pass-management.html'"><i class="fa-solid fa-arrow-left"></i> Back to Pass Management</button>`;
  } catch (error) {
    content.innerHTML = `<div class="empty-panel"><i class="fa-solid fa-triangle-exclamation"></i><strong>Pass details unavailable</strong><span>${esc(error.message || 'The pass record could not be loaded.')}</span><a href="admin-pass-management.html">Back to Pass Management</a></div>`;
  }
});
