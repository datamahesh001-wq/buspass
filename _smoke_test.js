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
  try { data = await res.json(); } catch (_) { data = null; }
  return { status: res.status, data };
}
(async () => {
  const r1 = await j("GET", "/api/admin/routes");
  check("GET /api/admin/routes", r1.status === 200 && r1.data.success && Array.isArray(r1.data.routes), `count=${r1.data.routes && r1.data.routes.length}`);

  const r2 = await j("GET", "/api/routes/available");
  check("GET /api/routes/available", r2.status === 200 && r2.data.success && Array.isArray(r2.data.routes), `count=${r2.data.routes && r2.data.routes.length}`);
  const yanam = r2.data.routes.find(route => route.from === "Yanam Bus Stop");
  check("available route distance", yanam && Number(yanam.distanceKm) === 27, JSON.stringify(yanam || {}));

  const r3 = await j("GET", "/api/plan-rates?passType=" + encodeURIComponent("Student Pass") + "&distanceKm=27");
  check("plan-rates default fallback", r3.status === 200 && r3.data.success && r3.data.plan.monthly > 0, JSON.stringify(r3.data.plan));

  const band = { planLabel: "0 - 30 KM", distanceMinKm: 0, distanceMaxKm: 30, monthly: 350, threeMonths: 900, halfYearly: 1700, yearly: 3200 };
  const r4 = await j("POST", "/api/admin/plan-rates", band);
  const bandId = r4.data && r4.data.id;
  check("POST /api/admin/plan-rates", r4.status === 200 && r4.data.success && bandId, `id=${bandId}`);

  const r5 = await j("GET", "/api/plan-rates?passType=" + encodeURIComponent("Student Pass") + "&distanceKm=27");
  check("plan-rates admin price", r5.status === 200 && r5.data.success && Number(r5.data.plan.monthly) === 350 && r5.data.plan.fromAdmin === true, JSON.stringify(r5.data.plan));

  const r6 = await j("GET", "/api/admin/plan-rates");
  check("GET /api/admin/plan-rates", r6.status === 200 && r6.data.success && Array.isArray(r6.data.plans) && r6.data.plans.length >= 1, `count=${r6.data.plans && r6.data.plans.length}`);

  const routeName = "TEST-RT-" + Date.now();
  const r7 = await j("POST", "/api/admin/routes", { routeCode: routeName, fromStop: "Test Junction", toStop: "Test City", distanceKm: 15, routeStatus: "published" });
  check("POST /api/admin/routes", r7.status === 200 && r7.data.success, JSON.stringify(r7.data));

  const r8 = await j("GET", "/api/routes/available");
  const found = r8.data.routes.find(route => route.from === "Test Junction" && route.to === "Test City");
  check("admin route reaches user", found && Number(found.distanceKm) === 15, JSON.stringify(found || {}));

  const r9 = await j("PUT", `/api/admin/routes/${found.id}`, { fromStop: "Test Junction", toStop: "Test City", distanceKm: 18, routeStatus: "published" });
  check("PUT /api/admin/routes", r9.status === 200 && r9.data.success, JSON.stringify(r9.data));
  const r9b = await j("GET", "/api/routes/available");
  const found2 = r9b.data.routes.find(route => route.id === found.id);
  check("admin distance change reaches user", found2 && Number(found2.distanceKm) === 18, JSON.stringify(found2 || {}));

  const r10 = await j("POST", "/api/admin/bus-stops", { name: "Test Bus Stop", location: "Test Road", routes: "RT-001" });
  const stopId = r10.data && r10.data.id;
  check("POST /api/admin/bus-stops", r10.status === 200 && r10.data.success && stopId, `id=${stopId}`);
  const r10b = await j("GET", "/api/bus-stops");
  check("GET /api/bus-stops public", r10b.status === 200 && r10b.data.success && r10b.data.stops.some(s => s.name === "Test Bus Stop"), JSON.stringify(r10b.data.stops));

  const r11 = await j("POST", "/api/applications/current", { userId: 4, passType: "Student Pass" });
  const appId = r11.data && r11.data.applicationId;
  check("POST /api/applications/current", r11.status === 200 && r11.data.success && appId, JSON.stringify(r11.data));

  const r12 = await j("POST", "/api/plans/select", { applicationId: appId, userId: 4, planName: "Monthly Pass", amount: 350, validityDays: 30 });
  check("plans/select amount persisted", r12.status === 200 && r12.data.success && Number(r12.data.plan.amount) === 350, JSON.stringify(r12.data));

  const r14 = await j("POST", "/api/payments", { applicationId: appId, userId: 4, amount: 350, paymentMethod: "UPI", planName: "Monthly Pass" });
  check("payment admin price accepted", r14.status === 200 && r14.data.success, JSON.stringify(r14.data));

  const r15 = await j("POST", "/api/payments", { applicationId: appId, userId: 4, amount: 400, paymentMethod: "UPI", planName: "Monthly Pass" });
  check("payment wrong amount rejected", r15.status === 400, JSON.stringify(r15.data));

  await j("DELETE", `/api/admin/routes/${found.id}`);
  await j("DELETE", `/api/admin/bus-stops/${stopId}`);
  await j("DELETE", `/api/admin/plan-rates/${bandId}`);
  await j("DELETE", `/api/applications/${appId}/reapply`);

  console.log(log.join("\n"));
  console.log(failed ? "SMOKE_TEST_FAILED" : "SMOKE_TEST_OK");
  process.exit(failed ? 1 : 0);
})();