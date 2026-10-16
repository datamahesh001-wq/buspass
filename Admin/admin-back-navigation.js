/* Admin back-button behavior only.
   Returns to the Admin screen that opened the current page, instead of
   forcing the user to the Applications list or Dashboard every time. */
(function () {
  'use strict';

  document.addEventListener('click', function (event) {
    const backButton = event.target && event.target.closest
      ? event.target.closest('#backButton, .back-btn')
      : null;

    if (!backButton) return;

    // Take control before page-specific handlers can redirect to a fixed page.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    let previousIsAdminPage = false;

    try {
      if (document.referrer) {
        const previousUrl = new URL(document.referrer);
        const currentUrl = new URL(window.location.href);
        previousIsAdminPage =
          previousUrl.origin === currentUrl.origin &&
          /\/Admin\//i.test(previousUrl.pathname) &&
          previousUrl.href !== currentUrl.href;
      }
    } catch (_) {
      previousIsAdminPage = false;
    }

    if (previousIsAdminPage && window.history.length > 1) {
      window.history.back();
      return;
    }

    // Safe fallback when a page is opened directly without an Admin referrer.
    window.location.href = 'admin-dashboard.html';
  }, true);
})();
