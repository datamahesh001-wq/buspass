#!/usr/bin/env node
// =====================================================
// SMOKE TEST — Location Cascade + Route Stops
// =====================================================
// Ee file "location cascade" (State -> District -> City)
// and "route stops from user details" logic ni automated
// ga test chestundi. Browser avasaram ledu — direct Node
// lo run avtundi.
//
// RUN:
//   node smoke-test.js
// (ee folder nunchi: Myproject/home)
//
// Em test chestundi:
//   1. location-data.js  -> data structure + uniqueness
//   2. Cascade           -> State first, District next,
//                           City/Town last (automatic,
//                           unique, reset on parent change)
//   3. Route stops       -> user details base chesukoni
//                           unique options + auto selection
//   4. Screen integration-> student/employee details &
//                           route scripts end-to-end
// =====================================================

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const HOME_DIR = __dirname;

const FILES = {
    location: "location-data.js",
    studentDetails: "student-details.js",
    employeeDetails: "employee-details.js",
    studentRoute: "student-route.js",
    employeeRoute: "employee-route.js"
};

// Selects that behave like <select> elements
const SELECT_IDS = new Set(["state", "district", "city", "fromStop", "toStop", "gender"]);


// ==========================================
// TEST HARNESS
// ==========================================

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, extra) {
    if (condition) {
        passed++;
        console.log("  PASS  " + name);
    } else {
        failed++;
        const detail = extra ? "  -> " + extra : "";
        failures.push(name + detail);
        console.log("  FAIL  " + name + detail);
    }
}

function assertEqual(name, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    check(name, a === e, "expected " + e + ", got " + a);
}

function section(title) {
    console.log("\n=== " + title + " ===");
}

// ==========================================
// BROWSER STUBS (mini fake DOM)
// ==========================================

function makeClassList() {
    const set = new Set();
    return {
        add: (...names) => names.forEach(n => set.add(n)),
        remove: (...names) => names.forEach(n => set.delete(n)),
        toggle: (n, force) => {
            const shouldAdd = force === undefined ? !set.has(n) : !!force;
            if (shouldAdd) set.add(n); else set.delete(n);
            return shouldAdd;
        },
        contains: n => set.has(n)
    };
}

function makeParentStub() {
    return { classList: makeClassList(), dataset: {}, style: {} };
}

// Generic <select> stub with working options/value/disabled

function makeSelect() {
    const select = {
        tagName: "SELECT",
        options: [],
        disabled: false,
        required: false,
        dataset: {},
        style: {},
        classList: makeClassList(),
        _listeners: {},
        _value: "",
        appendChild(node) { this.options.push(node); return node; },
        addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
        focus() {},
        closest() { return makeParentStub(); },
        get value() {
            const v = this._value;
            return this.options.some(option => option.value === v) ? v : "";
        },
        set value(v) {
            this._value = this.options.some(option => option.value === v) ? v : "";
        }
    };
    Object.defineProperty(select, "innerHTML", {
        get() { return ""; },
        set(html) { if (html === "") this.options = []; }
    });
    return select;
}

// Generic <input>/<textarea>/<button> stub

function makeInput() {
    return {
        tagName: "INPUT",
        value: "",
        placeholder: "",
        disabled: false,
        checked: false,
        dataset: {},
        style: {},
        classList: makeClassList(),
        _listeners: {},
        addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
        focus() {},
        blur() {},
        click() {},
        closest() { return makeParentStub(); }
    };
}

// Generic <div>/<label>/<span> stub

function makeGeneric() {
    return {
        tagName: "DIV",
        textContent: "",
        value: "",
        dataset: {},
        style: {},
        classList: makeClassList(),
        _listeners: {},
        addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
        appendChild() {},
        closest() { return makeParentStub(); }
    };
}

function makeOption() {
    return { value: "", textContent: "", selected: false };
}

// Fire a DOM event on a stub element

function fire(element, type) {
    (element._listeners[type] || []).forEach(fn => fn.call(element));
}

function optionValues(select) {
    return select.options.map(option => option.value);
}

function optionTexts(select) {
    return select.options.map(option => option.textContent);
}

// ==========================================
// SANDBOX FACTORY (fresh environment per test)
// ==========================================

