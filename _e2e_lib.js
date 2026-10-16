const BASE = "http://localhost:5000";
const log = [];
let failed = false;
function check(name, ok, detail) {
  log.push(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail || ""}`);
  if (!ok) failed = true;
}
async function j(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch (_) { data = text; }
  return { status: res.status, data };
}
const stamp = Date.now().toString().slice(-8);
const userMobile = "9" + stamp + "0";
const email = `e2e-${stamp}@test.com`;
const mk = (name, dob, idNo, org) => ({
  fullName: name, dob, gender: "Male", mobile: userMobile, email, aadhaar: idNo,
  collegeName: org, classCourse: "B.Sc", academicYear: "2024-25",
  fatherName: "E2E F", motherName: "E2E M", contactNumber: userMobile,
  city: "Kakinada", district: "Kakinada", state: "Andhra Pradesh", pinCode: "533001",
  permanentAddress: "Test Address, Kakinada"
});
const studentDetails = mk("E2E Student " + stamp, "2005-04-12", "123456789012", "E2E Test College");
const employeeDetails = mk("E2E Employee " + stamp, "1990-08-15", "EMP987654", "E2E Tech Pvt Ltd");

async function studentFlow(userId) {
  log.push("----- STUDENT FLOW -----");
  const app = await j("POST", "/api/applications/current", { userId, passType: "Student Pass" });
  const appId = app.data && app.data.applicationId;
  check("S1 start application", app.status === 200 && app.data.success && appId, `appId=${appId}`);
  const det = await j("POST", "/api/details", { userId, applicationId: appId, passType: "Student Pass", details: studentDetails });
  check("S2 save details", det.status === 200 && det.data.success, JSON.stringify(det.data));
  for (const t of ["passport_photo", "student_id", "aadhaar", "address_proof"]) {
    const rr = await j("POST", "/api/documents", { applicationId: appId, userId, documentType: t, fileName: `${t}.jpg`, previewData: "data:image/jpeg;base64,e2e" });
    check(`S3 upload ${t}`, rr.status === 200 && rr.data.success);
  }
  const rt = await j("POST", "/api/routes", { userId, passType: "Student Pass", fromStop: "Yanam Bus Stop", toStop: "Kakinada Complex", busType: "Ordinary", applicationId: appId });
  check("S4 save route (reuse RT-001)", rt.status === 200 && rt.data.success, JSON.stringify(rt.data));
  const rd = await j("GET", `/api/applications/${appId}/data?userId=${userId}`);
  check("S5 route distance from DB", rd.data.application && Number(rd.data.application.distance_km) === 27, `distance=${rd.data.application && rd.data.application.distance_km}`);
  const plans = await j("GET", "/api/plans?passType=" + encodeURIComponent("Student Pass"));
  const mp = plans.data.plans.find(p => p.plan_name === "Monthly Pass");
  check("S6 plans list", plans.status === 200 && mp, JSON.stringify(mp || {}));
  const ps = await j("POST", "/api/plans/select", { applicationId: appId, userId, planId: mp.id, planName: mp.plan_name, amount: Number(mp.amount), validityDays: 30 });
  check("S7 select plan", ps.status === 200 && ps.data.success, JSON.stringify(ps.data.plan));
  const py = await j("POST", "/api/payments", { applicationId: appId, userId, amount: Number(mp.amount), paymentMethod: "UPI", planName: mp.plan_name });
  check("S8 payment", py.status === 200 && py.data.success, JSON.stringify(py.data));
  return appId;
}

async function employeeFlow(userId) {
  log.push("----- EMPLOYEE FLOW -----");
  const app = await j("POST", "/api/applications/current", { userId, passType: "Employee Pass" });
  const appId = app.data && app.data.applicationId;
  check("E1 start application", app.status === 200 && app.data.success && appId, `appId=${appId}`);
  const det = await j("POST", "/api/details", { userId, applicationId: appId, passType: "Employee Pass", details: employeeDetails });
  check("E2 save employee details", det.status === 200 && det.data.success, JSON.stringify(det.data));
  for (const t of ["passport_photo", "employee_id", "company_proof", "employment_proof"]) {
    const rr = await j("POST", "/api/documents", { applicationId: appId, userId, documentType: t, fileName: `${t}.jpg`, previewData: "data:image/jpeg;base64,e2e" });
    check(`E3 upload ${t}`, rr.status === 200 && rr.data.success);
  }
  const rt = await j("POST", "/api/routes", { userId, passType: "Employee Pass", fromStop: "Yanam Bus Stop", toStop: "Kakinada Complex", busType: "Express", applicationId: appId });
  check("E4 save route", rt.status === 200 && rt.data.success, JSON.stringify(rt.data));
  const plans = await j("GET", "/api/plans?passType=" + encodeURIComponent("Employee Pass"));
  const qp = plans.data.plans.find(p => p.plan_name === "Quarterly Pass");
  check("E6 employee plans", plans.status === 200 && qp, JSON.stringify(qp || {}));
  const ps = await j("POST", "/api/plans/select", { applicationId: appId, userId, planId: qp.id, planName: qp.plan_name, amount: Number(qp.amount), validityDays: 90 });
  check("E7 select plan", ps.status === 200 && ps.data.success, JSON.stringify(ps.data.plan));
  const py = await j("POST", "/api/payments", { applicationId: appId, userId, amount: Number(qp.amount), paymentMethod: "Net Banking", planName: qp.plan_name });
  check("E8 payment", py.status === 200 && py.data.success, JSON.stringify(py.data));
  return appId;
}

async function adminChecks(appId, label, match) {
  const detail = await j("GET", `/api/admin/applications/${appId}`);
  const ad = detail.data && detail.data.application;
  check(label, ad && match(ad), JSON.stringify(ad && { name: ad.fullName, org: ad.organizationName, college: ad.collegeName, empId: ad.employeeId, aadhaar: ad.studentIdNumber, distance: ad.distance, planAmount: ad.planAmount, docs: detail.data.documents.length, passType: ad.passType }));
  const dec = await j("POST", `/api/admin/applications/${appId}/status`, { status: "approved" });
  check("A2 admin approves", dec.status === 200 && dec.data.success, JSON.stringify(dec.data));
  const detail2 = await j("GET", `/api/admin/applications/${appId}`);
  check("A3 admin sees issued pass", detail2.status === 200 && detail2.data && detail2.data.success && detail2.data.application && detail2.data.application.passId, `status=${detail2.status} body=${JSON.stringify(detail2.data).slice(0, 300)}`);
  return detail2.data && detail2.data.application;
}

module.exports = { j, check, studentFlow, employeeFlow, adminChecks, studentDetails, employeeDetails, userMobile, email, stamp, log, getFailed: () => failed, markFailed: () => { failed = true; } };