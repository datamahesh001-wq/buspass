/* Shared iPhone-style status row for every admin screen. */
(() => {
  const app = document.querySelector('.iphone-app');
  if (!app || app.querySelector('.admin-device-status')) return;

  const status = document.createElement('div');
  status.className = 'admin-device-status';
  status.setAttribute('aria-label', 'Phone status');
  status.innerHTML = '<time aria-label="Current time"></time><span class="admin-device-status-icons" aria-hidden="true"><i class="fa-solid fa-signal"></i><i class="fa-solid fa-wifi"></i><i class="fa-solid fa-battery-full"></i></span>';

  const clock = status.querySelector('time');
  const updateClock = () => {
    clock.textContent = new Intl.DateTimeFormat([], {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date());
  };

  updateClock();
  window.setInterval(updateClock, 60000);
  app.prepend(status);
})();