function createSandbox(options) {

    options = options || {};

    const elements = new Map();
    const popups = [];
    const fetchCalls = [];
    const store = new Map();

    // Seed localStorage before scripts run

    Object.keys(options.localStorage || {}).forEach(key => {
        store.set(key, options.localStorage[key]);
    });

    // Radio buttons (bus type) for route screens

    const radios = {};
    (options.busTypes || ["Ordinary", "Express", "Metro Deluxe"]).forEach(type => {
        radios[type] = {
            tagName: "INPUT",
            type: "radio",
            name: "busType",
            value: type,
            checked: false,
            closest() { return makeParentStub(); }
        };
    });

    const documentStub = {
        title: "",
        getElementById(id) {
            if (!elements.has(id)) {
                elements.set(id, SELECT_IDS.has(id) ? makeSelect() : makeInput());
            }
            return elements.get(id);
        },
        createElement(tag) {
            return tag === "option" ? makeOption() : makeGeneric();
        },
        querySelector(selector) {
            if (!selector) return null;
            const byValue = selector.match(/input\[name="busType"\]\[value="(.+)"\]/);
            if (byValue) return radios[byValue[1]] || null;
            if (selector.indexOf('input[name="busType"]:checked') !== -1) {
                return Object.values(radios).find(radio => radio.checked) || null;
            }
            if (!elements.has("sel:" + selector)) {
                elements.set("sel:" + selector, makeGeneric());
            }
            return elements.get("sel:" + selector);
        },
        querySelectorAll(selector) {
            // Memoized so tests can inspect the same stubs
            // the script mutated (e.g. ".field label").
            if (!this._qsaCache) this._qsaCache = new Map();
            if (this._qsaCache.has(selector)) return this._qsaCache.get(selector);
            let result = [];
            if (selector === ".category-option") {
                result = [
                    { dataset: { category: "SSC Below" }, classList: makeClassList(), _listeners: {}, addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); } },
                    { dataset: { category: "SSC Above" }, classList: makeClassList(), _listeners: {}, addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); } }
                ];
            } else if (selector === ".bus-option") {
                result = Object.values(radios).map(() => makeGeneric());
            } else if (selector === ".field label") {
                result = [makeGeneric(), makeGeneric()];
            }
            this._qsaCache.set(selector, result);
            return result;
        }
    };

    const localStorageStub = {
        getItem: key => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: key => store.delete(key),
        clear: () => store.clear()
    };

    const sandbox = {
        document: documentStub,
        localStorage: localStorageStub,
        window: { location: { href: "" }, history: { back() {} } },
        alert() {},
        confirm() { return false; },
        console,
        showPopup(type, title, message) { popups.push({ type, title, message }); },
        fetch: async (url, init) => {
            fetchCalls.push({ url, init });
            if (options.fetchFail) {
                throw new Error("Connection Failed");
            }
            return {
                ok: options.fetchOk === false ? false : true,
                json: async () => (options.fetchResponse || { success: true, applicationId: "APP-1" })
            };
        },
        setTimeout, clearTimeout, Promise, JSON, Math, Date,
        Object, Array, String, Number, Boolean, RegExp, Error, Set, Map
    };

    // Expose internals for assertions

    sandbox.__els = elements;
    sandbox.__popups = popups;
    sandbox.__fetchCalls = fetchCalls;
    sandbox.__radios = radios;
    sandbox.__store = store;

    return vm.createContext(sandbox);

}

function loadFile(sandbox, file) {
    const code = fs.readFileSync(path.join(HOME_DIR, file), "utf8");
    vm.runInContext(code, sandbox, { filename: file });
}

// Load location-data.js and expose its top-level
// const bindings (consts are not on the sandbox object).

function loadLocationData(sandbox) {
    loadFile(sandbox, FILES.location);
    vm.runInContext([
        "this.__LD = LOCATION_DATA;",
        "this.__getUniqueOptions = getUniqueOptions;",
        "this.__fillSelectOptions = fillSelectOptions;",
        "this.__setupLocationDropdowns = setupLocationDropdowns;",
        "this.__buildRouteStopOptions = buildRouteStopOptions;",
        "this.__buildFromStops = buildFromStops;",
        "this.__buildToStops = buildToStops;",
        "this.__getCityStops = getCityStops;"
    ].join("\n"), sandbox);
}

// ==========================================
// TEST GROUP 1: location-data.js structure
// ==========================================

function testDataStructure() {

    section("1. LOCATION DATA STRUCTURE");

    const sandbox = createSandbox();
    loadLocationData(sandbox);
    const LD = sandbox.__LD;

    const states = Object.keys(LD);

    check("data has states", states.length > 0, "no states found");
    check("Andhra Pradesh present", states.includes("Andhra Pradesh"));
    check("Telangana present", states.includes("Telangana"));
    check("Puducherry present", states.includes("Puducherry"));

    // Every state -> object of districts -> non-empty unique city arrays

    let structureOk = true;
    let emptyDistrict = "";
    let emptyCities = "";
    let duplicateCity = "";
    let duplicateDistrict = "";

    states.forEach(state => {

        const districts = LD[state];
        if (!districts || typeof districts !== "object" || Array.isArray(districts)) {
            structureOk = false;
            return;
        }

        const districtNames = Object.keys(districts);
        const seenDistricts = new Set();

        districtNames.forEach(district => {

            const key = district.toLowerCase();
            if (seenDistricts.has(key)) duplicateDistrict = state + "/" + district;
            seenDistricts.add(key);

            const cities = districts[district];
            if (!Array.isArray(cities) || cities.length === 0) {
                emptyDistrict = state + "/" + district;
                return;
            }

            const seenCities = new Set();
            cities.forEach(city => {
                const cityKey = String(city).toLowerCase();
                if (seenCities.has(cityKey)) duplicateCity = state + "/" + district + "/" + city;
                seenCities.add(cityKey);
            });

        });

        if (districtNames.length === 0) emptyCities = state;

    });

    check("every state maps to district object", structureOk);
    check("no empty district lists", !emptyDistrict, emptyDistrict);
    check("every district has cities", !emptyCities, emptyCities);
    check("no duplicate cities within a district", !duplicateCity, duplicateCity);
    check("no duplicate districts within a state", !duplicateDistrict, duplicateDistrict);

    // Known data sanity checks

    check("Andhra Pradesh has 26 districts", Object.keys(LD["Andhra Pradesh"]).length === 26,
        "got " + Object.keys(LD["Andhra Pradesh"]).length);
    check("Telangana has 33 districts", Object.keys(LD["Telangana"]).length === 33,
        "got " + Object.keys(LD["Telangana"]).length);
    assertEqual("Kakinada district towns",
        LD["Andhra Pradesh"]["Kakinada"],
        ["Kakinada", "Pithapuram", "Gollaprolu", "Peddapuram"]);

}


