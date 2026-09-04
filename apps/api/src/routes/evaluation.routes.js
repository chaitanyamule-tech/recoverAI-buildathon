import express from "express";

import {
  getEvaluation,
  getEvaluationSummary,
} from "../controllers/evaluation.controller.js";

const router = express.Router();

router.get("/", getEvaluation);

router.get(
  "/summary",
  getEvaluationSummary
);

export default router;