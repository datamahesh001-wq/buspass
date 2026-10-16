#!/usr/bin/env node
"use strict";

// Integration regressions run against table definitions cloned into a fresh,
// disposable schema. The running application database is read-only here.
require("dotenv").config({ path: require("node:path").join(__dirname, "..", ".env") });
const assert = require("node:assert/strict");
const mysql = require("mysql2");
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

const root = path.resolve(__dirname, "..");
const sourceDb = process.env.DB_NAME || "buspass_db";
const dbName = `buspass_admin_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const port = 5100 + Math.floor(Math.random() * 500);
const url = `http://127.0.0.1:${port}`;
const testId = 981000 + Math.floor(Math.random() * 999);
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const chromeProfile = path.join(os.tmpdir(), `buspass-admin-test-chrome-${Date.now()}`);
const qname = name => `\`${String(name).replace(/`/g, "``")}\``;
const db = mysql.createConnection({ host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "mahesh@2006", database: sourceDb });
const query = (sql, values = []) => new Promise((resolve, reject) => db.query(sql, values, (err, rows) => err ? reject(err) : resolve(rows)));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let created = false;
let server;
let serverOutput = "";
let browser;

class DevTools {
    constructor(socket) {
        this.socket = socket; this.nextId = 1; this.waiters = new Map();
        socket.addEventListener("message", event => {
            const packet = JSON.parse(event.data); if (!packet.id) return;
            const waiter = this.waiters.get(packet.id); if (!waiter) return;
            this.waiters.delete(packet.id);
            if (packet.error) waiter.reject(new Error(packet.error.message)); else waiter.resolve(packet.result);
        });
    }
    send(method, params = {}) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => { this.waiters.set(id, { resolve, reject }); this.socket.send(JSON.stringify({ id, method, params })); });
    }
    async evaluate(expression) {
        const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
        return result.result?.value;
    }
}

async function browserWait(predicate, message, attempts = 80) {
    for (let index = 0; index < attempts; index++) {
        try { const value = await predicate(); if (value) return value; } catch {}
        await wait(125);
    }
    throw new Error(`Browser check timed out: ${message}`);
}