// ==========================================
// TEST GROUP 2: getUniqueOptions helper
// ==========================================

function testUniqueOptions() {

    section("2. getUniqueOptions (UNIQUE HELPER)");

    const sandbox = createSandbox();
    loadLocationData(sandbox);
    const getUniqueOptions = sandbox.__getUniqueOptions;

    assertEqual("removes exact duplicates",
        getUniqueOptions(["A", "B", "A"]), ["A", "B"]);

    assertEqual("removes case-insensitive duplicates",
        getUniqueOptions(["Kakinada", "kakinada", "KAKINADA"]), ["Kakinada"]);

    assertEqual("trims values",
        getUniqueOptions(["  Yanam  ", "Yanam"]), ["Yanam"]);

    assertEqual("drops empty and null values",
        getUniqueOptions(["", "   ", null, undefined, "X"]), ["X"]);

    assertEqual("handles null input", getUniqueOptions(null), []);

    assertEqual("keeps first occurrence order",
        getUniqueOptions(["B", "A", "B", "C"]), ["B", "A", "C"]);

}

// ==========================================
// TEST GROUP 3: fillSelectOptions helper
// ==========================================

function testFillSelect() {

    section("3. fillSelectOptions (SELECT FILL)");

    const sandbox = createSandbox();
    loadLocationData(sandbox);
    const fillSelectOptions = sandbox.__fillSelectOptions;

    const select = sandbox.document.getElementById("city");

    fillSelectOptions(select, ["B", "A", "B"], "Pick one");

    assertEqual("placeholder is first with empty value",
        [select.options[0].value, select.options[0].textContent], ["", "Pick one"]);

    assertEqual("options are unique and in order",
        optionValues(select).slice(1), ["B", "A"]);

    check("ignores null select", fillSelectOptions(null, ["A"], "X") === undefined);

    // Refill replaces old options (no stacking)

    fillSelectOptions(select, ["C"], "Again");
    assertEqual("refill replaces previous options",
        optionValues(select), ["", "C"]);

}


// ==========================================
// TEST GROUP 4: State -> District -> City CASCADE
// ==========================================

function testCascade() {

    section("4. CASCADE: STATE -> DISTRICT -> CITY");

    const sandbox = createSandbox();
    loadLocationData(sandbox);

    const state = sandbox.document.getElementById("state");
    const district = sandbox.document.getElementById("district");
    const city = sandbox.document.getElementById("city");

    sandbox.__setupLocationDropdowns({
        stateSelect: state,
        districtSelect: district,
        citySelect: city,
        statePlaceholder: "Select State",
        districtPlaceholder: "Select District",
        cityPlaceholder: "Select City/Town"
    });

    // STEP 1: initial load — state first, others locked

    const stateValues = optionValues(state).slice(1);
    check("state options filled on load (36 states/UTs)", stateValues.length === 36,
        "got " + stateValues.length + ": " + stateValues.join(", "));
    assertEqual("state placeholder is first",
        [state.options[0].value, state.options[0].textContent], ["", "Select State"]);
    check("state options unique",
        new Set(stateValues).size === stateValues.length);
    check("district disabled before state selection", district.disabled === true);
    check("city disabled before district selection", city.disabled === true);
    assertEqual("district has only placeholder", optionValues(district), [""]);
    assertEqual("city has only placeholder", optionValues(city), [""]);

    // STEP 2: select state -> districts appear automatically

    state.value = "Andhra Pradesh";
    fire(state, "change");

    const districtValues = optionValues(district).slice(1);
    assertEqual("districts load from selected state (AP 26)",
        districtValues.length, 26);
    check("district list unique",
        new Set(districtValues).size === districtValues.length);
    check("district enabled after state selection", district.disabled === false);
    check("district includes Kakinada", districtValues.includes("Kakinada"));
    check("district excludes other state districts",
        !districtValues.includes("Hyderabad"));
    assertEqual("district placeholder restored",
        [district.options[0].value, district.options[0].textContent], ["", "Select District"]);
    check("city locked again after state change", city.disabled === true);

    // STEP 3: select district -> cities appear automatically

    district.value = "Kakinada";
    fire(district, "change");

    assertEqual("cities load from selected district",
        optionValues(city).slice(1),
        ["Kakinada", "Pithapuram", "Gollaprolu", "Peddapuram"]);
    check("city enabled after district selection", city.disabled === false);
    assertEqual("city placeholder text",
        [city.options[0].value, city.options[0].textContent], ["", "Select City/Town"]);

    city.value = "Pithapuram";
    assertEqual("city selection works", city.value, "Pithapuram");

    // STEP 4: change state -> child selections reset

    state.value = "Telangana";
    fire(state, "change");

    assertEqual("district resets on state change", district.value, "");
    check("city disabled again", city.disabled === true);
    assertEqual("city resets on state change", city.value, "");
    check("new state districts loaded",
        optionValues(district).includes("Khammam"));

    district.value = "Hyderabad";
    fire(district, "change");
    assertEqual("Telangana district cities load",
        optionValues(city).slice(1), ["Hyderabad", "Secunderabad"]);

}

