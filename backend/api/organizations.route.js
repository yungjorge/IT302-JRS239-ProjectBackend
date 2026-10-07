/**
 * Jorge Sanchez | UCID: jrs239 | IT-302 | Section: 451
 * Email: jrs239@njit.edu
 * Assignment: Phase 2 Read MongoDB Data using Node.js
 */
import { Router } from "express";
import OrganizationsController from "./organizations.controller.js";

const router = Router();
router.get("/", OrganizationsController.apiGetOrganizations);
export default router;
