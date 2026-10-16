const mysql = require("mysql2");
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "mahesh@2006",
    database: "buspass_db"
});
db.query("SHOW TABLES", (err, tables) => {
    if (err) { console.log("ERR:", err.message); process.exit(1); }
    console.log("=== TABLES ===");
    tables.forEach(t => console.log(Object.values(t)[0]));
    process.exit(0);
});