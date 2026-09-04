import {
  verifyWebhookSignature,
} from "../integrations/razorpay/webhooks.js";

import {
  processRazorpayWebhook,
} from "../services/razorpay-webhook.service.js";

async function handleRazorpayWebhook(
  req,
  res,
  next
) {
  try {
    const signature =
      req.headers[
        "x-razorpay-signature"
      ];

    const rawBody =
      req.body.toString("utf8");

    const valid =
      verifyWebhookSignature(
        rawBody,
        signature
      );

    if (!valid) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid Razorpay webhook signature.",
      });
    }

    const payload =
      JSON.parse(rawBody);

    const eventId =
      req.headers[
        "x-razorpay-event-id"
      ];

    const eventType =
      payload.event;

    const result =
      await processRazorpayWebhook({
        eventId,

        eventType,

        payload,
      });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export {
  handleRazorpayWebhook,
};

