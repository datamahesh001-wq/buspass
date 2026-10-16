// TEMP: check pass applications in database
const mysql = require("mysql2");
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "mahesh@2006",
    database: "buspass_db"
});
db.query(
    `SELECT pa.id, pa.user_id, u.full_name, pt.pass_type_name, pa.application_status,
            pp.plan_name, pp.validity_days, r.from_stop, r.to_stop,
            pay.payment_status, pay.transaction_id, pay.amount
     FROM pass_applications pa
     JOIN pass_types pt ON pt.id = pa.pass_type_id
     JOIN users u ON u.id = pa.user_id
     LEFT JOIN pass_plans pp ON pp.id = pa.plan_id
     LEFT JOIN routes r ON r.id = pa.route_id
     LEFT JOIN payments pay ON pay.application_id = pa.id
     ORDER BY pa.id DESC LIMIT 10`,
    (err, rows) => {
        if (err) { console.log("DB ERROR:", err.message); process.exit(1); }
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    }
);