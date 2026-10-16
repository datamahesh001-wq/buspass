#!/usr/bin/env node
"use strict";

// Integration regression for route saves. It clones only table definitions
// into a uniquely named disposable schema and inserts synthetic test users.
// The project's normal `npm start` command and real route pages are exercised.

require("dotenv").config();
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");

const projectRoot = path.resolve(__dirname, "..");
const liveDbName = process.env.DB_NAME || "buspass_db";
const schemaName = `buspass_route_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const password = "RouteTestPass!2026";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const chromeProfile = path.join(os.tmpdir(), `buspass-route-chrome-${Date.now()}`);
const connection = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "mahesh@2006",
    database: liveDbName
});

const query = (sql, values = []) => new Promise((resolve, reject) =>
    connection.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const quote = name => `\`${name.replace(/`/g, "``")}\``;

function stopTree(child) {
    if (!child || child.exitCode !== null) return Promise.resolve();
    if (process.platform === "win32" && child.pid) {
        const result = spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
        if (result.status === 0) return Promise.resolve();
    }
    child.kill("SIGTERM");
    return Promise.race([new Promise(resolve => child.once("exit", resolve)), delay(4000)]);
}

async function waitFor(url, predicate, message, child, readOutput) {
    for (let attempt = 0; attempt < 80; attempt++) {
        if (child && child.exitCode !== null) throw new Error(`${message}: process exited. ${readOutput?.() || ""}`);
        try {
            const response = await fetch(url);
            const value = await response.json().catch(() => null);
            if (predicate(response, value)) return value;
        } catch {}
        await delay(250);
    }
    throw new Error(`${message}: timed out. ${readOutput?.() || ""}`);
}

