import "dotenv/config";
import express from "express";
import cors from "cors";

import recoveryRoutes from "./routes/recovery.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import evaluationRoutes from "./routes/evaluation.routes.js";


const app = express();

const PORT =
  process.env.PORT || 5000;

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:3000",
  })
);


app.use(
  "/api/webhooks/razorpay",
  express.raw({
    type: "application/json",
  })
);


app.use(
  express.json()
);

app.use("/api/webhooks", webhookRoutes);

app.get(
  "/health",
  (req, res) => {
    res.json({
      success: true,
      service:
        "RecoverAI API",
      timestamp:
        new Date().toISOString(),
    });
  }
);

app.use(
  "/api/recovery",
  recoveryRoutes
);

app.use(
  "/api/evaluation",
  evaluationRoutes
);

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(error);

    res.status(
      error.statusCode || 500
    ).json({
      success: false,
      error:
        error.message ||
        "Internal server error",
    });
  }
);

app.listen(
  PORT,
  () => {
    console.log(
      `🚀 RecoverAI API running on port ${PORT}`
    );
  }
);