const BPApplication = {
    key: "busPassApplication",
    empty(passType = "") {
        return {
            applicationId: "",
            passType,
            currentStep: "pass-type",
            studentDetails: {},
            employeeDetails: {},
            documents: {},
            route: { fromStop: "", toStop: "", busType: "", distance: "", distanceKm: 0, routeId: "" },
            plan: { planId: "", planName: "", amount: "", validity: "" },
            payment: { method: "", amount: "", transactionId: "", status: "" },
            status: "Draft"
        };
    },
    load() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.key) || "null");
            if (!saved || !saved.applicationId) return null;
            return {
                ...this.empty(saved.passType),
                ...saved,
                studentDetails: saved.studentDetails || {},
                employeeDetails: saved.employeeDetails || {},
                documents: saved.documents || {},
                route: { ...this.empty().route, ...(saved.route || {}) },
                plan: { ...this.empty().plan, ...(saved.plan || {}) },
                payment: { ...this.empty().payment, ...(saved.payment || {}) }
            };
        } catch { return null; }
    },
    save(state) {
        localStorage.setItem(this.key, JSON.stringify(state));
        if (state.applicationId) localStorage.setItem("applicationId", String(state.applicationId));
        if (state.passType) localStorage.setItem("selectedPassType", state.passType);
        return state;
    },
    clearApplicationCache() {
        const keys = [
            this.key,
            "applicationId",
            "studentDetails",
            "employeeDetails",
            "studentRoute",
            "employeeRoute",
            "studentPlan",
            "employeePlan",
            "transactionId",
            "paymentMethod",
            "selectedApplicationId",
            "passportPhoto"
        ];
        keys.forEach(key => localStorage.removeItem(key));

        // Remove old document names/previews so a fresh application starts empty.
        ["student", "employee"].forEach(type => {
            [
                "photo",
                "student ID",
                "employee ID",
                "Aadhaar card",
                "company proof",
                "employment proof",
                "Address proof"
            ].forEach(name => {
                const base = `bp_document_${type}_${name}`;
                localStorage.removeItem(base);
                localStorage.removeItem(`${base}_verified`);
                localStorage.removeItem(`${base}_preview`);
            });
        });
    },
    async startNew(passType) {
        const user = this.user();
        if (!user || !user.id) throw new Error("Please log in to continue.");

        const response = await fetch("http://localhost:5000/api/applications/current", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, passType })
        });

        const data = await response.json().catch(() => ({ success: false, message: "Could not start application." }));
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Could not start application.");
        }

        // Every new application gets a clean client-side session. Previous
        // application/profile values must never pre-fill the new form.
        this.clearApplicationCache();

        const state = this.empty(passType);
        state.applicationId = data.applicationId;
        state.passType = data.passType || passType;
        state.status = "Draft";
        this.save(state);
        localStorage.setItem("selectedPassType", state.passType);
        return state;
    },
    clearAll() {
        localStorage.removeItem(this.key);
        localStorage.removeItem("applicationId");
        localStorage.removeItem("selectedPassType");
        localStorage.removeItem("studentDetails");
        localStorage.removeItem("employeeDetails");
        localStorage.removeItem("studentRoute");
        localStorage.removeItem("employeeRoute");
        localStorage.removeItem("studentPlan");
        localStorage.removeItem("employeePlan");
        localStorage.removeItem("transactionId");
        localStorage.removeItem("paymentMethod");
        return this;
    },
    state() { return this.load() || this.empty(localStorage.getItem("selectedPassType") || ""); },
    update(changes) { return this.save({ ...this.state(), ...changes }); },
    setStep(currentStep, status) { return this.update({ currentStep, ...(status ? { status } : {}) }); },
    id() { return this.load()?.applicationId || localStorage.getItem("applicationId") || ""; },
    user() { try { return JSON.parse(localStorage.getItem("loggedInUser") || "null"); } catch { return null; } },
    async current() {
        const saved = this.load();
        const user = this.user();
        const appId = saved?.applicationId || localStorage.getItem("applicationId");
        if (!user || !user.id) return saved;

        const params = new URLSearchParams({ userId: String(user.id) });
        if (appId) params.set("applicationId", String(appId));

        const response = await fetch(`http://localhost:5000/api/applications/current?${params.toString()}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({ success: false, application: null }));
        if (!response.ok || !data.success || !data.application) return saved;

        const cachedRoute = saved?.route || {};
        const routeWasRemoved = !data.application.route_id && Boolean(cachedRoute.fromStop || cachedRoute.toStop);
        const next = {
            ...this.empty(data.application.pass_type_name || saved?.passType || ""),
            ...(saved || {}),
            applicationId: data.application.application_id || appId || saved?.applicationId || "",
            passType: data.application.pass_type_name || saved?.passType || "",
            route: routeWasRemoved ? this.empty().route : {
                ...this.empty().route,
                ...cachedRoute,
                fromStop: data.application.from_stop || cachedRoute.fromStop || "",
                toStop: data.application.to_stop || cachedRoute.toStop || "",
                busType: data.application.bus_type_name || cachedRoute.busType || "",
                distance: data.application.distance_km ? `${data.application.distance_km} KM` : cachedRoute.distance || "",
                distanceKm: Number(data.application.distance_km || cachedRoute.distanceKm || 0)
            },
            plan: { ...this.empty().plan, ...(saved?.plan || {}), planName: data.application.plan_name || saved?.plan?.planName || "", amount: data.application.amount || saved?.plan?.amount || "", validity: data.application.validity_days ? `${data.application.validity_days} days` : saved?.plan?.validity || "" },
            status: data.application.application_status || saved?.status || "Draft"
        };

        this.save(next);
        if (routeWasRemoved) {
            localStorage.removeItem("studentRoute");
            localStorage.removeItem("employeeRoute");
        }
        localStorage.setItem("applicationId", String(next.applicationId));
        // Keep the raw database fields used by plan/payment screens while also
        // returning the normalized route/plan state used by route restoration.
        return { ...data.application, ...next };
    },
    async data() {
        const state = this.load();
        const user = this.user();
        const applicationId = state?.applicationId || localStorage.getItem("applicationId");
        if (!user || !user.id || !applicationId) {
            return state ? { application: state, details: state.passType === "Employee Pass" ? state.employeeDetails : state.studentDetails, documents: Object.values(state.documents || {}) } : null;
        }

        const response = await fetch(`http://localhost:5000/api/applications/${encodeURIComponent(applicationId)}/data?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({ success: false, details: null, documents: [] }));
        if (!response.ok || !data.success) {
            return state ? { application: state, details: state.passType === "Employee Pass" ? state.employeeDetails : state.studentDetails, documents: Object.values(state.documents || {}) } : null;
        }

        const details = data.details || {};
        const mapped = {
            fullName: details.full_name || details.fullName || "",
            date_of_birth: details.date_of_birth || details.dateOfBirth || "",
            dob: details.date_of_birth || details.dateOfBirth || "",
            gender: details.gender || "",
            mobile: details.mobile || "",
            email: details.email || "",
            aadhaar: details.id_number || details.aadhaar_number || "",
            collegeName: details.college_name || details.collegeName || "",
            classCourse: details.class_course || details.classCourse || "",
            academicYear: details.academic_year || details.academicYear || "",
            fatherName: details.father_name || details.fatherName || "",
            motherName: details.mother_name || details.motherName || "",
            contactNumber: details.contact_number || details.contactNumber || "",
            city: details.city || "",
            district: details.district || "",
            state: details.state || "",
            pinCode: details.pin_code || details.pinCode || "",
            permanentAddress: details.permanent_address || details.permanentAddress || "",
            organization: details.organization_name || details.organization || "",
            employeeId: details.employee_id || details.employeeId || "",
            department: details.department || "",
            designation: details.designation || "",
            address: details.permanent_address || details.permanentAddress || ""
        };

        return { application: data.application || state, details: mapped, documents: data.documents || [] };
    }
};
