AP BUS PASS MANAGEMENT SYSTEM - RUN GUIDE

1. Open the AP_BusPass_PROFILE_ROUTE_FIXED folder in VS Code.
2. Make sure MySQL Server is running.
3. Make sure the MySQL database is named: buspass_db
4. The current default database connection is:
   Host: localhost
   User: root
   Password: mahesh@2006
   Database: buspass_db
   You can override these values with DB_HOST, DB_USER, DB_PASSWORD and DB_NAME in a .env file.
5. If the database has not been created yet, open MySQL Workbench and run:
   home/database.sql
   NOTE: that SQL recreates the database, so do not run it if you need to preserve existing data.
6. Double-click run-project.bat.
7. The backend starts at http://localhost:5000 and the login page opens automatically.
8. To check server + MySQL status, open:
   http://localhost:5000/api/health
   A successful response contains: "server": true and "database": true.
9. Keep the backend command window open while demonstrating the project.

IMPORTANT:
- The frontend is now served by the Express backend, so there is no need to open login.html with file://.
- If /api/health reports database:false, start MySQL and verify the buspass_db database and credentials.