// ==========================================
// TEST GROUP 5: cascade edge cases
// ==========================================

function testCascadeEdgeCases() {

    section("5. CASCADE EDGE CASES");

    // Custom placeholders + no city select (2-dropdown mode)

    const s2 = createSandbox();
    loadLocationData(s2);
    const st2 = s2.document.getElementById("state");
    const di2 = s2.document.getElementById("district");
    s2.__setupLocationDropdowns({
        stateSelect: st2,
        districtSelect: di2,
        statePlaceholder: "Mee State",
        districtPlaceholder: "Mee District"
    });
    assertEqual("custom state placeholder",
        st2.options[0].textContent, "Mee State");
    st2.value = "Puducherry";
    fire(st2, "change");
    assertEqual("custom district placeholder",
        di2.options[0].textContent, "Mee District");
    assertEqual("Puducherry districts load",
        optionValues(di2).slice(1), ["Puducherry", "Karaikal", "Mahe", "Yanam"]);

    // Guards — no crash with null selects

    const s3 = createSandbox();
    loadLocationData(s3);
    let guardOk = true;
    try {
        s3.__setupLocationDropdowns({ stateSelect: null, districtSelect: null });
        s3.__setupLocationDropdowns({
            stateSelect: s3.document.getElementById("state"),
            districtSelect: s3.document.getElementById("district")
        });
    } catch (error) {
        guardOk = false;
    }
    check("no crash when city select missing", guardOk);

}


// ==========================================
// TEST GROUP 6: buildRouteStopOptions
// ==========================================

function testRouteStopBuilder() {

    section("6. ROUTE STOPS FROM USER DETAILS");

    const sandbox = createSandbox();
    loadLocationData(sandbox);
    const build = sandbox.__buildRouteStopOptions;

    // Full details: city + district first, then district towns

    assertEqual("city + district first, then district towns",
        build({ state: "Andhra Pradesh", district: "Kakinada", city: "Kakinada" }),
        ["Kakinada", "Pithapuram", "Gollaprolu", "Peddapuram"]);

    assertEqual("different city than district keeps both first",
        build({ state: "Andhra Pradesh", district: "Kakinada", city: "Pithapuram" }),
        ["Pithapuram", "Kakinada", "Gollaprolu", "Peddapuram"]);

    // City same as district name -> deduped

    assertEqual("duplicate city/district name deduped",
        build({ state: "Andhra Pradesh", district: "Eluru", city: "Eluru" }),
        ["Eluru", "Nuzvid", "Jangareddigudem", "Dwaraka Tirumala"]);

    // Missing district -> whole state cities as fallback

    const stateFallback = build({ state: "Puducherry", district: "", city: "Mahe" });
    check("fallback uses state cities when district missing",
        stateFallback.length >= 6 && stateFallback[0] === "Mahe",
        JSON.stringify(stateFallback));

    // Edge cases

    assertEqual("empty details -> no stops", build({}), []);
    assertEqual("null details -> no stops", build(null), []);
    assertEqual("unknown state -> user values only",
        build({ state: "Nowhere", district: "X", city: "Y" }), ["Y", "X"]);
    assertEqual("unknown district -> city + district only",
        build({ state: "Andhra Pradesh", district: "UnknownDist", city: "MyTown" }),
        ["MyTown", "UnknownDist"]);

}


// ==========================================
// TEST GROUP 7: all India states/UTs dataset
// ==========================================

function testAllIndiaData() {

    section("7. ALL-INDIA LOCATION DATA (36 states/UTs)");

    const sandbox = createSandbox();
    loadLocationData(sandbox);
    const LD = sandbox.__LD;
    const states = Object.keys(LD);

    // All 28 states + 8 UTs

    const expected = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
        "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
        "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal",
        "Andaman and Nicobar Islands", "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu", "NCT of Delhi",
        "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
    ];

    check("36 states/UTs present", states.length === 36, "got " + states.length);
    expected.forEach(name => check("contains " + name, states.includes(name)));

    // Every state has districts, every district has unique towns

    let emptyState = "", emptyDistrict = "", dupTown = "";
    states.forEach(state => {
        const districts = LD[state];
        if (!districts || typeof districts !== "object" || Array.isArray(districts)) {
            emptyState = state;
            return;
        }
        const names = Object.keys(districts);
        if (!names.length) return;
        names.forEach(district => {
            const towns = districts[district];
            if (!towns || !towns.length) { emptyDistrict = state + "/" + district; return; }
            const seen = new Set();
            towns.forEach(t => {
                const k = String(t).toLowerCase();
                if (seen.has(k)) dupTown = state + "/" + district + "/" + t;
                seen.add(k);
            });
        });
    });
    check("every state maps to districts", !emptyState, emptyState);
    check("every district has towns", !emptyDistrict, emptyDistrict);
    check("no duplicate towns within a district", !dupTown, dupTown);

    // Spot checks

    check("Andhra Pradesh has 26 districts", Object.keys(LD["Andhra Pradesh"]).length === 26);
    check("Uttar Pradesh has 75 districts", Object.keys(LD["Uttar Pradesh"]).length === 75);
    check("Puducherry still has 4 districts", Object.keys(LD["Puducherry"]).length === 4);

}


// ==========================================
// TEST GROUP 8: buildFromStops + buildToStops
// ==========================================

