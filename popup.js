// =====================================================
// SHARED POPUP (Success / Error / Info / Confirm)
// =====================================================
// Login screen lo unnatta in-page popup ni
// anni screens lo show cheyadaniki common file.
//
// alert() / confirm() badulu ee functions use avvandi:
//
//   showPopup("success", "Title", "Message");
//   showPopup("error",   "Title", "Message");
//   showPopup("info",    "Title", "Message",
//            { buttonText: "OK", onOk: function () { ... } });
//
//   showConfirm("Title", "Message", function () {
//       // OK click chesaka idhi run avutundi
//   });
// =====================================================

(function () {

    // ==================================================
    // POPUP CSS (automatic ga page ki add avutundi)
    // ==================================================

    const style = document.createElement("style");

    style.textContent = `
        .bp-popup-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.35);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            font-family: "Poppins", sans-serif;
        }

        .bp-popup-overlay.show {
            display: flex;
        }

        .bp-popup-box {
            width: 285px;
            max-width: calc(100vw - 40px);
            background: #ffffff;
            border-radius: 18px;
            padding: 25px 20px 20px;
            text-align: center;
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.22);
            animation: bpPopupShow 0.2s ease;
        }

        @keyframes bpPopupShow {
            from {
                opacity: 0;
                transform: scale(0.90);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        .bp-popup-icon {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            margin: 0 auto 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e8f8ee;
            color: #24a148;
            font-size: 22px;
        }

        .bp-popup-icon.error {
            background: #fff0f0;
            color: #dc3545;
        }

        .bp-popup-icon.info {
            background: #eef4ff;
            color: #2f6df6;
        }

        .bp-popup-title {
            font-size: 18px;
            color: #143c91;
            margin: 0 0 5px;
        }

        .bp-popup-message {
            font-size: 11px;
            color: #666;
            line-height: 17px;
            margin: 0 0 17px;
            white-space: pre-line;
        }

        .bp-popup-actions {
            display: flex;
            gap: 10px;
        }

        .bp-popup-actions .bp-popup-btn {
            flex: 1;
        }

        .bp-popup-btn {
            width: 100%;
            height: 38px;
            border: none;
            border-radius: 20px;
            background: #2f6df6;
            color: white;
            font-family: "Poppins", sans-serif;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
        }

        .bp-popup-btn:hover {
            background: #1858df;
        }

        .bp-popup-btn.bp-popup-cancel {
            background: #e9edf5;
            color: #4a5568;
        }

        .bp-popup-btn.bp-popup-cancel:hover {
            background: #dbe2ee;
        }

        .bp-popup-hidden {
            display: none !important;
        }
    `;

    document.head.appendChild(style);



    // ==================================================
    // POPUP HTML (automatic ga create avutundi)
    // ==================================================

    const overlay = document.createElement("div");

    overlay.className = "bp-popup-overlay";

    overlay.innerHTML = `
        <div class="bp-popup-box">

            <div class="bp-popup-icon">
                <i class="fa-solid fa-check"></i>
            </div>

            <h3 class="bp-popup-title"></h3>

            <p class="bp-popup-message"></p>

            <div class="bp-popup-actions">

                <button
                    type="button"
                    class="bp-popup-btn bp-popup-cancel bp-popup-hidden">
                    Cancel
                </button>

                <button
                    type="button"
                    class="bp-popup-btn">
                    OK
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    const iconEl =
        overlay.querySelector(".bp-popup-icon");

    const titleEl =
        overlay.querySelector(".bp-popup-title");

    const messageEl =
        overlay.querySelector(".bp-popup-message");

    const okBtn = overlay.querySelector(
        ".bp-popup-btn:not(.bp-popup-cancel)"
    );

    const cancelBtn =
        overlay.querySelector(".bp-popup-cancel");


    let okCallback = null;


    // ==================================================
    // ICON SETUP
    // ==================================================

    function setIcon(type) {

        if (type === "success") {

            iconEl.className = "bp-popup-icon";

            iconEl.innerHTML =
                '<i class="fa-solid fa-check"></i>';

        } else if (type === "error") {

            iconEl.className = "bp-popup-icon error";

            iconEl.innerHTML =
                '<i class="fa-solid fa-xmark"></i>';

        } else {

            iconEl.className = "bp-popup-icon info";

            iconEl.innerHTML =
                '<i class="fa-solid fa-circle-info"></i>';

        }

    }


    function closePopup() {

        overlay.classList.remove("show");

        okCallback = null;

    }


    // ==================================================
    // SHOW POPUP (alert() badulu)
    // ==================================================

    window.showPopup = function (type, title, message, options) {

        options = options || {};

        okCallback =
            typeof options.onOk === "function"
                ? options.onOk
                : null;

        setIcon(type);

        titleEl.textContent = title;

        messageEl.textContent = message;

        okBtn.textContent = options.buttonText || "OK";

        cancelBtn.classList.add("bp-popup-hidden");

        overlay.classList.add("show");

    };


    // ==================================================
    // SHOW CONFIRM (confirm() badulu)
    // ==================================================

    window.showConfirm = function (title, message, onOk, options) {

        options = options || {};

        okCallback =
            typeof onOk === "function" ? onOk : null;

        setIcon(options.type || "info");

        titleEl.textContent = title;

        messageEl.textContent = message;

        okBtn.textContent = options.okText || "Yes";

        cancelBtn.textContent = options.cancelText || "Cancel";

        cancelBtn.classList.remove("bp-popup-hidden");

        overlay.classList.add("show");

    };


    // ==================================================
    // BUTTON CLICKS
    // ==================================================

    okBtn.addEventListener("click", function () {

        const callback = okCallback;

        closePopup();

        if (callback) callback();

    });


    cancelBtn.addEventListener("click", closePopup);


    // Backdrop meeda click cheste close

    overlay.addEventListener("click", function (event) {

        if (event.target === overlay) {

            closePopup();

        }

    });

})();