async function openBrowser() {
    assert.ok(fs.existsSync(chromePath), "Chrome is available for the admin editor browser check");
    const debugPort = 9600 + Math.floor(Math.random() * 300);
    const child = spawn(chromePath, ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${debugPort}`, "--remote-allow-origins=*", `--user-data-dir=${chromeProfile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
    await browserWait(async () => {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        const targets = await response.json();
        const target = targets.find(item => item.type === "page");
        if (!target) return false;
        const socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
        browser = { child, devtools: new DevTools(socket) };
        await browser.devtools.send("Page.enable"); await browser.devtools.send("Runtime.enable");
        return true;
    }, "Chrome startup");
}

async function testRouteEditorInBrowser() {
    await openBrowser();
    await browser.devtools.send("Page.navigate", { url: `${url}/Admin/admin-routes.html` });
    await browserWait(() => browser.devtools.evaluate(`location.pathname.endsWith('/Admin/admin-routes.html') && document.readyState === 'complete'`), "Admin Routes page loaded");
    await browserWait(() => browser.devtools.evaluate(`[...document.querySelectorAll('.route-card')].some(card => card.dataset.route === 'TEST-ADMIN-ROUTE-UPDATED')`), "synthetic route rendered from MySQL");
    await browser.devtools.evaluate(`(() => {
      const card=[...document.querySelectorAll('.route-card')].find(item=>item.dataset.route==='TEST-ADMIN-ROUTE-UPDATED');
      card.querySelector('.edit-route-btn').click();
      document.getElementById('fromLocation').value='Browser Verified Origin';
      document.getElementById('toLocation').value='Browser Verified Destination';
      document.getElementById('routeDistance').value='19';
      document.getElementById('busType').value='Ordinary';
      document.getElementById('routeForm').requestSubmit();
      return true;
    })()`);
    await browserWait(() => browser.devtools.evaluate(`document.getElementById('toastText')?.textContent.includes('Route updated successfully')`), "route editor success after API response");
    const saved = (await query(`SELECT from_stop,to_stop,distance_km FROM ${qname(dbName)}.routes WHERE id=?`, [testId]))[0];
    assert.deepEqual([saved.from_stop, saved.to_stop, Number(saved.distance_km)], ["Browser Verified Origin", "Browser Verified Destination", 19]);

    await query(`ALTER TABLE ${qname(dbName)}.routes RENAME TO ${qname(dbName)}.routes_test_hold`);
    await browser.devtools.evaluate(`(() => {
      const card=[...document.querySelectorAll('.route-card')].find(item=>item.dataset.route==='TEST-ADMIN-ROUTE-UPDATED');
      card.querySelector('.edit-route-btn').click();
      document.getElementById('fromLocation').value='Must Not Persist';
      document.getElementById('routeForm').requestSubmit();
      return true;
    })()`);
    await browserWait(() => browser.devtools.evaluate(`document.getElementById('toastText')?.textContent.includes('Could not load routes')`), "route editor failure shown after database error");
    await query(`ALTER TABLE ${qname(dbName)}.routes_test_hold RENAME TO ${qname(dbName)}.routes`);
    const unchanged = (await query(`SELECT from_stop FROM ${qname(dbName)}.routes WHERE id=?`, [testId]))[0];
    assert.equal(unchanged.from_stop, "Browser Verified Origin");
    console.log("BROWSER_ADMIN_EDITOR=PASS saved route toast followed SQL read-back; DB error showed failure and retained previous row");
}

async function api(route, method = "GET", body) {
    const response = await fetch(`${url}${route}`, {
        method, headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
    return { status: response.status, body: await response.json().catch(() => ({})) };
}

async function startServer() {
    server = spawn(process.execPath, [path.join(root, "backend", "server.js")], {
        cwd: root,
        env: { ...process.env, DB_NAME: dbName, PORT: String(port) },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
    });
    server.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
    server.stderr.on("data", chunk => { serverOutput += chunk.toString(); });
    for (let attempt = 0; attempt < 120; attempt++) {
        if (server.exitCode !== null) throw new Error(`Isolated backend exited: ${serverOutput}`);
        try {
            const response = await fetch(`${url}/api/health`);
            const health = await response.json();
            if (response.ok && health.database) return;
        } catch {}
        await wait(250);
    }
    throw new Error(`Isolated backend did not become ready: ${serverOutput}`);
}

function stopServer() {
    if (!server || server.exitCode !== null) return;
    if (process.platform === "win32") {
        const killed = spawnSync("taskkill.exe", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true });
        if (killed.status === 0) return;
    }
    server.kill("SIGTERM");
}

async function main() {
    try {
        assert.equal((await query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?", [dbName])).length, 0);
        await query(`CREATE DATABASE ${qname(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        created = true;
        const tables = await query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE'", [sourceDb]);
        for (const { TABLE_NAME } of tables) {
            await query(`CREATE TABLE ${qname(dbName)}.${qname(TABLE_NAME)} LIKE ${qname(sourceDb)}.${qname(TABLE_NAME)}`);
        }
        await query(`INSERT INTO ${qname(dbName)}.bus_types (id,bus_type_name,service_type) VALUES (?, 'Ordinary', 'Regular')`, [testId]);
        await query(`INSERT INTO ${qname(dbName)}.pass_types (id,pass_type_name,user_type) VALUES (?, 'Test Student Pass', 'student')`, [testId]);
        await query(`INSERT INTO ${qname(dbName)}.users (id,student_id,full_name,mobile,email,password,user_type) VALUES (?, ?, 'Synthetic Admin Update User', '9000000000', 'admin-update.test@example.invalid', 'not-used', 'student')`, [testId, `S${testId}`]);
        await query(`INSERT INTO ${qname(dbName)}.routes (id,route_code,from_stop,to_stop,distance_km,bus_type_id,route_status) VALUES
          (?, 'TEST-ADMIN-ROUTE', 'Old Stop', 'Test Destination', 10, ?, 'published'),
          (?, 'TEST-ADMIN-ROUTE-2', 'Test Origin', 'Test Destination 2', 20, ?, 'published')`, [testId, testId, testId + 1, testId]);
        await query(`INSERT INTO ${qname(dbName)}.bus_stops (id,stop_name,location,route_codes,status) VALUES (?, 'Old Stop', 'Synthetic area', 'TEST-ADMIN-ROUTE', 'active')`, [testId]);
        await query(`INSERT INTO ${qname(dbName)}.admin_plan_rates (id,pass_type_id,plan_label,distance_min_km,distance_max_km,monthly_amount,three_month_amount,half_year_amount,yearly_amount,is_active) VALUES (?, ?, '0 - 50 KM', 0, 50, 100, 280, 500, 900, 1)`, [testId, testId]);
        await query(`INSERT INTO ${qname(dbName)}.pass_applications (id,user_id,pass_type_id,route_id,bus_type_id,application_status) VALUES
          (?, ?, ?, ?, ?, 'approved'), (?, ?, ?, ?, ?, 'submitted'), (?, ?, ?, ?, ?, 'submitted'), (?, ?, ?, ?, ?, 'submitted'), (?, ?, ?, ?, ?, 'submitted')`, [testId, testId, testId, testId, testId, testId + 1, testId, testId, testId + 1, testId, testId + 2, testId, testId, testId + 1, testId, testId + 3, testId, testId, testId + 1, testId, testId + 4, testId, testId, testId + 1, testId]);
        await query(`INSERT INTO ${qname(dbName)}.bus_passes (application_id,pass_id,holder_name,pass_type,college_or_organization,course_or_designation,route_from,route_to,distance_km,valid_from,valid_to,pass_status) VALUES (?, ?, 'Before Update', 'Test Student Pass', 'Before College', 'Old course', 'Old Stop', 'Test Destination', 10, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'active')`, [testId, `BPTEST${testId}`]);
        await startServer();

        const routePayload = { routeCode: "TEST-ADMIN-ROUTE-UPDATED", fromStop: "Old Stop", toStop: "Test Destination", distanceKm: 17, busType: "Ordinary", routeStatus: "published" };
        const routeSave = await api(`/api/admin/routes/${testId}`, "PUT", routePayload);
        assert.equal(routeSave.status, 200); assert.equal(routeSave.body.success, true);
        const routeRow = (await query(`SELECT route_code,from_stop,to_stop,distance_km,route_status FROM ${qname(dbName)}.routes WHERE id=?`, [testId]))[0];
        assert.deepEqual([routeRow.route_code, routeRow.from_stop, routeRow.to_stop, Number(routeRow.distance_km), routeRow.route_status], ["TEST-ADMIN-ROUTE-UPDATED", "Old Stop", "Test Destination", 17, "published"]);
        assert.equal((await api(`/api/admin/routes/${testId}`, "PUT", routePayload)).body.success, true);
        assert.equal(Number((await query(`SELECT COUNT(*) count FROM ${qname(dbName)}.routes WHERE id=?`, [testId]))[0].count), 1);
        const visibleRoute = await api("/api/routes/available");
        assert.ok(visibleRoute.body.routes.some(route => route.routeCode === "TEST-ADMIN-ROUTE-UPDATED" && route.from === "Old Stop" && route.distanceKm === 17));
        await testRouteEditorInBrowser();
        assert.equal((await api(`/api/admin/routes/${testId}`, "PUT", { ...routePayload, fromStop: "Old Stop" })).body.success, true);

        const stopSave = await api(`/api/admin/bus-stops/${testId}`, "PUT", { name: "Renamed Stop", location: "Updated synthetic area", routes: "TEST-ADMIN-ROUTE-UPDATED" });
        assert.equal(stopSave.status, 200); assert.equal(stopSave.body.success, true);
        const stopRow = (await query(`SELECT stop_name,location,route_codes FROM ${qname(dbName)}.bus_stops WHERE id=?`, [testId]))[0];
        assert.deepEqual([stopRow.stop_name, stopRow.location, stopRow.route_codes], ["Renamed Stop", "Updated synthetic area", "TEST-ADMIN-ROUTE-UPDATED"]);
        assert.equal((await query(`SELECT from_stop FROM ${qname(dbName)}.routes WHERE id=?`, [testId]))[0].from_stop, "Renamed Stop");
        assert.ok((await api("/api/bus-stops")).body.stops.some(stop => stop.name === "Renamed Stop"));

        const planPayload = { planLabel: "0 - 50 KM Updated", distanceMinKm: 0, distanceMaxKm: 50, monthly: 123, threeMonths: 345, halfYearly: 678, yearly: 999 };
        const planSave = await api(`/api/admin/plan-rates/${testId}`, "PUT", planPayload);
        assert.equal(planSave.status, 200); assert.equal(planSave.body.success, true);
        const planRow = (await query(`SELECT plan_label,distance_min_km,distance_max_km,monthly_amount,three_month_amount,half_year_amount,yearly_amount FROM ${qname(dbName)}.admin_plan_rates WHERE id=?`, [testId]))[0];
        assert.deepEqual([planRow.plan_label, Number(planRow.distance_min_km), Number(planRow.distance_max_km), Number(planRow.monthly_amount), Number(planRow.three_month_amount), Number(planRow.half_year_amount), Number(planRow.yearly_amount)], ["0 - 50 KM Updated", 0, 50, 123, 345, 678, 999]);
        const visiblePlan = await api(`/api/plan-rates?passType=Test%20Student%20Pass&distanceKm=15`);
        assert.equal(visiblePlan.body.plan.monthly, 123);
        assert.equal(visiblePlan.body.plan.yearly, 999);

        const passPayload = { holderName: "Synthetic Updated User", institution: "Synthetic Updated College", course: "Updated Course", fromStop: "Renamed Stop", toStop: "Test Destination", distance: "17 KM", validTo: "2030-12-31", status: "ACTIVE" };
        const passSave = await api(`/api/admin/passes/${testId}`, "PUT", passPayload);
        assert.equal(passSave.status, 200); assert.equal(passSave.body.success, true);
        const passRow = (await query(`SELECT holder_name,college_or_organization,course_or_designation,route_from,route_to,distance_km,DATE_FORMAT(valid_to,'%Y-%m-%d') valid_to,pass_status FROM ${qname(dbName)}.bus_passes WHERE application_id=?`, [testId]))[0];
        assert.deepEqual([passRow.holder_name, passRow.college_or_organization, passRow.course_or_designation, passRow.route_from, passRow.route_to, Number(passRow.distance_km), passRow.valid_to, passRow.pass_status], ["Synthetic Updated User", "Synthetic Updated College", "Updated Course", "Renamed Stop", "Test Destination", 17, "2030-12-31", "active"]);
        const history = await api(`/api/history?userId=${testId}`);
        assert.ok(history.body.history.some(item => Number(item.application_id) === testId && item.submitted_full_name === "Synthetic Updated User" && item.from_stop === "Renamed Stop"));

        const rejection = await api(`/api/admin/applications/${testId + 1}/status`, "POST", { status: "rejected", reason: "Synthetic verification failure" });
        assert.equal(rejection.status, 200); assert.equal(rejection.body.success, true);
        const rejectedRow = (await query(`SELECT application_status,rejection_reason FROM ${qname(dbName)}.pass_applications WHERE id=?`, [testId + 1]))[0];
        assert.deepEqual([rejectedRow.application_status, rejectedRow.rejection_reason], ["rejected", "Synthetic verification failure"]);
        assert.ok((await api("/api/admin/applications")).body.applications.some(app => Number(app.applicationId) === testId + 1 && app.status === "rejected"));

        const reviewPayload = { checks: ["details", "route", "payment"], documents: ["synthetic-document-1"], fields: ["full-name-0", "email-1"] };
        const reviewSave = await api(`/api/admin/applications/${testId + 1}/verification`, "PUT", reviewPayload);
        assert.equal(reviewSave.status, 200); assert.equal(reviewSave.body.success, true);
        assert.deepEqual((await api(`/api/admin/applications/${testId + 1}/verification`)).body.verification, reviewPayload);
        assert.equal(Number((await query(`SELECT COUNT(*) count FROM ${qname(dbName)}.application_verifications WHERE application_id=?`, [testId + 1]))[0].count), 1);
        const reviewRepeat = await api(`/api/admin/applications/${testId + 1}/verification`, "PUT", reviewPayload);
        assert.equal(reviewRepeat.body.success, true);
        assert.equal(Number((await query(`SELECT COUNT(*) count FROM ${qname(dbName)}.application_verifications WHERE application_id=?`, [testId + 1]))[0].count), 1);

        const approval = await api(`/api/admin/applications/${testId + 2}/status`, "POST", { status: "approved" });
        assert.equal(approval.status, 200); assert.equal(approval.body.success, true); assert.equal(approval.body.passIssued, true);
        const approved = (await query(`SELECT pa.application_status,bp.pass_status,bp.application_id FROM ${qname(dbName)}.pass_applications pa JOIN ${qname(dbName)}.bus_passes bp ON bp.application_id=pa.id WHERE pa.id=?`, [testId + 2]))[0];
        assert.deepEqual([approved.application_status, approved.pass_status, Number(approved.application_id)], ["approved", "active", testId + 2]);

        await query(`ALTER TABLE ${qname(dbName)}.admin_plan_rates RENAME TO ${qname(dbName)}.admin_plan_rates_test_hold`);
        const failedPlan = await api(`/api/admin/plan-rates/${testId}`, "PUT", { ...planPayload, monthly: 150 });
        await query(`ALTER TABLE ${qname(dbName)}.admin_plan_rates_test_hold RENAME TO ${qname(dbName)}.admin_plan_rates`);
        assert.equal(failedPlan.status, 500); assert.equal(failedPlan.body.success, false);
        assert.equal(Number((await query(`SELECT monthly_amount FROM ${qname(dbName)}.admin_plan_rates WHERE id=?`, [testId]))[0].monthly_amount), 123);
        await query(`ALTER TABLE ${qname(dbName)}.application_verifications RENAME TO ${qname(dbName)}.application_verifications_test_hold`);
        const failedReview = await api(`/api/admin/applications/${testId + 1}/verification`, "PUT", { ...reviewPayload, fields: ["should-not-save"] });
        assert.equal(failedReview.status, 500); assert.equal(failedReview.body.success, false);
        await query(`ALTER TABLE ${qname(dbName)}.application_verifications_test_hold RENAME TO ${qname(dbName)}.application_verifications`);
        assert.deepEqual((await api(`/api/admin/applications/${testId + 1}/verification`)).body.verification, reviewPayload);

        await query(`ALTER TABLE ${qname(dbName)}.bus_passes RENAME TO ${qname(dbName)}.bus_passes_test_hold`);
        const failedPass = await api(`/api/admin/passes/${testId}`, "PUT", { ...passPayload, holderName: "Should Not Be Saved" });
        assert.equal(failedPass.status, 500); assert.equal(failedPass.body.success, false);
        const failedApproval = await api(`/api/admin/applications/${testId + 3}/status`, "POST", { status: "approved" });
        assert.equal(failedApproval.status, 500); assert.equal(failedApproval.body.success, false);
        const failedRejection = await api(`/api/admin/applications/${testId + 4}/status`, "POST", { status: "rejected", reason: "Synthetic failure check" });
        assert.equal(failedRejection.status, 500); assert.equal(failedRejection.body.success, false);
        await query(`ALTER TABLE ${qname(dbName)}.bus_passes_test_hold RENAME TO ${qname(dbName)}.bus_passes`);
        const unaffectedPass = (await query(`SELECT holder_name FROM ${qname(dbName)}.bus_passes WHERE application_id=?`, [testId]))[0];
        assert.equal(unaffectedPass.holder_name, "Synthetic Updated User");
        const unaffectedStatuses = await query(`SELECT id,application_status FROM ${qname(dbName)}.pass_applications WHERE id IN (?,?) ORDER BY id`, [testId + 3, testId + 4]);
        assert.deepEqual(unaffectedStatuses.map(row => row.application_status), ["submitted", "submitted"]);
        console.log("ADMIN_UPDATE_API=PASS routes, bus-stops, plan-rates, issued-pass, verification checks, reject, approve");
        console.log("MYSQL_READBACK=PASS route, stop, rate, pass, application status and issued pass verified");
        console.log("USER_READBACK=PASS /api/routes/available, /api/bus-stops, /api/plan-rates, /api/history, /api/admin/applications");
        console.log("REPEAT_UPDATE=PASS existing route ID and one verification row retained; no duplicate row");
        console.log("FAILED_WRITE=PASS plan/pass/verification/status failures returned HTTP 500 success=false; failed approval/rejection rolled back");
    } finally {
        if (browser) {
            browser.devtools.send("Browser.close").catch(() => {});
            browser.devtools.socket.close();
            await stopChild(browser.child);
        }
        if (server) stopServer();
        if (created) {
            await query(`DROP DATABASE ${qname(dbName)}`);
            assert.equal((await query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?", [dbName])).length, 0);
            console.log("ISOLATED_SCHEMA_CLEANUP=PASS");
        }
        if (fs.existsSync(chromeProfile)) {
            const profile = path.resolve(chromeProfile);
            assert.ok(profile.startsWith(path.resolve(os.tmpdir()) + path.sep), "only temporary browser profile may be removed");
            for (let attempt = 0; attempt < 20; attempt++) {
                try { fs.rmSync(profile, { recursive: true, force: true }); break; }
                catch (error) { if (attempt === 19) throw error; await wait(500); }
            }
        }
        db.end();
    }
}

async function stopChild(child) {
    if (!child || child.exitCode !== null) return;
    if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
    else child.kill("SIGTERM");
    for (let index = 0; index < 30 && child.exitCode === null; index++) await wait(100);
}

main().then(() => process.exit(0)).catch(error => {
    console.error("ADMIN_UPDATE_REGRESSION_FAILURE=" + (error.stack || error));
    process.exit(1);
});
