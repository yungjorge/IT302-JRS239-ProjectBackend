/**
 * Jorge Sanchez | UCID: jrs239 | IT-302 | Section: 451
 * Email: jrs239@njit.edu
 * Assignment: Phase 3 C.U.D. MongoDB
 */
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import { BSON, MongoClient, ObjectId } from "mongodb";
import app from "../server.js";
import OrganizationsDAO from "../dao/organizationsDAO.js";
import CommentsDAO from "../dao/commentsDAO.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

test("Phase 3 HTTP integration against real MongoDB", { timeout: 60000 }, async (t) => {
  assert.ok(process.env.MONGODB_URI, "Configure MONGODB_URI in backend/.env");
  assert.ok(process.env.MONGODB_DATABASE, "Configure MONGODB_DATABASE in backend/.env");
  assert.equal(process.env.MONGODB_COLLECTION, "organizations_jrs239");
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const report = { startedAt: new Date().toISOString(), database: process.env.MONGODB_DATABASE, passed: false, checks: [], exchanges: [] };
  let server;
  let connected = false;
  // Only this run's uniquely named comments can be removed by cleanup.
  const userId = `jrs239-integration-${randomUUID()}`;
  try {
    await client.connect();
    connected = true;
    await OrganizationsDAO.injectDB(client, process.env.MONGODB_DATABASE, process.env.MONGODB_COLLECTION);
    await CommentsDAO.injectDB(client, process.env.MONGODB_DATABASE);
    const database = client.db(process.env.MONGODB_DATABASE);
    const organizations = database.collection("organizations_jrs239");
    const comments = database.collection("comments_jrs239");
    const snapshot = async (collection) => BSON.EJSON.stringify(await collection.find({}).sort({ _id: 1 }).toArray());
    const originalOrganizations = await snapshot(organizations);
    const originalComments = await snapshot(comments);
    const orderedOrganizations = await organizations.find({}).sort({ id: 1, _id: 1 }).toArray();
    assert.ok(orderedOrganizations.length > 0, "The Phase 1 organizations collection must contain data");
    const organizationId = orderedOrganizations[0].id;
    report.organizationCountBefore = orderedOrganizations.length;
    report.organizationHashBefore = createHash("sha256").update(originalOrganizations).digest("hex");
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/jrs239`;
    const request = async (method, path, body, expected, { raw = false, contentType = "application/json" } = {}) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: body === undefined ? {} : { "Content-Type": contentType },
        body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
      });
      assert.equal(response.status, expected, `${method} ${path}`);
      assert.match(response.headers.get("content-type"), /application\/json/);
      const json = await response.json();
      if (expected >= 400) assert.equal(typeof json.error, "string");
      report.exchanges.push({
        method, url: `${baseUrl}${path}`,
        requestBody: JSON.stringify(body)?.length > 8192 ? { omitted: "oversized validation input" } : body,
        status: response.status,
        ...(method === "GET" && json.organizations
          ? { responseSummary: { ...json, organizations: { returnedCount: json.organizations.length, contentsMatchedDirectDatabaseRead: true } } }
          : { response: json }),
      });
      return json;
    };
    const check = async (name, fn) => t.test(name, async () => {
      await fn();
      report.checks.push({ name, passed: true });
    });

    await check("GET default, pagination, all records and filter match direct MongoDB reads", async () => {
      for (const [query, expected] of [
        ["", orderedOrganizations.slice(0, 20)],
        ["?itemsPerPage=5&pageNumber=0", orderedOrganizations.slice(0, 5)],
        ["?itemsPerPage=5&pageNumber=1", orderedOrganizations.slice(5, 10)],
        ["?itemsPerPage=100&pageNumber=0", orderedOrganizations],
      ]) {
        const json = await request("GET", `/organizations${query}`, undefined, 200);
        assert.deepEqual(json.organizations, JSON.parse(JSON.stringify(expected)));
        assert.equal(json.totalResults, orderedOrganizations.length);
      }
      const json = await request("GET", "/organizations?login=engineyard", undefined, 200);
      assert.deepEqual(json.organizations, JSON.parse(JSON.stringify(orderedOrganizations.filter((item) => /engineyard/i.test(item.login)))));
      assert.equal(json.totalResults, json.organizations.length);
    });
    await check("GET validation remains intact", async () => {
      for (const query of ["?itemsPerPage=0", "?pageNumber=-1", "?login=a&login=b"]) {
        await request("GET", `/organizations${query}`, undefined, 400);
      }
    });

    const valid = { organizationId, text: "This organization provides useful resources for learning web development.", userName: "Jorge Sanchez", userId };
    await check("POST rejects missing, invalid, injected and client timestamp fields", async () => {
      for (const body of [
        {}, null, [], { ...valid, organizationId: "81" }, { ...valid, organizationId: -1 },
        { ...valid, organizationId: 1.5 }, { ...valid, organizationId: { $ne: null } },
        { ...valid, text: "Good." }, { ...valid, text: "This sentence lacks terminal punctuation" },
        { ...valid, text: "x".repeat(5001) + "." }, { ...valid, text: { $set: "unsafe" } },
        { ...valid, userName: " " }, { ...valid, userName: "x".repeat(101) },
        { ...valid, userId: "" }, { ...valid, userId: "x".repeat(129) },
        { ...valid, userId: { $ne: null } }, { ...valid, LastModified: "2000-01-01" },
      ]) await request("POST", "/comments", body, 400);
      assert.equal(await comments.countDocuments({ userId }), 0);
    });
    await check("POST rejects an organization that does not exist", async () => {
      let missingId = Number.MAX_SAFE_INTEGER;
      while (await organizations.findOne({ id: missingId })) missingId--;
      await request("POST", "/comments", { ...valid, organizationId: missingId }, 404);
      assert.equal(await comments.countDocuments({ userId }), 0);
    });
    await check("Malformed JSON, non-JSON and oversized bodies return clear errors", async () => {
      await request("POST", "/comments", "{broken", 400, { raw: true });
      await request("POST", "/comments", "hello", 415, { raw: true, contentType: "text/plain" });
      await request("POST", "/comments", { ...valid, text: "x".repeat(33000) }, 413);
      await request("POST", "/comments", undefined, 415);
    });

    let created;
    await check("POST 201 persists a new ObjectId and BSON Date in comments_jrs239", async () => {
      const before = Date.now();
      const json = await request("POST", "/comments", { ...valid, text: `  ${valid.text}  ` }, 201);
      created = json.comment;
      assert.match(created._id, /^[a-f0-9]{24}$/);
      assert.equal(created.text, valid.text);
      assert.ok(Date.parse(created.LastModified) >= before);
      assert.ok(Date.parse(created.LastModified) <= Date.now());
      const stored = await comments.findOne({ _id: new ObjectId(created._id) });
      assert.ok(stored.LastModified instanceof Date);
      assert.deepEqual(JSON.parse(JSON.stringify(stored)), created);
    });
    await check("Multiple comments may refer to the same unique organization identifier", async () => {
      const second = await request("POST", "/comments", valid, 201);
      assert.notEqual(second.comment._id, created._id);
      await request("DELETE", `/comments/${second.comment._id}`, { userId }, 200);
    });
    await check("PUT and DELETE reject malformed IDs, missing owners and invalid bodies", async () => {
      for (const method of ["PUT", "DELETE"]) {
        await request(method, "/comments/not-an-id", { text: valid.text, userId }, 400);
        await request(method, `/comments/${created._id}`, {}, 400);
        await request(method, `/comments/${created._id}`, { userId: { $ne: null } }, 400);
        await request(method, `/comments/${created._id}`, { userId, extra: true }, 400);
        await request(method, `/comments/${created._id}`, "hello", 415, { raw: true, contentType: "text/plain" });
      }
      await request("PUT", `/comments/${created._id}`, { userId, text: "Short." }, 400);
      await request("PUT", `/comments/${created._id}`, { userId, text: valid.text, LastModified: "2000-01-01" }, 400);
      assert.deepEqual(JSON.parse(JSON.stringify(await comments.findOne({ _id: new ObjectId(created._id) }))), created);
    });
    await check("A different userId cannot update or delete the comment", async () => {
      await request("PUT", `/comments/${created._id}`, { userId: `${userId}-other`, text: valid.text }, 404);
      await request("DELETE", `/comments/${created._id}`, { userId: `${userId}-other` }, 404);
      assert.deepEqual(JSON.parse(JSON.stringify(await comments.findOne({ _id: new ObjectId(created._id) }))), created);
    });
    await check("Missing comment IDs return 404", async () => {
      const missingId = new ObjectId().toHexString();
      await request("PUT", `/comments/${missingId}`, { userId, text: valid.text }, 404);
      await request("DELETE", `/comments/${missingId}`, { userId }, 404);
    });
    await check("PUT 200 changes stored text and refreshes BSON LastModified", async () => {
      const text = "This organization publishes helpful examples that support my database coursework.";
      const json = await request("PUT", `/comments/${created._id}`, { text, userId }, 200);
      assert.equal(json.comment.text, text);
      assert.ok(Date.parse(json.comment.LastModified) > Date.parse(created.LastModified));
      for (const key of ["_id", "organizationId", "userName", "userId"]) assert.equal(json.comment[key], created[key]);
      const stored = await comments.findOne({ _id: new ObjectId(created._id) });
      assert.ok(stored.LastModified instanceof Date);
      assert.deepEqual(JSON.parse(JSON.stringify(stored)), json.comment);
    });
    await check("DELETE 200 removes the document; repeating DELETE returns 404", async () => {
      const json = await request("DELETE", `/comments/${created._id}`, { userId }, 200);
      assert.equal(json.deletedId, created._id);
      assert.equal(await comments.findOne({ _id: new ObjectId(created._id) }), null);
      await request("DELETE", `/comments/${created._id}`, { userId }, 404);
    });
    await check("Unknown routes return JSON 404", async () => {
      await request("GET", "/missing", undefined, 404);
    });
    await check("All original organization and comment documents remain unchanged", async () => {
      assert.equal(await snapshot(organizations), originalOrganizations);
      assert.equal(await snapshot(comments), originalComments);
      report.organizationCountAfter = await organizations.countDocuments();
      report.organizationHashAfter = createHash("sha256").update(await snapshot(organizations)).digest("hex");
      report.preexistingCommentsPreserved = true;
      report.testCommentsRemaining = await comments.countDocuments({ userId });
    });
    report.passed = report.checks.length === 14 && report.checks.every((check) => check.passed);
    assert.ok(report.passed);
  } finally {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    // Never drop a collection or delete comments that predate this test run.
    if (connected) {
      await client.db(process.env.MONGODB_DATABASE).collection("comments_jrs239").deleteMany({ userId });
    }
    await client.close();
    if (process.env.PHASE3_REPORT_PATH) {
      report.finishedAt = new Date().toISOString();
      const reportPath = resolve(process.env.PHASE3_REPORT_PATH);
      await mkdir(dirname(reportPath), { recursive: true });
      await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
    }
  }
});
