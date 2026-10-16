const BASE = "http://localhost:5000";
(async () => {
  const tests = [
    "GET /api/admin/routes",
    "GET /api/routes/available",
    "GET /api/admin/bus-stops",
    "GET /api/bus-stops",
    "GET /api/admin/plan-rates",
    "GET /api/plan-rates?passType=Student%20Pass&distanceKm=27"
  ];
  for (const t of tests) {
    const method = t.split(" ")[0];
    const url = t.split(" ")[1];
    try {
      const res = await fetch(BASE + url, { method });
      const text = await res.text();
      console.log(`\n=== ${t} -> ${res.status} ===`);
      console.log(text.slice(0, 1200));
    } catch (e) {
      console.log(`\n=== ${t} -> EXCEPTION: ${e.message} ===`);
    }
  }
})();