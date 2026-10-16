const mysql = require("mysql2");
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "mahesh@2006",
    database: "buspass_db"
});
const table = process.argv[2] || "routes";
db.query(`DESCRIBE \`${table}\``, (err, cols) => {
    if (err) { console.log("ERR:", err.message); process.exit(1); }
    console.log(`=== DESCRIBE ${table} ===`);
    cols.forEach(c => console.log(`${c.Field} | ${c.Type} | null=${c.Null} | key=${c.Key} | default=${c.Default} | extra=${c.Extra}`));
    process.exit(0);
});