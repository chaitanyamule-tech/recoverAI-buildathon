import express from "express";

import {
  createCheckout,
  verifyPayment,
  createDemoRecovery,
} from "../controllers/recovery.controller.js";

const router =
  express.Router();

router.post(
  "/demo",
  createDemoRecovery
);

router.post(
  "/:id/checkout",
  createCheckout
);

router.post(
  "/:id/verify",
  verifyPayment
);

export default router;