function testRouteHelpers() {

    section("8. FROM STOP / TO STOP DEPENDENCY");

    const sandbox = createSandbox();
    loadLocationData(sandbox);
    const fromStops = sandbox.__buildFromStops;
    const toStops = sandbox.__buildToStops;

    const details = { state: "Andhra Pradesh", district: "Kakinada", city: "Pithapuram" };

    // From = bus stops of user's city only

    assertEqual("from stops = city bus stations",
        fromStops(details),
        [
            "Pithapuram Bus Station", "Pithapuram RTC Complex",
            "Pithapuram Bus Stand", "Pithapuram Railway Station",
            "Pithapuram Main Road"
        ]);

    // No unrelated towns in From Stop list
    const fromList = fromStops(details);
    check("from stops stay inside the city",
        ["Kakinada", "Gollaprolu", "Peddapuram"].every(t => !fromList.some(s => s.indexOf(t) === 0)));

    // To stops = other towns in same district (not the from town)
    const toList = toStops(details, "Pithapuram Bus Station");
    check("to stops exclude the from town",
        !toList.some(s => s.indexOf("Pithapuram") === 0));
    check("to stops include other towns of district",
        ["Kakinada Bus Station", "Gollaprolu Bus Station", "Peddapuram Bus Station"]
            .every(s => toList.includes(s)));
    check("to stops unique", new Set(toList).size === toList.length);

    // City missing -> from stops fall back to entire district towns
    const noCity = fromStops({ state: "Andhra Pradesh", district: "Kakinada", city: "" });
    check("no city -> district-wide from stops fallback",
        noCity.length > 10 && noCity.includes("Kakinada Bus Station"),
        JSON.stringify(noCity));

    // No details -> empty
    assertEqual("empty details -> no from stops", fromStops({}), []);
    assertEqual("null details -> no to stops", toStops(null, "X"), []);

    // Unknown state: if a city is given, From stops = that city's
    // stops (city is the user's own input); no city -> empty.
    assertEqual("unknown state with city -> city stops",
        fromStops({ state: "Nowhere", district: "X", city: "Y" }),
        ["Y Bus Station", "Y RTC Complex", "Y Bus Stand", "Y Railway Station", "Y Main Road"]);
    assertEqual("unknown state without city -> empty",
        fromStops({ state: "Nowhere", district: "X", city: "" }), []);

    // To stops honor the current from town even when same district
    const swapped = toStops(details, "Gollaprolu Bus Station");
    check("to stops follow the chosen from stop",
        !swapped.some(s => s.indexOf("Gollaprolu") === 0) && swapped.includes("Pithapuram Bus Station"));

}


// ==========================================
// TEST GROUP 9: User-requested end-to-end flow
// (State -> District -> City -> Route -> From -> To)
// Data: Andhra Pradesh -> Anakapalli -> Anakapalle
// ==========================================

function testRequestedFlow() {

    section("9. REQUESTED FLOW (AP -> Anakapalli -> Anakapalle)");

    const sandbox = createSandbox();
    loadLocationData(sandbox);
    const LD = sandbox.__LD;

    // Complete state list present
    check("ALL states/UTs present as data keys",
        Object.keys(LD).length === 36);

    // District -> City relationship
    const anakapalliTowns = LD["Andhra Pradesh"]["Anakapalli"];
    assertEqual("Anakapalli district towns", anakapalliTowns,
        ["Anakapalle", "Atchutapuram", "Chodavaram", "Elamanchili", "Narsipatnam", "Payakaraopeta"]);
    check("Anakapalle is a town of Anakapalli",
        anakapalliTowns.includes("Anakapalle"));

    // From stops for Anakapalle
    const from = sandbox.__buildFromStops(
        { state: "Andhra Pradesh", district: "Anakapalli", city: "Anakapalle" }
    );
    assertEqual("From Stops = Anakapalle bus stops", from, [
        "Anakapalle Bus Station", "Anakapalle RTC Complex",
        "Anakapalle Bus Stand", "Anakapalle Railway Station",
        "Anakapalle Main Road"
    ]);

    // To stops must NOT include unrelated cities
    const to = sandbox.__buildToStops(
        { state: "Andhra Pradesh", district: "Anakapalli", city: "Anakapalle" },
        "Anakapalle Bus Station"
    );
    ["Vijayawada", "Guntur", "Visakhapatnam", "Hyderabad", "Bengaluru", "Bengaluru U"]
        .forEach(unrelated => check("To stops exclude " + unrelated,
            !to.some(s => s.toLowerCase().indexOf(unrelated.toLowerCase()) === 0)));
    check("To stops are other Anakapalli towns",
        to.some(s => s.indexOf("Elamanchili") === 0) &&
        to.some(s => s.indexOf("Chodavaram") === 0) &&
        !to.some(s => s.indexOf("Anakapalle") === 0));

    // Reset logic: change state -> dependent values rebuild
    const state = sandbox.document.getElementById("state");
    const district = sandbox.document.getElementById("district");
    const city = sandbox.document.getElementById("city");
    sandbox.__setupLocationDropdowns({
        stateSelect: state, districtSelect: district, citySelect: city
    });

    state.value = "Andhra Pradesh";
    fire(state, "change");
    district.value = "Anakapalli";
    fire(district, "change");
    check("city list loaded for Anakapalli",
        optionValues(city).includes("Anakapalle"));

    // Change to Telangana -> district resets
    state.value = "Telangana";
    fire(state, "change");
    assertEqual("district resets on state change", district.value, "");
    assertEqual("city resets on state change", city.value, "");
    check("city disabled after reset", city.disabled === true);
    check("district lists only Telangana",
        optionValues(district).includes("Hyderabad") &&
        !optionValues(district).includes("Anakapalli"));

    // TEST 4: District disabled before State selection
    const s4 = createSandbox();
    loadLocationData(s4);
    const st4 = s4.document.getElementById("state");
    const di4 = s4.document.getElementById("district");
    const ci4 = s4.document.getElementById("city");
    s4.__setupLocationDropdowns({
        stateSelect: st4, districtSelect: di4, citySelect: ci4
    });
    check("TEST4 district disabled before state", di4.disabled === true);
    check("TEST4 city disabled before state", ci4.disabled === true);

    // TEST 5: City disabled before District selection
    const s5 = createSandbox();
    loadLocationData(s5);
    const st5 = s5.document.getElementById("state");
    const di5 = s5.document.getElementById("district");
    const ci5 = s5.document.getElementById("city");
    s5.__setupLocationDropdowns({
        stateSelect: st5, districtSelect: di5, citySelect: ci5
    });
    st5.value = "Andhra Pradesh";
    fire(st5, "change");
    check("TEST5 city still disabled before district", ci5.disabled === true);

}

