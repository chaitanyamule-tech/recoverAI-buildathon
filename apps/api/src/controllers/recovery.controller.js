import {
  createRecoveryCheckout,
} from "../services/razorpay-recovery.service.js";

import {
  verifyRecoveryPayment,
} from "../services/razorpay-verification.service.js";

import {
  createDemoRecoveryCase,
} from "../services/recovery.service.js";

async function createCheckout(
  req,
  res,
  next
) {
  try {
    const result =
      await createRecoveryCheckout(
        req.params.id
      );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyPayment(
  req,
  res,
  next
) {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    const result =
      await verifyRecoveryPayment({
        recoveryCaseId:
          req.params.id,

        razorpayPaymentId:
          razorpay_payment_id,

        razorpayOrderId:
          razorpay_order_id,

        razorpaySignature:
          razorpay_signature,
      });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}


async function createDemoRecovery(
  req,
  res,
  next
) {
  try {
    const result =
      await createDemoRecoveryCase();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createCheckout,
  verifyPayment,
  createDemoRecovery,
};