const mysql = require("mysql2");
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "mahesh@2006",
    database: "buspass_db"
});
function q(sql, label) {
    return new Promise(res => db.query(sql, (err, rows) => {
        if (err) { console.log(`[${label}] ERR:`, err.message); return res(); }
        console.log(`--- ${label}: ${rows.length} rows ---`);
        rows.slice(0, 20).forEach(r => console.log(JSON.stringify(r)));
        res();
    }));
}
(async () => {
    await q("SELECT * FROM routes ORDER BY id", "routes");
    await q("SELECT * FROM bus_stops ORDER BY id", "bus_stops");
    await q("SELECT * FROM admin_routes ORDER BY id", "admin_routes");
    await q("SELECT * FROM admin_bus_stops ORDER BY id", "admin_bus_stops");
    await q("SELECT * FROM pass_plans ORDER BY id", "pass_plans");
    await q("SELECT * FROM admin_plan_rates ORDER BY id", "admin_plan_rates");
    await q("SELECT * FROM admin_plan_bands ORDER BY id", "admin_plan_bands");
    await q("SELECT * FROM pass_types ORDER BY id", "pass_types");
    await q("SELECT * FROM bus_types ORDER BY id", "bus_types");
    await q("SELECT id, application_id, document_type, file_name, document_status FROM documents ORDER BY id", "documents");
    await q("SELECT id, application_id, transaction_id, amount, payment_status FROM payments ORDER BY id", "payments");
    await q("SELECT id, application_id, pass_id, holder_name, pass_status FROM bus_passes ORDER BY id", "bus_passes");
    process.exit(0);
})();