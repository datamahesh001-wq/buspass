// =====================================
// PAYMENT METHOD SELECTION
// =====================================

document.addEventListener("DOMContentLoaded", function () {

    const selectedPassType = localStorage.getItem("selectedPassType");

    const isEmployee =
        selectedPassType === "Employee Pass";

    const planKey =
        isEmployee ? "employeePlan" : "studentPlan";

    const savedPlan =
        localStorage.getItem(planKey);

    const plan =
        savedPlan ? JSON.parse(savedPlan) : null;

    if (!plan) {
        return;
    }

    const amountValue =
        document.getElementById("amountValue");

    const passTypeValue =
        document.getElementById("passTypeValue");

    const validityValue =
        document.getElementById("validityValue");

    const validityByPlan = {

        "Monthly Pass":
            "Valid for 30 days from the date of issue",

        "3 Monthly":
            "Valid for 3 months from the date of issue",

        "Half-Yearly Pass":
            "Valid for 6 months from the date of issue",

        "Yearly Pass":
            "Valid for 12 months from the date of issue"
    };

    if (amountValue) {
        amountValue.textContent =
            "₹" + plan.price + "/-";
    }

    if (passTypeValue) {
        passTypeValue.textContent =
            plan.plan;
    }

    if (validityValue) {
        validityValue.textContent =
            validityByPlan[plan.plan] ||
            "Validity based on selected plan";
    }
});


// =====================================
// PAYMENT METHOD SELECTION
// =====================================

function selectPayment(radio) {

    const options =
        document.querySelectorAll(".payment-option");

    options.forEach(option => {
        option.classList.remove("selected");
    });

    if (radio && radio.parentElement) {
        radio.parentElement.classList.add("selected");
    }

    const value = radio.value;
    const app = document.querySelector(".app");
    if (app) {
        app.classList.toggle("expanded-payment-details", value === "Credit / Debit Card" || value === "Net Banking");
    }
    const state = BPApplication.state();
    BPApplication.update({ payment: { ...state.payment, method: value, amount: state.plan.amount || state.payment.amount || "" }, currentStep: "payment" });

    const upiFields =
        document.getElementById("upiFields");

    const cardFields =
        document.getElementById("cardFields");

    const netBankingFields =
        document.getElementById("netBankingFields");

    const title =
        document.getElementById("paymentPanelTitle");

    const badge =
        document.getElementById("paymentPanelBadge");


    if (upiFields) {
        upiFields.classList.add("hidden");
    }

    if (cardFields) {
        cardFields.classList.add("hidden");
    }

    if (netBankingFields) {
        netBankingFields.classList.add("hidden");
    }


    if (value === "UPI") {

        if (upiFields) {
            upiFields.classList.remove("hidden");
        }

        if (title) {
            title.textContent = "UPI Payment";
        }

        if (badge) {
            badge.textContent = "UPI";
        }

    }

    else if (value === "Credit / Debit Card") {

        if (cardFields) {
            cardFields.classList.remove("hidden");
        }

        if (title) {
            title.textContent = "Card Payment";
        }

        if (badge) {
            badge.textContent = "CARD";
        }

    }

    else if (value === "Net Banking") {

        if (netBankingFields) {
            netBankingFields.classList.remove("hidden");
        }

        if (title) {
            title.textContent = "Net Banking";
        }

        if (badge) {
            badge.textContent = "BANK";
        }
    }
}



// The latest Admin distance-band price is refreshed on entry and before payment.
// This prevents a cached plan amount from being charged after an Admin price edit.
let latestPaymentPriceRefresh = Promise.resolve();

