/* Wrap each user page in the shared phone frame without changing its page-specific markup. */
(() => {
  const body = document.body;
  if (!body || body.classList.contains('user-frame-ready')) return;
  const screenName = (location.pathname.split('/').pop() || 'screen')
    .replace(/\.html$/i, '')
    .replace(/[^a-z0-9-]/gi, '-');
  body.classList.add(`bp-${screenName}`);

  const shell = document.createElement('div');
  const screen = document.createElement('div');
  const app = document.createElement('div');
  const camera = document.createElement('div');
  shell.className = 'user-phone-shell';
  screen.className = 'user-phone-screen';
  app.className = 'user-phone-app';
  camera.className = 'user-phone-camera';
  camera.setAttribute('aria-hidden', 'true');

  const scripts = [];
  [...body.childNodes].forEach((node) => {
    if (node.nodeName === 'SCRIPT') scripts.push(node);
    else app.appendChild(node);
  });

  screen.appendChild(app);
  shell.append(screen, camera);
  body.replaceChildren(shell, ...scripts);
  body.classList.add('user-frame-ready');

  // Every user-facing screen gets the same readable phone status row.
  // Login and Splash already provide their own purpose-built status bars.
  if (!app.querySelector('.device-status-bar, .splash-status')) {
    const status = document.createElement('div');
    status.className = 'device-status-bar';
    status.setAttribute('aria-label', 'Phone status');
    status.innerHTML = '<time></time><span class="device-status-icons" aria-hidden="true"><i class="fa-solid fa-signal"></i><i class="fa-solid fa-wifi"></i><i class="fa-solid fa-battery-three-quarters"></i></span>';
    const clock = status.querySelector('time');
    const updateClock = () => {
      clock.textContent = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date());
    };
    updateClock();
    window.setInterval(updateClock, 60000);
    app.prepend(status);
  }
})();
