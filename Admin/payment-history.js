document.addEventListener('DOMContentLoaded', async () => {
  const userId = new URLSearchParams(location.search).get('userId');
  const list = document.getElementById('paymentHistoryList');
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

  document.getElementById('backButton')?.addEventListener('click', () => {
    location.href = 'admin-payments.html';
  });

  if (!/^\d+$/.test(String(userId || ''))) {
    list.innerHTML = '<div class="payment-history-empty"><i class="fa-solid fa-credit-card"></i><strong>Payment history unavailable</strong><span>No user was selected.</span></div>';
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/admin/users/${encodeURIComponent(userId)}/payment-history`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Could not load payment history.');

    const history = Array.isArray(result.history) ? result.history : [];
    if (!history.length) {
      list.innerHTML = '<div class="payment-history-empty"><i class="fa-solid fa-credit-card"></i><strong>No payment history found</strong><span>This user has no payment records.</span></div>';
      return;
    }

    list.innerHTML = history.map(payment => {
      const status = String(payment.paymentStatus || 'pending').toLowerCase();
      const date = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'Not available';
      return `<article class="payment-history-card"><div class="data-card-head"><span class="avatar"><i class="fa-solid fa-credit-card"></i></span><div class="data-card-title"><strong>${esc(payment.passType || 'Bus Pass')}</strong><small>${esc(date)} · ${esc(payment.transactionId || 'Transaction unavailable')}</small></div><span class="badge ${status === 'success' ? 'success' : status === 'failed' ? 'failed' : 'pending'}">${esc(status)}</span></div><div class="payment-history-grid"><div><span>Application ID</span><strong>${esc(payment.applicationId)}</strong></div><div><span>Amount</span><strong>₹${esc(payment.amount || '0')}</strong></div><div><span>Method</span><strong>${esc(payment.paymentMethod || 'Not available')}</strong></div><div><span>Payment ID</span><strong>${esc(payment.paymentId)}</strong></div></div></article>`;
    }).join('');
  } catch (error) {
    console.error('Admin payment history load failed:', error);
    list.innerHTML = '<div class="payment-history-empty"><i class="fa-solid fa-triangle-exclamation"></i><strong>Payment history unavailable</strong><span>Could not load this user payment history.</span></div>';
  }
});