async function refreshPaymentPriceFromDatabase() {
    const user = BPApplication.user();
    if (!user || !user.id) return null;
    const application = await BPApplication.current();
    if (!application || !application.application_id || !application.plan_name) return application || null;
    if (!["draft", "payment_pending"].includes(String(application.application_status || "").toLowerCase())) return application;

    const state = BPApplication.state();
    const distanceKm = Number(application.distance_km || state.route?.distanceKm || Number.parseFloat(state.route?.distance) || 0);
    if (!distanceKm) return application;

    const passType = application.pass_type_name || localStorage.getItem("selectedPassType") || "Student Pass";
    const rateResponse = await fetch(`http://localhost:5000/api/plan-rates?passType=${encodeURIComponent(passType)}&distanceKm=${encodeURIComponent(distanceKm)}`, { cache: "no-store" });
    const rateResult = await rateResponse.json();
    if (!rateResponse.ok || !rateResult.success || !rateResult.plan) throw new Error(rateResult.message || "Could not refresh the latest pass price.");

    const validityDays = Number(application.validity_days || state.plan?.validityDays || 30);
    const planName = String(application.plan_name || state.plan?.planName || "");
    const rateKey = validityDays >= 300 || /year|annual/i.test(planName) ? "yearly"
        : validityDays >= 150 || /half/i.test(planName) ? "halfYearly"
        : validityDays >= 75 || /3\s*month|quarter/i.test(planName) ? "threeMonths" : "monthly";
    const amount = Number(rateResult.plan[rateKey]);
    if (!Number.isFinite(amount) || amount < 0) throw new Error("The latest pass price is invalid.");

    const saveResponse = await fetch("http://localhost:5000/api/plans/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            applicationId: application.application_id,
            userId: user.id,
            planId: application.plan_id || state.plan?.planId || "",
            planName,
            amount,
            validityDays
        })
    });
    const saveResult = await saveResponse.json().catch(() => ({ success: false, message: "Could not update the selected price." }));
    if (!saveResponse.ok || !saveResult.success) throw new Error(saveResult.message || "Could not update the selected price.");

    const key = passType === "Employee Pass" ? "employeePlan" : "studentPlan";
    const previousPlan = getSelectedPlan() || {};
    const updatedPlan = { ...previousPlan, plan: planName, planName, price: amount, amount, passType, planId: application.plan_id || previousPlan.planId || "", validityDays };
    localStorage.setItem(key, JSON.stringify(updatedPlan));
    BPApplication.update({
        plan: { ...(state.plan || {}), planId: updatedPlan.planId, planName, amount, validity: `${validityDays} days`, validityDays },
        payment: { ...(state.payment || {}), amount },
        currentStep: "payment"
    });
    const amountElement = document.getElementById("amountValue");
    const planElement = document.getElementById("passTypeValue");
    if (amountElement) amountElement.textContent = `₹${amount.toLocaleString("en-IN")}/-`;
    if (planElement) planElement.textContent = planName;
    return { ...application, amount, plan_name: planName, validity_days: validityDays, plan_id: application.plan_id };
}

// Refresh as soon as the payment screen is opened.
document.addEventListener("DOMContentLoaded", function () {
    latestPaymentPriceRefresh = refreshPaymentPriceFromDatabase().catch(error => {
        console.warn("Could not refresh Admin price on payment screen:", error.message);
        return null;
    });
});

// =====================================
// VALIDATE PAYMENT METHOD
// =====================================

function validateSelectedMethod() {

    const selected =
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        )?.value;


    // -----------------------------
    // UPI
    // -----------------------------

    if (selected === "UPI") {

        const upi =
            document
                .getElementById("upiId")
                ?.value
                .trim();

        if (!upi || !upi.includes("@")) {

            return "Please enter a valid UPI ID.";
        }
    }


    // -----------------------------
    // CARD
    // -----------------------------

    if (selected === "Credit / Debit Card") {

        const number =
            document
                .getElementById("cardNumber")
                ?.value
                .replace(/\s/g, "");

        const holder =
            document
                .getElementById("cardHolder")
                ?.value
                .trim();

        const expiry =
            document
                .getElementById("cardExpiry")
                ?.value
                .trim();

        const cvv =
            document
                .getElementById("cardCvv")
                ?.value
                .trim();


        if (!/^\d{12,19}$/.test(number)) {

            return "Please enter a valid card number.";
        }


        if (!holder) {

            return "Please enter the card holder name.";
        }


        // Correct MM/YY validation
        if (!/^\d{2}\/\d{2}$/.test(expiry)) {

            return "Please enter expiry date in MM/YY format.";
        }


        if (!/^\d{3,4}$/.test(cvv)) {

            return "Please enter a valid CVV.";
        }
    }


    // -----------------------------
    // NET BANKING
    // -----------------------------

    if (selected === "Net Banking") {

        const bank =
            document
                .getElementById("bankName")
                ?.value;

        const userId =
            document
                .getElementById("bankUserId")
                ?.value
                .trim();


        if (!bank) {

            return "Please select your bank.";
        }


        if (!userId) {

            return "Please enter your bank customer/user ID.";
        }
    }


    return "";
}


// =====================================
// CARD NUMBER + EXPIRY FORMAT
// =====================================

document.addEventListener("DOMContentLoaded", function () {

    const cardNumber =
        document.getElementById("cardNumber");

    const expiry =
        document.getElementById("cardExpiry");


    // Card number formatting
    if (cardNumber) {

        cardNumber.addEventListener("input", function () {

            const digits =
                cardNumber.value
                    .replace(/\D/g, "")
                    .slice(0, 19);

            cardNumber.value =
                digits
                    .replace(/(.{4})/g, "$1 ")
                    .trim();
        });
    }


    // Expiry formatting
    if (expiry) {

        expiry.addEventListener("input", function () {

            const digits =
                expiry.value
                    .replace(/\D/g, "")
                    .slice(0, 4);

            expiry.value =
                digits.length > 2
                    ? digits.slice(0, 2) +
                      "/" +
                      digits.slice(2)
                    : digits;
        });
    }


    // Default payment method
    const defaultPayment =
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        );

    if (defaultPayment) {
        selectPayment(defaultPayment);
    }
});


// =====================================
// BACK BUTTON
// =====================================

function goBack() {

    if (
        localStorage.getItem("renewalMode") === "true"
    ) {

        window.location.href =
            "renew-pass.html";

        return;
    }


    window.location.href =
        "student-plan.html";
}