// ==========================================
// TEST GROUP 10: student-details.js integration
// ==========================================

async function testStudentDetailsScreen() {

    section("9. STUDENT DETAILS SCREEN (cascade end-to-end)");

    const sandbox = createSandbox({
        localStorage: {
            selectedPassType: "Student Pass",
            loggedInUser: JSON.stringify({ id: 1 })
        }
    });
    sandbox.__els.set("gender", makeInput()); // gender behaves like input in tests
    loadLocationData(sandbox);
    loadFile(sandbox, FILES.studentDetails);

    const state = sandbox.document.getElementById("state");
    const district = sandbox.document.getElementById("district");
    const city = sandbox.document.getElementById("city");

    // Cascade is wired automatically on load

    check("state options auto-filled on screen load",
        optionValues(state).length > 1);
    check("district disabled on load", district.disabled === true);

    // User flow: state -> district -> city

    state.value = "Andhra Pradesh";
    fire(state, "change");
    check("districts appear after state selection",
        optionValues(district).includes("Kakinada"));

    district.value = "Kakinada";
    fire(district, "change");
    assertEqual("cities appear after district selection",
        optionValues(city).slice(1),
        ["Kakinada", "Pithapuram", "Gollaprolu", "Peddapuram"]);

    city.value = "Kakinada";

    // Student category selection (SSC Below) — next button
    // enable avutundi, save lo studentCategory save avutundi

    const categoryButtons = sandbox.document.querySelectorAll(".category-option");
    fire(categoryButtons[0], "click");

    // Validation: empty form -> popup, no fetch

    await sandbox.saveAndContinue();
    check("empty form shows a validation popup",
        sandbox.__popups.length >= 1,
        JSON.stringify(sandbox.__popups));
    check("no fetch on invalid form", sandbox.__fetchCalls.length === 0);

    // Fill remaining required fields and save

    const fieldsToFill = {
        fullName: "Test User", dob: "2000-01-01", gender: "Male",
        mobile: "9876543210", email: "test@example.com",
        aadhaar: "123456789012", collegeName: "Test College",
        fatherName: "Father Name", contactNumber: "9876543211",
        pinCode: "533101", permanentAddress: "Test Address"
    };
    Object.keys(fieldsToFill).forEach(id => {
        sandbox.document.getElementById(id).value = fieldsToFill[id];
    });

    await sandbox.saveAndContinue();

    check("details saved to localStorage",
        !!sandbox.__store.get("studentDetails"));
    const saved = JSON.parse(sandbox.__store.get("studentDetails") || "{}");
    assertEqual("saved state matches cascade selection", saved.state, "Andhra Pradesh");
    assertEqual("saved district matches cascade selection", saved.district, "Kakinada");
    assertEqual("saved city matches cascade selection", saved.city, "Kakinada");
    check("details sent to backend API",
        sandbox.__fetchCalls.length === 1 &&
        sandbox.__fetchCalls[0].url.includes("/api/details"));
    const body = JSON.parse(sandbox.__fetchCalls[0].init.body);
    assertEqual("API body carries cascade values",
        [body.details.state, body.details.district, body.details.city],
        ["Andhra Pradesh", "Kakinada", "Kakinada"]);
    assertEqual("redirects after save",
        sandbox.window.location.href, "documents-upload.html");

    // Mobile input filter (digits only, max 10)

    const mobile = sandbox.document.getElementById("mobile");
    mobile.value = "abc1234567890";
    fire(mobile, "input");
    assertEqual("mobile input filtered to 10 digits",
        mobile.value, "1234567890");

}


// ==========================================
// TEST GROUP 8: employee-details.js integration
// ==========================================

