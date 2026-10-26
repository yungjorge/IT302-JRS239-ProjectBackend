/**
 * Jorge Sanchez | UCID: jrs239 | IT-302 | Section: 451
 * Email: jrs239@njit.edu
 * Assignment: Phase 3 C.U.D. MongoDB
 */
import { Router } from "express";
import CommentsController from "./comments.controller.js";

const router = Router();
router.use((req, res, next) => {
  if (["POST", "PUT", "DELETE"].includes(req.method) && !req.is("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }
  next();
});
router.post("/", CommentsController.apiPostComment);
router.put("/:commentId", CommentsController.apiPutComment);
router.delete("/:commentId", CommentsController.apiDeleteComment);
export default router;