// =====================================
// GET CURRENT APPLICATION ID
// =====================================
//
// Different application screens may save the ID
// using different storage keys.
//
// We check the existing possible keys without
// changing the application flow.
//

function getApplicationId() {

    const possibleKeys = [

        "applicationId",

        "selectedApplicationId",

        "currentApplicationId",

        "lastApplicationId",

        "activeApplicationId",

        "createdApplicationId"
    ];


    for (const key of possibleKeys) {

        const value =
            localStorage.getItem(key);

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        ) {

            return String(value).trim();
        }
    }


    return null;
}


// =====================================
// GET SELECTED PLAN
// =====================================

function getSelectedPlan() {

    const selectedPassType =
        localStorage.getItem("selectedPassType");


    const isEmployee =
        selectedPassType === "Employee Pass";


    const planKey =
        isEmployee
            ? "employeePlan"
            : "studentPlan";


    const savedPlan =
        localStorage.getItem(planKey);


    if (!savedPlan) {
        return null;
    }


    try {

        return JSON.parse(savedPlan);

    } catch (error) {

        console.error(
            "Invalid saved plan:",
            error
        );

        return null;
    }
}


// =====================================
// PAY NOW
// =====================================

async function makePayment() {

    try {
        latestPaymentPriceRefresh = refreshPaymentPriceFromDatabase();
        await latestPaymentPriceRefresh;
    } catch (error) {
        showPopup("error", "Price Update Failed", error.message || "Could not refresh the latest pass price.");
        return;
    }

    // ---------------------------------
    // Check payment method
    // ---------------------------------

    const selectedPayment =
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        );


    if (!selectedPayment) {

        showPopup(
            "error",
            "Payment Method",
            "Please select a payment method."
        );

        return;
    }


    const paymentMethod =
        selectedPayment.value;


    // ---------------------------------
    // Validate payment details
    // ---------------------------------

    const validationError =
        validateSelectedMethod();


    if (validationError) {

        showPopup(
            "error",
            "Payment Details",
            validationError
        );

        return;
    }


    // ---------------------------------
    // Get selected plan
    // ---------------------------------

    let plan =
        getSelectedPlan();


    // ---------------------------------
    // Get application ID
    // ---------------------------------

    let applicationId = BPApplication.id() || getApplicationId();
    try {
        const application = await BPApplication.current();
        if (application) {
            applicationId = String(application.application_id);
            if (application.plan_name) {
                plan = { ...(getSelectedPlan() || {}), plan: application.plan_name, planName: application.plan_name, price: application.amount, passType: application.pass_type_name, planId: application.plan_id || "", validityDays: application.validity_days };
                localStorage.setItem(application.pass_type_name === "Employee Pass" ? "employeePlan" : "studentPlan", JSON.stringify(plan));
            }
        }
    } catch (error) {
        showPopup("error", "Application Unavailable", error.message);
        return;
    }


    console.log(
        "Payment Debug:",
        {
            applicationId: applicationId,
            plan: plan,
            paymentMethod: paymentMethod
        }
    );


    // ---------------------------------
    // IMPORTANT APPLICATION CHECK
    // ---------------------------------

    if (!plan) {

        showPopup(
            "error",
            "Incomplete Application",
            "Please complete the application steps first."
        );

        return;
    }


    if (!applicationId) {

        console.error(
            "Application ID is missing from localStorage."
        );

        showPopup(
            "error",
            "Incomplete Application",
            "Application details could not be found. Please complete the application steps again."
        );

        return;
    }


    // ---------------------------------
    // Save payment method
    // ---------------------------------

    localStorage.setItem(
        "paymentMethod",
        paymentMethod
    );


    // ---------------------------------
    // Confirm payment
    // ---------------------------------

    showConfirm(

        "Confirm Payment",

        "Proceed with payment using " +
        paymentMethod +
        "?",

        async function () {
            const user = BPApplication.user();
            if (!user || !user.id) {
                showPopup("error", "Login Required", "Please log in to complete the payment.");
                return;
            }

            const amountValue = String(plan.price || "0").replace(/[₹,\s]/g, "");
            const paymentPayload = {
                applicationId,
                userId: user.id,
                amount: Number(amountValue || 0),
                paymentMethod,
                planName: plan.plan || plan.planName || ""
            };

            try {
                const response = await fetch("http://localhost:5000/api/payments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(paymentPayload)
                });
                const result = await response.json().catch(() => ({ success: false, message: "Could not complete payment." }));
                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Could not complete payment.");
                }

                const transactionId = result.transactionId || `TXN-${Date.now()}`;
                BPApplication.update({
                    payment: { method: paymentMethod, amount: Number(amountValue || plan.price || 0), transactionId, status: "Success" },
                    currentStep: "payment-success", status: "Payment Successful"
                });
                localStorage.setItem("transactionId", transactionId);
                localStorage.setItem("paymentMethod", paymentMethod);
                window.location.href = "../payment-success.html";
            } catch (error) {
                showPopup("error", "Payment Failed", error.message);
            }
        }
    );
}
