/**
 * Jorge Sanchez | UCID: jrs239 | IT-302 | Section: 451
 * Email: jrs239@njit.edu
 * Assignment: Phase 2 Read MongoDB Data using Node.js
 */
import OrganizationsDAO from "../dao/organizationsDAO.js";

function integerParameter(value, fallback, minimum, maximum) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export default class OrganizationsController {
  static async apiGetOrganizations(req, res, next) {
    const itemsPerPage = integerParameter(req.query.itemsPerPage, 20, 1, 100);
    // Pages are zero-based: pageNumber=0 is the first page.
    const pageNumber = integerParameter(req.query.pageNumber, 0, 0, Number.MAX_SAFE_INTEGER);
    if (itemsPerPage === null || pageNumber === null || !Number.isSafeInteger(itemsPerPage * pageNumber)) {
      return res.status(400).json({ error: "itemsPerPage must be an integer from 1 to 100; pageNumber must be a nonnegative safe integer with a safe pagination offset" });
    }
    if (req.query.login !== undefined && (typeof req.query.login !== "string" || req.query.login.length > 256)) {
      return res.status(400).json({ error: "login must be a single string of at most 256 characters" });
    }
    const filters = req.query.login?.trim() ? { login: req.query.login.trim() } : {};
    try {
      const { organizations, totalResults } = await OrganizationsDAO.getOrganizations({ filters, itemsPerPage, pageNumber });
      return res.json({ organizations, pageNumber, itemsPerPage, filters, totalResults });
    } catch (error) {
      next(error);
    }
  }
}
