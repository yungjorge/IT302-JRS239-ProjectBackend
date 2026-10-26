/**
 * Jorge Sanchez | UCID: jrs239 | IT-302 | Section: 451
 * Email: jrs239@njit.edu
 * Assignment: Phase 3 C.U.D. MongoDB
 */
import CommentsDAO from "../dao/commentsDAO.js";
import OrganizationsDAO from "../dao/organizationsDAO.js";

function validateBody(body, fields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "A JSON object body is required";
  if (Object.keys(body).some((key) => !fields.includes(key))) return `Only these fields are accepted: ${fields.join(", ")}`;
  for (const key of fields) {
    if (key === "organizationId") {
      if (!Number.isSafeInteger(body[key]) || body[key] <= 0) return "organizationId must be a positive safe integer from the organizations collection's id field";
    } else if (key === "text") {
      if (typeof body[key] !== "string") return "text must be a string";
      const text = body[key].trim();
      // This checks sentence form; meaningful content must still be written by the author.
      if (text.length < 20 || text.length > 5000 || (text.match(/\p{L}+/gu) || []).length < 3 || !/[.!?]["'\u201d\u2019)]?$/.test(text)) {
        return "text must contain a meaningful complete sentence: 20-5000 characters, at least three words, ending with . ! or ?";
      }
    } else {
      const maximum = key === "userName" ? 100 : 128;
      if (typeof body[key] !== "string" || !body[key].trim() || body[key].trim().length > maximum) {
        return `${key} must be a nonempty string of at most ${maximum} characters`;
      }
    }
  }
  return null;
}

function validateCommentId(id) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

export default class CommentsController {
  static async apiPostComment(req, res, next) {
    const error = validateBody(req.body, ["organizationId", "text", "userName", "userId"]);
    if (error) return res.status(400).json({ error });
    try {
      if (!await OrganizationsDAO.organizationExists(req.body.organizationId)) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const comment = await CommentsDAO.addComment({
        organizationId: req.body.organizationId,
        text: req.body.text.trim(),
        userName: req.body.userName.trim(),
        userId: req.body.userId.trim(),
      });
      return res.status(201).json({ status: "success", message: "Comment created", comment });
    } catch (error) {
      next(error);
    }
  }

  static async apiPutComment(req, res, next) {
    if (!validateCommentId(req.params.commentId)) return res.status(400).json({ error: "commentId must be a 24-character hexadecimal MongoDB ObjectId" });
    const error = validateBody(req.body, ["text", "userId"]);
    if (error) return res.status(400).json({ error });
    try {
      const comment = await CommentsDAO.updateComment(req.params.commentId, req.body.userId.trim(), req.body.text.trim());
      if (!comment) return res.status(404).json({ error: "Comment not found for this userId" });
      return res.json({ status: "success", message: "Comment updated", comment });
    } catch (error) {
      next(error);
    }
  }

  static async apiDeleteComment(req, res, next) {
    if (!validateCommentId(req.params.commentId)) return res.status(400).json({ error: "commentId must be a 24-character hexadecimal MongoDB ObjectId" });
    const error = validateBody(req.body, ["userId"]);
    if (error) return res.status(400).json({ error });
    try {
      const result = await CommentsDAO.deleteComment(req.params.commentId, req.body.userId.trim());
      if (result.deletedCount === 0) return res.status(404).json({ error: "Comment not found for this userId" });
      return res.json({ status: "success", message: "Comment deleted", deletedId: req.params.commentId.toLowerCase() });
    } catch (error) {
      next(error);
    }
  }
}
