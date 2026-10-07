/**
 * Jorge Sanchez | UCID: jrs239 | IT-302 | Section: 451
 * Email: jrs239@njit.edu
 * Assignment: Phase 2 Read MongoDB Data using Node.js
 */
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import app from "./server.js";
import OrganizationsDAO from "./dao/organizationsDAO.js";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

async function main() {
  for (const key of ["MONGODB_URI", "MONGODB_DATABASE", "MONGODB_COLLECTION"]) {
    if (!process.env[key]?.trim()) throw new Error(`Missing ${key} in backend/.env`);
  }
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    await OrganizationsDAO.injectDB(client, process.env.MONGODB_DATABASE, process.env.MONGODB_COLLECTION);
    const server = app.listen(port, "127.0.0.1", () => {
      console.log(`Organizations API: http://localhost:${port}/api/v1/jrs239/organizations`);
    });
    server.on("error", async () => {
      console.error("HTTP server could not start. Check whether PORT is already in use.");
      await client.close();
      process.exitCode = 1;
    });
    const shutdown = () => server.close(async () => { await client.close(); });
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch {
    await client.close();
    throw new Error("MongoDB initialization failed. Check backend/.env, database/collection names, network access, and credentials.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
