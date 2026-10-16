const T = require("./_e2e_lib.js");

(async () => {
  const su = await T.j("POST", "/signup", { fullname: "E2E User " + T.stamp, mobile: T.userMobile, email: T.email, password: "test1234" });
  T.check("signup", su.status === 200 && su.data.success, JSON.stringify(su.data));
  const lin = await T.j("POST", "/login", { identifier: su.data.student_id, password: "test1234" });
  const userId = lin.data.user && lin.data.user.id;
  T.check("login", lin.status === 200 && lin.data.success && userId, `userId=${userId}`);

  const sApp = await T.studentFlow(userId);
  await T.adminChecks(sApp, "A1 admin exact student data", ad => ad.fullName === T.studentDetails.fullName && ad.collegeName === T.studentDetails.collegeName && ad.studentIdNumber === T.studentDetails.aadhaar && ad.passType === "Student Pass");

  const eApp = await T.employeeFlow(userId);
  await T.adminChecks(eApp, "A1e admin exact employee data", ad => ad.fullName === T.employeeDetails.fullName && ad.organizationName === T.employeeDetails.collegeName && ad.employeeId === T.employeeDetails.aadhaar && !ad.collegeName && ad.passType === "Employee Pass");

  // Data isolation: user's history must only ever contain their own applications
  const h1 = await T.j("GET", `/api/history?userId=${userId}`);
  const foreign = (h1.data.history || []).filter(x => String(x.user_id) !== String(userId));
  T.check("isolation: history only own applications", h1.status === 200 && h1.data.success && foreign.length === 0, `count=${(h1.data.history || []).length}`);

  const passS = (h1.data.history || []).find(x => String(x.application_id) === String(sApp));
  T.check("user sees approved student pass", passS && passS.application_status === "approved" && passS.payment_status === "success", JSON.stringify(passS && { status: passS.application_status, pass: passS.pass_id, validTo: passS.valid_to, from: passS.from_stop, to: passS.to_stop, amount: passS.plan_amount, photo: passS.passport_photo ? "yes" : "no" }));
  const passE = (h1.data.history || []).find(x => String(x.application_id) === String(eApp));
  T.check("user sees approved employee pass", passE && passE.application_status === "approved", JSON.stringify(passE && { status: passE.application_status, pass: passE.pass_id }));

  console.log(T.log.join("\n"));
  console.log(T.getFailed() ? "E2E_FAILED" : "E2E_OK");
  console.log(JSON.stringify({ user: userId, studentApp: sApp, employeeApp: eApp }));
  process.exit(T.getFailed() ? 1 : 0);
})();