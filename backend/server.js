/**
 * Jorge Sanchez | UCID: jrs239 | IT-302 | Section: 451
 * Email: jrs239@njit.edu
 * Assignment: Phase 2 Read MongoDB Data using Node.js
 */
import express from "express";
import cors from "cors";
import organizationsRouter from "./api/organizations.route.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/v1/jrs239/organizations", organizationsRouter);
app.use((req, res) => res.status(404).json({ error: "Endpoint not found" }));
app.use((error, req, res, next) => {
  // Never send database errors or connection details to clients.
  res.status(500).json({ error: "Unable to retrieve organizations" });
});

export default app;
