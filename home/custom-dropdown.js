/* =====================================================
   BUSPASS CUSTOM DROPDOWN
   Replaces native <select> UI while keeping the original
   select element as the real form/data source.
   ===================================================== */
(function () {
    "use strict";

    let active = null;
    const STYLE_ID = "bp-custom-dropdown-style-v2";

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            .bp-dd {
                position: relative !important;
                display: block !important;
                width: 100% !important;
                min-width: 0 !important;
                height: 100% !important;
                flex: 1 1 auto !important;
            }
            .bp-dd-trigger {
                appearance: none !important;
                -webkit-appearance: none !important;
                box-sizing: border-box !important;
                width: 100% !important;
                min-height: 38px !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 8px 0 0 !important;
                border: 0 !important;
                border-radius: 0 !important;
                background: transparent !important;
                color: #284762 !important;
                font: 10px 'DM Sans', Arial, sans-serif !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                text-align: left !important;
                cursor: pointer !important;
                outline: none !important;
                box-shadow: none !important;
            }
            .bp-dd-trigger:hover { background: transparent !important; }
            .bp-dd-trigger:focus,
            .bp-dd-trigger.is-open {
                border: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
            }
            .bp-dd-trigger:disabled {
                opacity: .62 !important;
                cursor: not-allowed !important;
                background: transparent !important;
            }
            .bp-dd-icon {
                width: 16px !important;
                min-width: 16px !important;
                text-align: center !important;
                color: #6b8ba6 !important;
                pointer-events: none !important;
                font-size: 12px !important;
                flex: 0 0 32px !important;
            }
            .bp-dd-value {
                min-width: 0 !important;
                flex: 1 1 auto !important;
                overflow: hidden !important;
                white-space: nowrap !important;
                text-overflow: ellipsis !important;
            }
            .bp-dd-trigger[data-placeholder="true"] .bp-dd-value {
                color: #91a5b5 !important;
            }
            .bp-dd-arrow {
                flex: 0 0 auto !important;
                color: #7892a8 !important;
                font-size: 9px !important;
                transition: transform .16s ease !important;
                pointer-events: none !important;
            }
            .bp-dd-trigger.is-open .bp-dd-arrow { transform: rotate(180deg); }

            /* The outer .input-wrapper owns the single visible field border.
               The custom trigger is intentionally borderless so it never creates
               the double-border effect seen with native select wrappers. */
            .input-wrapper > .bp-dd {
                border: 0 !important;
                outline: 0 !important;
                box-shadow: none !important;
            }
            .input-wrapper > .bp-dd .bp-dd-trigger {
                border: 0 !important;
                outline: 0 !important;
                box-shadow: none !important;
                border-radius: 0 !important;
            }

            .bp-dd-panel {
                position: fixed !important;
                z-index: 2147483000 !important;
                box-sizing: border-box !important;
                padding: 6px !important;
                border: 1px solid #cdddea !important;
                border-radius: 10px !important;
                background: #ffffff !important;
                box-shadow: 0 12px 28px rgba(30,65,95,.18) !important;
                overflow: hidden !important;
            }
            .bp-dd-search-wrap {
                position: relative !important;
                margin-bottom: 5px !important;
            }
            .bp-dd-search-icon {
                position: absolute !important;
                left: 9px !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                color: #7e96aa !important;
                font-size: 10px !important;
                pointer-events: none !important;
            }
            .bp-dd-search {
                display: block !important;
                box-sizing: border-box !important;
                width: 100% !important;
                height: 32px !important;
                padding: 0 9px 0 28px !important;
                border: 1px solid #d5e1ea !important;
                border-radius: 8px !important;
                background: #f8fbfd !important;
                color: #284762 !important;
                font: 10px 'DM Sans', Arial, sans-serif !important;
                outline: none !important;
            }
            .bp-dd-search:focus {
                border-color: #8db6da !important;
                background: #fff !important;
            }
            .bp-dd-options {
                max-height: 185px !important;
                overflow-y: auto !important;
                overscroll-behavior: contain !important;
                scrollbar-width: thin !important;
            }
            .bp-dd-option {
                box-sizing: border-box !important;
                width: 100% !important;
                min-height: 34px !important;
                padding: 8px 10px !important;
                border-radius: 7px !important;
                display: flex !important;
                align-items: center !important;
                color: #284762 !important;
                background: transparent !important;
                font: 10px 'DM Sans', Arial, sans-serif !important;
                cursor: pointer !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }
            .bp-dd-option:hover,
            .bp-dd-option.is-highlighted { background: #edf5fc !important; color: #1767b7 !important; }
            .bp-dd-option.is-selected { background: #eaf3ff !important; color: #1767b7 !important; font-weight: 700 !important; }
            .bp-dd-empty { padding: 11px 9px !important; color: #91a5b5 !important; font: 10px 'DM Sans', Arial, sans-serif !important; }

            /* The real select remains in the DOM for form logic, but never receives pointer events. */
            .bp-native-hidden {
                position: absolute !important;
                width: 1px !important;
                height: 1px !important;
                opacity: 0 !important;
                pointer-events: none !important;
                border: 0 !important;
                padding: 0 !important;
                margin: -1px !important;
                clip: rect(0 0 0 0) !important;
                clip-path: inset(50%) !important;
                overflow: hidden !important;
                white-space: nowrap !important;
            }
        `;
        document.head.appendChild(style);
    }

    function closeActive() {
        if (!active) return;
        const dd = active;
        active = null;
        dd.trigger.classList.remove("is-open");
        dd.trigger.setAttribute("aria-expanded", "false");
        if (dd.panel && dd.panel.parentNode) dd.panel.parentNode.removeChild(dd.panel);
        dd.panel.style.display = "none";
    }

    function positionPanel(dd) {
        if (!dd || !dd.trigger || !dd.panel) return;
        const rect = dd.trigger.getBoundingClientRect();
        const margin = 4;
        const viewportH = window.innerHeight;
        const desired = Math.min(245, viewportH - 20);
        const spaceBelow = viewportH - rect.bottom - 10;
        const spaceAbove = rect.top - 10;
        const openUp = spaceBelow < 170 && spaceAbove > spaceBelow;
        const height = Math.max(80, Math.min(desired, openUp ? spaceAbove : spaceBelow));

        dd.panel.style.left = `${Math.max(6, Math.min(rect.left, window.innerWidth - rect.width - 6))}px`;
        dd.panel.style.width = `${rect.width}px`;
        dd.panel.style.maxHeight = `${height}px`;
        dd.panel.style.top = openUp
            ? `${Math.max(6, rect.top - height - margin)}px`
            : `${Math.min(viewportH - height - 6, rect.bottom + margin)}px`;
    }

    function refreshLabel(dd) {
        const value = dd.select.value;
        const selected = Array.from(dd.select.options).find(o => o.value === value);
        dd.value.textContent = selected ? selected.textContent.trim() : dd.placeholder;
        dd.trigger.dataset.placeholder = value ? "false" : "true";
        dd.options.forEach(node => {
            node.classList.toggle("is-selected", node.dataset.value === value);
        });
    }

    function filter(dd, query) {
        const q = String(query || "").trim().toLowerCase();
        let visible = 0;
        dd.options.forEach(node => {
            const match = !q || node.textContent.toLowerCase().includes(q);
            node.style.display = match ? "flex" : "none";
            if (match) visible++;
        });
        dd.empty.style.display = visible ? "none" : "block";
    }

    function rebuild(dd) {
        if (!dd || !dd.optionsContainer) return;
        dd.options.forEach(n => n.remove());
        dd.options = [];
        Array.from(dd.select.options).forEach(option => {
            if (!option.value) return;
            const node = document.createElement("div");
            node.className = "bp-dd-option";
            node.setAttribute("role", "option");
            node.dataset.value = option.value;
            node.textContent = option.textContent.trim();
            node.addEventListener("mousedown", e => e.preventDefault());
            node.addEventListener("click", e => {
                e.stopPropagation();
                dd.select.value = option.value;
                dd.select.dispatchEvent(new Event("change", { bubbles: true }));
                refreshLabel(dd);
                closeActive();
            });
            dd.optionsContainer.appendChild(node);
            dd.options.push(node);
        });
        refreshLabel(dd);
        filter(dd, dd.search.value);
    }

    function open(dd) {
        if (dd.select.disabled) return;
        if (active && active !== dd) closeActive();
        if (active === dd) {
            closeActive();
            return;
        }
        active = dd;
        document.body.appendChild(dd.panel);
        dd.panel.style.display = "block";
        dd.trigger.classList.add("is-open");
        dd.trigger.setAttribute("aria-expanded", "true");
        dd.search.value = "";
        filter(dd, "");
        positionPanel(dd);
        requestAnimationFrame(() => dd.search.focus({ preventScroll: true }));
    }

    function attach(select, config = {}) {
        if (!select || select._bpCustomDropdown) return select?._bpDD || null;
        injectStyles();

        const parent = select.parentElement;
        if (!parent) return null;

        // Capture the original leading field icon, then hide ALL original icons.
        // This prevents the original arrow and the custom arrow from appearing twice.
        const existingIcons = Array.from(parent.querySelectorAll(":scope > i"));
        const existingIcon = existingIcons[0] || null;
        let iconClass = "fa-solid fa-list";
        if (existingIcon && existingIcon.className) iconClass = existingIcon.className;
        existingIcons.forEach(icon => { icon.style.display = "none"; });

        const wrapper = document.createElement("div");
        wrapper.className = "bp-dd";
        wrapper.dataset.bpFor = select.id || "";

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "bp-dd-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");

        const icon = document.createElement("i");
        icon.className = iconClass;
        icon.classList.add("bp-dd-icon");
        const value = document.createElement("span");
        value.className = "bp-dd-value";
        const arrow = document.createElement("i");
        arrow.className = "fa-solid fa-chevron-down bp-dd-arrow";

        trigger.append(icon, value, arrow);

        const panel = document.createElement("div");
        panel.className = "bp-dd-panel";
        panel.setAttribute("role", "listbox");
        panel.style.display = "none";

        const searchWrap = document.createElement("div");
        searchWrap.className = "bp-dd-search-wrap";
        const searchIcon = document.createElement("i");
        searchIcon.className = "fa-solid fa-magnifying-glass bp-dd-search-icon";
        const search = document.createElement("input");
        search.type = "search";
        search.className = "bp-dd-search";
        search.autocomplete = "off";
        search.placeholder = config.searchPlaceholder || "Search options...";
        searchWrap.append(searchIcon, search);

        const optionsContainer = document.createElement("div");
        optionsContainer.className = "bp-dd-options";
        const empty = document.createElement("div");
        empty.className = "bp-dd-empty";
        empty.textContent = "No options found";
        empty.style.display = "none";

        optionsContainer.appendChild(empty);
        panel.append(searchWrap, optionsContainer);

        // CRITICAL: trigger + real select both live inside the wrapper.
        // The trigger is what the user clicks; the real select is hidden only for native UI.
        parent.insertBefore(wrapper, select);
        wrapper.appendChild(trigger);
        wrapper.appendChild(select);

        select.classList.add("bp-native-hidden");
        select._bpCustomDropdown = true;

        const dd = {
            select,
            wrapper,
            trigger,
            value,
            panel,
            search,
            optionsContainer,
            empty,
            options: [],
            placeholder: config.placeholder || (select.options[0]?.textContent?.trim() || "Select")
        };

        select._bpDD = dd;
        select._bpRefreshLabel = () => refreshLabel(dd);
        select._bpSyncDisabled = () => {
            trigger.disabled = !!select.disabled;
            if (select.disabled && active === dd) closeActive();
        };

        trigger.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            open(dd);
        });
        trigger.addEventListener("keydown", e => {
            if (["Enter", " ", "ArrowDown"].includes(e.key)) {
                e.preventDefault();
                open(dd);
            }
        });
        search.addEventListener("input", () => filter(dd, search.value));
        search.addEventListener("click", e => e.stopPropagation());
        search.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                e.preventDefault();
                closeActive();
                trigger.focus();
            }
        });

        select.addEventListener("change", () => refreshLabel(dd));

        let observerTimer = null;
        const observer = new MutationObserver(() => {
            clearTimeout(observerTimer);
            observerTimer = setTimeout(() => {
                rebuild(dd);
                select._bpSyncDisabled();
            }, 0);
        });
        observer.observe(select, { childList: true, subtree: true, attributes: true });
        select._bpObserver = observer;

        rebuild(dd);
        select._bpSyncDisabled();
        return dd;
    }

    function refresh(select) {
        if (!select || !select._bpDD) return select;
        const dd = select._bpDD;
        rebuild(dd);
        if (select._bpSyncDisabled) select._bpSyncDisabled();
        return select;
    }

    document.addEventListener("click", e => {
        if (!active) return;
        if (!active.wrapper.contains(e.target) && !active.panel.contains(e.target)) closeActive();
    }, true);
    window.addEventListener("resize", () => active && positionPanel(active));
    document.addEventListener("scroll", () => active && positionPanel(active), true);

    window.BP_CustomDropdown = {
        attach,
        attachAll(selector = "select[data-custom-dropdown]") {
            document.querySelectorAll(selector).forEach(s => attach(s));
        },
        refresh,
        refreshDisabled(select) {
            if (select?._bpSyncDisabled) select._bpSyncDisabled();
            return select;
        },
        closeAll: closeActive
    };
})();
