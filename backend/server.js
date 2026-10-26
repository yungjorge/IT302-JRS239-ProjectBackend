/**
 * Jorge Sanchez | UCID: jrs239 | IT-302 | Section: 451
 * Email: jrs239@njit.edu
 * Assignment: Phases 2 and 3 MongoDB
 */
import express from "express";
import cors from "cors";
import organizationsRouter from "./api/organizations.route.js";
import commentsRouter from "./api/comments.route.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "32kb" }));
app.use("/api/v1/jrs239/organizations", organizationsRouter);
app.use("/api/v1/jrs239/comments", commentsRouter);
app.use((req, res) => res.status(404).json({ error: "Endpoint not found" }));
app.use((error, req, res, next) => {
  // Never send database errors or connection details to clients.
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON body" });
  if (error.type === "entity.too.large") return res.status(413).json({ error: "JSON body exceeds the 32 KB limit" });
  if (error.status === 415) return res.status(415).json({ error: "Unsupported JSON encoding or charset" });
  res.status(500).json({ error: "Unable to complete the database operation" });
});

export default app;