function startProject() {
    const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    let output = "";
    const child = spawn(process.execPath, [npmCli, "start"], {
        cwd: projectRoot,
        env: { ...process.env, DB_NAME: schemaName },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.on("data", chunk => { output += chunk.toString(); });
    child.stderr.on("data", chunk => { output += chunk.toString(); });
    return { child, readOutput: () => output };
}

async function startAndWaitProject() {
    const project = startProject();
    await waitFor("http://localhost:5000/api/health", (response, body) => response.ok && body?.database === true,
        "project startup", project.child, project.readOutput);
    return project;
}

async function requestRoute(payload) {
    const response = await fetch("http://localhost:5000/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    return { status: response.status, body: await response.json() };
}

class DevTools {
    constructor(socket) {
        this.socket = socket;
        this.nextId = 1;
        this.pending = new Map();
        this.events = [];
        socket.addEventListener("message", event => {
            const message = JSON.parse(event.data);
            if (!message.id) {
                if (["Runtime.exceptionThrown", "Network.loadingFailed", "Network.responseReceived"].includes(message.method)) this.events.push(message);
                return;
            }
            const waiter = this.pending.get(message.id);
            if (!waiter) return;
            this.pending.delete(message.id);
            if (message.error) waiter.reject(new Error(message.error.message));
            else waiter.resolve(message.result);
        });
    }
    static async connect(url) {
        const socket = new WebSocket(url);
        await new Promise((resolve, reject) => {
            socket.addEventListener("open", resolve, { once: true });
            socket.addEventListener("error", reject, { once: true });
        });
        return new DevTools(socket);
    }
    send(method, params = {}) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }
    async evaluate(expression) {
        const result = await this.send("Runtime.evaluate", {
            expression, awaitPromise: true, returnByValue: true, userGesture: true
        });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
        return result.result?.value;
    }
    close() { this.socket.close(); }
}

async function navigate(devtools, url) {
    await devtools.send("Page.navigate", { url });
    await waitFor("http://127.0.0.1:5000/api/health", response => response.ok,
        "project remains available");
    for (let attempt = 0; attempt < 80; attempt++) {
        const pageState = await devtools.evaluate("({url:location.href,ready:document.readyState})");
        if ((pageState.url === url || pageState.url.startsWith(url + "#")) && pageState.ready === "complete") return;
        await delay(125);
    }
    throw new Error(`Browser did not navigate to ${url}`);
}

async function login(devtools, email) {
    await navigate(devtools, "http://localhost:5000/login.html");
    await waitFor("http://localhost:5000/api/health", response => response.ok, "login page availability");
    await devtools.evaluate("localStorage.clear()");
    const loadedScripts = await devtools.evaluate("JSON.stringify([...document.scripts].map(script=>script.src))");
    await devtools.evaluate(`(() => {
      document.querySelector('#username').value = ${JSON.stringify(email)};
      document.querySelector('#password').value = ${JSON.stringify(password)};
      document.querySelector('.login-btn').click();
      return true;
    })()`);
    for (let attempt = 0; attempt < 80; attempt++) {
        const user = await devtools.evaluate("JSON.parse(localStorage.getItem('loggedInUser')||'null')");
        if (user?.id) {
            await devtools.evaluate("document.getElementById('popupButton').click()");
            await delay(250);
            return user;
        }
        await delay(125);
    }
    const formState = await devtools.evaluate(`({url:location.href,user:localStorage.getItem('loggedInUser'),title:document.getElementById('popupTitle')?.textContent,message:document.getElementById('popupMessage')?.textContent,popupClass:document.getElementById('popupOverlay')?.className,usernameError:document.getElementById('usernameError')?.textContent,passwordError:document.getElementById('passwordError')?.textContent})`);
    throw new Error(`Synthetic login failed for ${email}: ${JSON.stringify({ ...formState, loadedScripts, recentBrowserEvents:devtools.events.slice(-10) })}`);
}

async function seedPageState(devtools, user, applicationId, passType, route = null) {
    const state = { applicationId, passType, currentStep: "route", status: "Draft", route: route || {} };
    await devtools.evaluate(`(() => {
      localStorage.setItem('applicationId',${JSON.stringify(String(applicationId))});
      localStorage.setItem('selectedPassType',${JSON.stringify(passType)});
      localStorage.setItem('busPassApplication',${JSON.stringify(JSON.stringify(state))});
      return true;
    })()`);
}

async function chooseViaCustomDropdown(devtools, selectId, value) {
    const result = await devtools.evaluate(`(() => {
      const select=document.getElementById(${JSON.stringify(selectId)});
      if(!select?._bpDD) return 'custom dropdown missing';
      select._bpDD.trigger.click();
      const option=[...document.querySelectorAll('.bp-dd-option')].find(node=>node.dataset.value===${JSON.stringify(value)});
      if(!option) return 'route option missing: '+${JSON.stringify(value)};
      option.click();
      return select.value;
    })()`);
    assert.equal(result, value, `${selectId} route option selected through the visible custom dropdown`);
}

async function browserRouteSave(devtools, { user, applicationId, passType, page, from, to }) {
    await seedPageState(devtools, user, applicationId, passType);
    await navigate(devtools, `http://localhost:5000/home/${page}`);
    await waitFor("http://localhost:5000/api/health", response => response.ok, "route page backend availability");
    for (let i = 0; i < 80; i++) {
        const ready = await devtools.evaluate(`document.querySelectorAll('#fromStop option').length > 1 && Boolean(document.querySelector('#fromStop')._bpDD)`);
        if (ready) break;
        await delay(125);
    }
    await chooseViaCustomDropdown(devtools, "fromStop", from);
    await delay(150);
    await chooseViaCustomDropdown(devtools, "toStop", to);
    await devtools.evaluate("document.querySelector('.next-button').click()");
    const nextPath = page.startsWith("student-") ? "student-plan.html" : "employee-plan.html";
    for (let i = 0; i < 100; i++) {
        const pathname = await devtools.evaluate("location.pathname");
        if (pathname.endsWith(nextPath)) return pathname;
        await delay(125);
    }
    const details = await devtools.evaluate(`({url:location.href, popup:document.querySelector('#popupTitle')?.textContent||'', message:document.querySelector('#popupMessage')?.textContent||''})`);
    throw new Error(`Next did not open ${nextPath}: ${JSON.stringify(details)}`);
}

async function verifyAfterRestart(devtools, email, applicationId, passType, page, expectedFrom, expectedTo, expectedType) {
    const user = await login(devtools, email);
    await seedPageState(devtools, user, applicationId, passType);
    await navigate(devtools, `http://localhost:5000/home/${page}`);
    let restored;
    for (let i = 0; i < 100; i++) {
        restored = await devtools.evaluate(`({from:document.getElementById('fromStop')?.value||'',to:document.getElementById('toStop')?.value||'',app:localStorage.getItem('applicationId')||''})`);
        if (restored.from && restored.to) break;
        await delay(125);
    }
    assert.deepEqual(restored, { from: expectedFrom, to: expectedTo, app: String(applicationId) }, `${passType} route restored after login and backend restart`);
    const data = await devtools.evaluate(`(async()=>{
      const app=await BPApplication.current();
      const saved=await BPApplication.data();
      return {appId:String(app?.application_id||''),from:app?.from_stop||'',to:app?.to_stop||'',passType:app?.pass_type_name||'',userType:saved?.details?.userType||saved?.details?.user_type||'',organization:saved?.details?.organization||'',college:saved?.details?.collegeName||''};
    })()`);
    assert.equal(data.appId, String(applicationId));
    assert.equal(data.from, expectedFrom);
    assert.equal(data.to, expectedTo);
    assert.equal(data.passType, passType);
    if (expectedType === "student") assert.equal(data.college, "Synthetic Route College");
    if (expectedType === "employee") assert.equal(data.organization, "Synthetic Route Organization");
    console.log(`RESTART_RETRIEVAL_${expectedType.toUpperCase()}=${JSON.stringify({ applicationId: data.appId, from: data.from, to: data.to, passType: data.passType, detailsRetrieved: true })}`);
}

async function main() {
    let databaseCreated = false;
    let backend;
    let browser;
    try {
        assert.equal(fs.existsSync(chromeProfile), false, "temporary Chrome profile path is unused");
        assert.equal((await query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?", [schemaName])).length, 0,
            "isolated test schema name is unused");
        await query(`CREATE DATABASE ${quote(schemaName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        databaseCreated = true;

        const tables = ["users", "pass_types", "bus_types", "routes", "pass_plans", "student_details", "employee_details", "pass_applications", "application_submission_details", "documents"];
        for (const table of tables) {
            await query(`CREATE TABLE ${quote(schemaName)}.${quote(table)} LIKE ${quote(liveDbName)}.${quote(table)}`);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await query(`INSERT INTO ${quote(schemaName)}.pass_types (id,pass_type_name,user_type) VALUES (1,'Student Pass','student'),(2,'Employee Pass','employee')`);
        await query(`INSERT INTO ${quote(schemaName)}.bus_types (id,bus_type_name,service_type) VALUES (1,'Ordinary','Regular')`);
        await query(`INSERT INTO ${quote(schemaName)}.routes (id,route_code,from_stop,to_stop,distance_km,bus_type_id,route_status) VALUES
          (101,'VERIFY-STUDENT','Synthetic Student Origin','Synthetic Student Destination',12,1,'published'),
          (102,'VERIFY-EMPLOYEE','Synthetic Employee Origin','Synthetic Employee Destination',18,1,'published')`);
        await query(`INSERT INTO ${quote(schemaName)}.users (id,student_id,full_name,mobile,email,password,user_type) VALUES
          (701,'STU900701','Synthetic Student','9000000001','student.route.test@example.invalid',?,'student'),
          (702,'STU900702','Synthetic Employee','9000000002','employee.route.test@example.invalid',?,'employee'),
          (703,'STU900703','Synthetic Student Two','9000000003','student.two.route.test@example.invalid',?,'student')`, [passwordHash,passwordHash,passwordHash]);
        await query(`INSERT INTO ${quote(schemaName)}.student_details (user_id,full_name,mobile,email,college_name,class_course) VALUES
          (701,'Synthetic Student','9000000001','student.route.test@example.invalid','Synthetic Route College','Test Class'),
          (703,'Synthetic Student Two','9000000003','student.two.route.test@example.invalid','Synthetic Route College','Test Class')`);
        await query(`INSERT INTO ${quote(schemaName)}.employee_details (user_id,full_name,mobile,email,organization_name,employee_id,department,designation) VALUES
          (702,'Synthetic Employee','9000000002','employee.route.test@example.invalid','Synthetic Route Organization','TEST-EMP-702','Testing','Synthetic')`);
        await query(`INSERT INTO ${quote(schemaName)}.pass_applications (id,user_id,pass_type_id,application_status) VALUES
          (801,701,1,'draft'),(802,702,2,'draft')`);
        console.log("SYNTHETIC_USERS=" + JSON.stringify(await query(`SELECT id,user_type FROM ${quote(schemaName)}.users ORDER BY id`)));

        backend = await startAndWaitProject();
        console.log("STARTUP= npm start with isolated DB_NAME");
        console.log("BACKEND_START_LOG=" + backend.readOutput().trim());

        const loginResponse = await fetch("http://localhost:5000/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({identifier:"student.route.test@example.invalid",password}) });
        const loginBody = await loginResponse.json();
        assert.equal(loginResponse.status, 200, `synthetic login API should work (${loginResponse.status})`);
        assert.equal(loginBody.user.id, 701);

        const student = { userId:701, passType:"Student Pass", fromStop:"Synthetic Student Origin", toStop:"Synthetic Student Destination", busType:"Ordinary", applicationId:801 };
        const employee = { userId:702, passType:"Employee Pass", fromStop:"Synthetic Employee Origin", toStop:"Synthetic Employee Destination", busType:"Ordinary", applicationId:802 };
        const apiStudent = await requestRoute(student);
        const apiEmployee = await requestRoute(employee);
        assert.deepEqual(apiStudent, { status:200, body:{success:true,routeId:101,applicationId:801} });
        assert.deepEqual(apiEmployee, { status:200, body:{success:true,routeId:102,applicationId:802} });
        assert.equal((await requestRoute(student)).body.applicationId, 801);
        assert.equal((await requestRoute(employee)).body.applicationId, 802);

        const wrongType = await requestRoute({ ...student, passType:"Employee Pass" });
        assert.equal(wrongType.status, 403);
        assert.equal(wrongType.body.success, false);
        const wrongOwner = await requestRoute({ ...student, userId:703 });
        assert.equal(wrongOwner.status, 404);
        assert.equal(wrongOwner.body.success, false);

        await query(`ALTER TABLE ${quote(schemaName)}.routes RENAME TO ${quote(schemaName)}.routes_test_hold`);
        const databaseFailure = await requestRoute(student);
        await query(`ALTER TABLE ${quote(schemaName)}.routes_test_hold RENAME TO ${quote(schemaName)}.routes`);
        assert.equal(databaseFailure.status, 500);
        assert.equal(databaseFailure.body.success, false);

        const cdp = 9300 + Math.floor(Math.random() * 500);
        console.log("BROWSER_START=begin");
        browser = await startChromeAt(cdp);
        console.log("BROWSER_START=PASS");
        const studentUser = await login(browser.devtools, "student.route.test@example.invalid");
        assert.equal(studentUser.user_type, "student");
        console.log("BROWSER_STUDENT_LOGIN=PASS");
        const studentPath = await browserRouteSave(browser.devtools, { user:studentUser, applicationId:801, passType:"Student Pass", page:"student-route.html", from:student.fromStop, to:student.toStop });
        assert.ok(studentPath.endsWith("student-plan.html"));
        console.log("BROWSER_STUDENT_NEXT=PASS");

        const employeeUser = await login(browser.devtools, "employee.route.test@example.invalid");
        assert.equal(employeeUser.user_type, "employee");
        console.log("BROWSER_EMPLOYEE_LOGIN=PASS");
        const employeePath = await browserRouteSave(browser.devtools, { user:employeeUser, applicationId:802, passType:"Employee Pass", page:"employee-route.html", from:employee.fromStop, to:employee.toStop });
        assert.ok(employeePath.endsWith("employee-plan.html"));
        console.log("BROWSER_EMPLOYEE_NEXT=PASS");

        let persisted = await query(`SELECT pa.id applicationId,pa.user_id userId,pt.pass_type_name passType,pa.route_id routeId,
          pa.route_distance_km_snapshot distanceSnapshot,asd.user_id snapshotUserId,asd.user_type snapshotType,
          asd.college_name collegeName,asd.organization_name organizationName,
          (SELECT COUNT(*) FROM ${quote(schemaName)}.pass_applications) totalApplications,
          (SELECT COUNT(*) FROM ${quote(schemaName)}.application_submission_details s WHERE s.application_id=pa.id) snapshots
          FROM ${quote(schemaName)}.pass_applications pa JOIN ${quote(schemaName)}.pass_types pt ON pt.id=pa.pass_type_id
          LEFT JOIN ${quote(schemaName)}.application_submission_details asd ON asd.application_id=pa.id ORDER BY pa.id`);
        assert.equal(persisted.length, 2);
        assert.deepEqual(persisted.map(row => [row.applicationId,row.userId,row.passType,row.routeId,Number(row.distanceSnapshot),row.snapshotUserId,row.snapshotType,row.snapshots]), [
            [801,701,"Student Pass",101,12,701,"student",1], [802,702,"Employee Pass",102,18,702,"employee",1]
        ]);
        assert.ok(persisted.every(row => Number(row.totalApplications) === 2));

        await stopTree(backend.child);
        backend = null;
        console.log("BACKEND_STOP=PASS");
        await delay(500);
        backend = await startAndWaitProject();
        console.log("BACKEND_RESTART=PASS");

        for (const user of [
            { email:"student.route.test@example.invalid", id:701, appId:801, passType:"Student Pass", page:"student-route.html", from:student.fromStop, to:student.toStop, type:"student" },
            { email:"employee.route.test@example.invalid", id:702, appId:802, passType:"Employee Pass", page:"employee-route.html", from:employee.fromStop, to:employee.toStop, type:"employee" }
        ]) {
            await browser.devtools.evaluate("localStorage.clear()");
            console.log(`RESTART_RETRIEVAL_${user.type.toUpperCase()}=begin`);
            await verifyAfterRestart(browser.devtools, user.email, user.appId, user.passType, user.page, user.from, user.to, user.type);
        }

        console.log("API_SAVES=" + JSON.stringify({ student:apiStudent, employee:apiEmployee }));
        console.log("BROWSER_NAVIGATION=" + JSON.stringify({ student:studentPath, employee:employeePath }));
        console.log("REPEAT_SAVES=PASS; application count remained 2 and one snapshot per app");
        console.log("FAILED_WRITES=" + JSON.stringify({ wrongType, wrongOwner, databaseFailure }));
        console.log("PERSISTED_TEST_ROWS=" + JSON.stringify(persisted.map(row => ({applicationId:row.applicationId,userId:row.userId,passType:row.passType,routeId:row.routeId,distanceSnapshot:Number(row.distanceSnapshot),snapshotUserId:row.snapshotUserId,snapshotType:row.snapshotType,snapshotCount:row.snapshots}))));
    } finally {
        if (browser) {
            browser.devtools.close();
            await stopTree(browser.child);
        }
        if (backend) await stopTree(backend.child);
        if (fs.existsSync(chromeProfile)) {
            const resolvedProfile = path.resolve(chromeProfile);
            assert.ok(resolvedProfile.startsWith(path.resolve(os.tmpdir()) + path.sep), "only the test Chrome profile may be removed");
            fs.rmSync(resolvedProfile, { recursive:true, force:true });
        }
        if (databaseCreated) {
            await query(`DROP DATABASE ${quote(schemaName)}`);
            const remaining = await query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?", [schemaName]);
            assert.equal(remaining.length, 0, "the disposable regression schema is removed");
            console.log("TEST_SCHEMA_CLEANUP=PASS");
        }
        connection.end();
    }
}

async function startChromeAt(port) {
    const child = spawn(chromePath, [
        "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
        `--remote-debugging-port=${port}`, "--remote-allow-origins=*",
        `--user-data-dir=${chromeProfile}`, "about:blank"
    ], { windowsHide:true, stdio:"ignore" });
    const version = await waitFor(`http://127.0.0.1:${port}/json/version`,
        (response, body) => response.ok && Boolean(body?.webSocketDebuggerUrl), "Chrome startup", child);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(item => item.type === "page");
    assert.ok(target);
    const devtools = await DevTools.connect(target.webSocketDebuggerUrl);
    await devtools.send("Page.enable");
    await devtools.send("Runtime.enable");
    await devtools.send("Network.enable");
    return { child, devtools, version };
}

main().then(() => {
    // Chrome may keep detached helper handles alive after taskkill completes.
    process.exit(0);
}).catch(error => {
    console.error("ROUTE_SAVE_REGRESSION_FAILURE=" + (error.stack || error));
    process.exit(1);
});