async function testEmployeeDetailsScreen() {

    section("10. EMPLOYEE DETAILS SCREEN (cascade end-to-end)");

    const sandbox = createSandbox();
    loadLocationData(sandbox);
    loadFile(sandbox, FILES.employeeDetails);

    const state = sandbox.document.getElementById("state");
    const district = sandbox.document.getElementById("district");
    const city = sandbox.document.getElementById("city");

    check("state options auto-filled on screen load",
        optionValues(state).length > 1);
    check("district disabled on load", district.disabled === true);

    state.value = "Andhra Pradesh";
    fire(state, "change");
    district.value = "Visakhapatnam";
    fire(district, "change");

    assertEqual("Visakhapatnam cities load",
        optionValues(city).slice(1),
        ["Visakhapatnam", "Gajuwaka", "Bheemunipatnam", "Pendurthi"]);
    check("city enabled after district selection", city.disabled === false);

    // Same-address checkbox behaviour

    const sameAddress = sandbox.document.getElementById("sameAddress");
    const address = sandbox.document.getElementById("address");
    sameAddress.checked = true;
    fire(sameAddress, "change");
    assertEqual("same-address fills address field",
        address.value, "Same as current address");
    sameAddress.checked = false;
    fire(sameAddress, "change");
    assertEqual("unchecking clears address field", address.value, "");

    // Next with empty form -> validation popup, no fetch

    await sandbox.document.getElementById("nextBtn")._listeners.click[0]();
    check("empty employee form shows validation popup",
        sandbox.__popups.length >= 1, JSON.stringify(sandbox.__popups));
    check("no fetch on invalid employee form",
        sandbox.__fetchCalls.length === 0);

    // Mobile filter listener

    const mobile = sandbox.document.getElementById("mobile");
    mobile.value = "12ab34de56f7890x";
    fire(mobile, "input");
    assertEqual("employee mobile filtered to 10 digits",
        mobile.value, "1234567890");

}

// ==========================================
// TEST GROUP 9: student-route.js screen
// ==========================================

async function testStudentRouteScreen() {

    section("11. STUDENT ROUTE SCREEN (details -> route options)");

    const sandbox = createSandbox({
        localStorage: {
            selectedPassType: "Student Pass",
            loggedInUser: JSON.stringify({ id: 7 }),
            studentDetails: JSON.stringify({
                state: "Andhra Pradesh", district: "Kakinada", city: "Pithapuram"
            })
        }
    });
    loadLocationData(sandbox);
    loadFile(sandbox, FILES.studentRoute);

    const fromStop = sandbox.document.getElementById("fromStop");
    const toStop = sandbox.document.getElementById("toStop");

    assertEqual("from stops = user city bus stations",
        optionValues(fromStop),
        [
            "", "Pithapuram Bus Station", "Pithapuram RTC Complex",
            "Pithapuram Bus Stand", "Pithapuram Railway Station",
            "Pithapuram Main Road"
        ]);
    assertEqual("default from = user city bus station",
        fromStop.value, "Pithapuram Bus Station");
    assertEqual("default to = first district destination",
        toStop.value, "Kakinada Bus Station");
    check("to stops are district destinations (not from town)",
        !optionValues(toStop).some(v => v.indexOf("Pithapuram") === 0) &&
        optionValues(toStop).includes("Kakinada Bus Station") &&
        optionValues(toStop).includes("Gollaprolu Bus Station"));
    check("no popup when details exist",
        sandbox.__popups.length === 0, JSON.stringify(sandbox.__popups));
    assertEqual("header shows pass type",
        sandbox.document.querySelector(".header-content h2").textContent, "Student Pass");
    assertEqual("card title = college route",
        sandbox.document.querySelector(".route-card h3").textContent,
        "College Route Selection");
    const labels = sandbox.document.querySelectorAll(".field label");
    assertEqual("labels updated for student",
        [labels[0].textContent, labels[1].textContent],
        ["From Home Stop", "To College Stop"]);

    // Next without bus type -> Route Missing, no fetch

    await sandbox.goNext();
    assertEqual("route missing popup",
        sandbox.__popups.map(p => p.title), ["Route Missing"]);
    check("no fetch when bus missing", sandbox.__fetchCalls.length === 0);

    // With bus selected but To Stop cleared -> Route Missing again,
    // still no fetch (from/to can no longer be equal by design).

    sandbox.__radios["Ordinary"].checked = true;
    toStop.value = "";
    await sandbox.goNext();
    assertEqual("route missing when to stop empty",
        sandbox.__popups.map(p => p.title), ["Route Missing", "Route Missing"]);
    check("no fetch when to stop empty", sandbox.__fetchCalls.length === 0);

    // Valid route -> saved + API + redirect

    toStop.value = "Kakinada Bus Station";
    await sandbox.goNext();

    check("route API called once",
        sandbox.__fetchCalls.length === 1 &&
        sandbox.__fetchCalls[0].url.includes("/api/routes"));
    const body = JSON.parse(sandbox.__fetchCalls[0].init.body);
    assertEqual("API carries userId + route + busType",
        [body.userId, body.passType, body.fromStop, body.toStop, body.busType],
        [7, "Student Pass", "Pithapuram Bus Station", "Kakinada Bus Station", "Ordinary"]);
    const savedRoute = JSON.parse(sandbox.__store.get("studentRoute") || "{}");
    assertEqual("studentRoute saved",
        [savedRoute.fromStop, savedRoute.toStop, savedRoute.busType],
        ["Pithapuram Bus Station", "Kakinada Bus Station", "Ordinary"]);
    assertEqual("applicationId stored",
        sandbox.__store.get("applicationId"), "APP-1");
    assertEqual("redirects to plan screen",
        sandbox.window.location.href, "student-plan.html");

}


// ==========================================
// TEST GROUP 10: route restore + missing details
// ==========================================

async function testRouteRestoreAndGuard() {

    section("12. ROUTE RESTORE + MISSING DETAILS GUARD");

    // a) Saved route valid aithe restore avutundi

    const sandbox = createSandbox({
        localStorage: {
            selectedPassType: "Student Pass",
            studentDetails: JSON.stringify({
                state: "Andhra Pradesh", district: "Kakinada", city: "Kakinada"
            }),
            studentRoute: JSON.stringify({
                fromStop: "Kakinada Bus Stand", toStop: "Pithapuram Bus Station", busType: "Express"
            })
        }
    });
    loadLocationData(sandbox);
    loadFile(sandbox, FILES.studentRoute);

    assertEqual("saved route restored",
        [
            sandbox.document.getElementById("fromStop").value,
            sandbox.document.getElementById("toStop").value
        ],
        ["Kakinada Bus Stand", "Pithapuram Bus Station"]);
    check("saved bus type restored",
        sandbox.__radios["Express"].checked === true);

    // b) Details levu -> popup + options empty

    const s2 = createSandbox({
        localStorage: { selectedPassType: "Student Pass" }
    });
    loadLocationData(s2);
    loadFile(s2, FILES.studentRoute);

    assertEqual("no stop options without details",
        optionValues(s2.document.getElementById("fromStop")), [""]);
    assertEqual("details missing popup",
        s2.__popups.map(p => [p.type, p.title]),
        [["error", "Details Missing"]]);

}

// ==========================================
// TEST GROUP 11: employee-route.js screen
// ==========================================

async function testEmployeeRouteScreen() {

    section("13. EMPLOYEE ROUTE SCREEN (details -> route options)");

    const sandbox = createSandbox({
        localStorage: {
            selectedPassType: "Employee Pass",
            loggedInUser: JSON.stringify({ id: 8 }),
            employeeDetails: JSON.stringify({
                state: "Andhra Pradesh", district: "Visakhapatnam", city: "Gajuwaka"
            })
        }
    });
    loadLocationData(sandbox);
    loadFile(sandbox, FILES.employeeRoute);

    const fromStop = sandbox.document.getElementById("fromStop");
    const toStop = sandbox.document.getElementById("toStop");

    assertEqual("from stops = employee city bus stations",
        optionValues(fromStop),
        [
            "", "Gajuwaka Bus Station", "Gajuwaka RTC Complex",
            "Gajuwaka Bus Stand", "Gajuwaka Railway Station",
            "Gajuwaka Main Road"
        ]);
    assertEqual("default from = employee city bus station",
        fromStop.value, "Gajuwaka Bus Station");
    assertEqual("default to = first district destination",
        toStop.value, "Visakhapatnam Bus Station");
    assertEqual("card title = office route",
        sandbox.document.querySelector(".route-card h3").textContent,
        "Office Route Selection");
    const labels = sandbox.document.querySelectorAll(".field label");
    assertEqual("labels updated for employee",
        [labels[0].textContent, labels[1].textContent],
        ["From Home Stop", "To Office Stop"]);

    // Valid route -> saved + API + redirect

    sandbox.__radios["Ordinary"].checked = true;
    await sandbox.goNext();

    check("route API called once",
        sandbox.__fetchCalls.length === 1 &&
        sandbox.__fetchCalls[0].url.includes("/api/routes"));
    const body = JSON.parse(sandbox.__fetchCalls[0].init.body);
    assertEqual("API carries userId + passType + route",
        [body.userId, body.passType, body.fromStop, body.toStop],
        [8, "Employee Pass", "Gajuwaka Bus Station", "Visakhapatnam Bus Station"]);
    const savedRoute = JSON.parse(sandbox.__store.get("employeeRoute") || "{}");
    assertEqual("employeeRoute saved",
        [savedRoute.fromStop, savedRoute.toStop],
        ["Gajuwaka Bus Station", "Visakhapatnam Bus Station"]);
    assertEqual("redirects to employee plan screen",
        sandbox.window.location.href, "employee-plan.html");

}


// ==========================================
// RUNNER
// ==========================================

async function main() {

    console.log("==============================================");
    console.log(" SMOKE TEST - Location Cascade + Route Stops");
    console.log("   run: node smoke-test.js   (Myproject/home)");
    console.log("==============================================");

    testDataStructure();
    testUniqueOptions();
    testFillSelect();
    testCascade();
    testCascadeEdgeCases();
    testRouteStopBuilder();
    testAllIndiaData();
    testRouteHelpers();
    await testStudentDetailsScreen();
    await testEmployeeDetailsScreen();
    await testStudentRouteScreen();
    await testRouteRestoreAndGuard();
    await testEmployeeRouteScreen();

    console.log("");
    console.log("==============================================");
    console.log(
        " RESULT: " + passed + " passed, " + failed +
        " failed  (total " + (passed + failed) + ")"
    );
    console.log("==============================================");

    if (failed > 0) {
        console.log("");
        console.log("Failed checks:");
        failures.forEach(name => console.log("  - " + name));
        process.exit(1);
    }

}

main().catch(error => {
    console.error("SMOKE TEST CRASHED:", error);
    process.exit(1);
});








