# RecoverAI

### AI-Powered Revenue Recovery Agent for Failed Payments

RecoverAI is an AI-powered revenue recovery system that identifies revenue at risk from failed payments, diagnoses why a payment failed, estimates recovery potential, recommends the right intervention, enforces deterministic recovery policies, executes approved recovery through Razorpay, verifies the outcome, and measures the revenue recovered.

> **AI recommends. Deterministic policy decides. The executor executes.**

---

## 🏆 Buildathon Track

**Razorpay Buildathon — Track 03: AI Revenue Recovery**

RecoverAI is designed around the core revenue-recovery problem:

> When a payment fails, what should happen next to maximize recoverable revenue while avoiding unnecessary retries, customer friction, and uncontrolled automation?

Instead of blindly retrying every failed payment, RecoverAI treats recovery as a decision-making problem.

---

## 🚨 Problem

A failed payment is not necessarily lost revenue.

Different failures require different interventions:

- A network timeout may be transient and worth retrying.
- Insufficient funds may require a reminder instead of an immediate retry.
- A UPI decline may justify an alternative payment method.
- A high-value transaction may require manual review.
- Repeated failures should eventually stop rather than endlessly retry.
- Checkout abandonment requires a different recovery strategy from a bank failure.

A simple "retry everything" strategy treats all failures the same way, wasting recovery attempts on unrecoverable cases while under-prioritizing high-value, high-probability ones. RecoverAI addresses this by turning each failed payment into a structured decision.

## 💡 Solution

RecoverAI combines deterministic financial logic with an AI planning agent.

The system evaluates each failed transaction using:

- Customer payment history
- Transaction amount
- Payment method
- Failure reason
- Attempt number
- Recovery probability
- Expected recovery
- Merchant policy

It then recommends the most appropriate intervention.

Supported recovery actions include:

- `RETRY_PAYMENT`
- `SEND_REMINDER`
- `OFFER_ALTERNATIVE_METHOD`
- `WAIT`
- `ESCALATE`
- `STOP`

The AI recommendation never directly executes a payment. Every financial action passes through the deterministic Policy Engine.

## 🧠 Core Architecture

```
                        ┌─────────────────────┐
                        │     Transaction      │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │     Risk Engine      │
                        │                      │
                        │ Risk Score           │
                        │ Recovery Probability │
                        │ Expected Recovery    │
                        │ Priority             │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  Diagnosis Engine    │
                        │                      │
                        │ Failure Category     │
                        │ Confidence           │
                        │ Suggested Action     │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │     Gemini AI        │
                        │   Recovery Agent     │
                        │                      │
                        │ Recommendation       │
                        │ Reasoning            │
                        │ Evidence             │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │    Policy Engine     │
                        │                      │
                        │ Retry Limits         │
                        │ Amount Limits        │
                        │ Customer Limits      │
                        │ Cooldown Rules       │
                        └──────────┬───────────┘
                                   │
                      ┌────────────┴────────────┐
                      │                         │
                   APPROVED                  BLOCKED
                      │                         │
                      ▼                         ▼
             ┌─────────────────┐         WAIT / ESCALATE /
             │     Recovery     │              STOP
             │     Executor     │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │     Razorpay     │
             │     Checkout     │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │  Verification    │
             │   + Webhook      │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Audit + Metrics  │
             └─────────────────┘
```

## 🔐 Key Architectural Principle

RecoverAI separates AI reasoning from financial execution.

```
                 AI Agent
                    │
                    │ recommends
                    ▼
              Policy Engine
                    │
                    │ approves / rejects
                    ▼
                Executor
                    │
                    │ executes
                    ▼
                Razorpay
```

This prevents an AI model from independently controlling financial execution.

## 🧩 Main Components

### 1. Risk Engine

The Risk Engine estimates how attractive a transaction is for recovery.

It considers:

- Customer reliability
- Failure recoverability
- Attempt number
- Payment method
- Transaction value
- Contextual factors

It produces:

- Risk Score
- Recovery Probability
- Expected Recovery
- Priority

Example:

```
Risk Score:            86
Recovery Probability:  86.04%
Expected Recovery:     ₹5,853.51
Priority:              HIGH_PRIORITY
```

### 2. Diagnosis Engine

The Diagnosis Engine determines the likely cause of the failure.

Supported categories include:

- `TRANSIENT_NETWORK_FAILURE`
- `PAYMENT_METHOD_DECLINE`
- `REPEATED_FAILURE`
- `HIGH_VALUE_RECOVERY_CASE`
- `CHECKOUT_ABANDONMENT`

Each diagnosis includes:

- Category
- Confidence
- Severity
- Explanation
- Suggested action
- Evidence

Example:

```
Category:        TRANSIENT_NETWORK_FAILURE
Confidence:       91%
Suggested Action: RETRY_PAYMENT
Evidence:
  failureReason = NETWORK_TIMEOUT
  attemptNumber = 1
```

### 🤖 3. Gemini Recovery Agent

Gemini acts as the recovery planning agent.

It receives structured transaction and policy context and recommends an action.

Example:

```json
{
  "action": "RETRY_PAYMENT",
  "confidence": 0.91,
  "reasoning": "The transaction failed on its first attempt due to a transient network timeout...",
  "evidence": [
    "failureReason = NETWORK_TIMEOUT",
    "attemptNumber = 1"
  ]
}
```

The AI is explicitly instructed to:

- Recommend, not execute
- Respect policy boundaries
- Avoid inventing facts
- Choose only supported actions
- Provide reasoning and evidence

### 🛡️ 4. Policy Engine

The Policy Engine is deterministic. It validates whether the requested action is allowed.

Current policy concepts include:

- Maximum automatic retry attempts
- Maximum automatic recovery amount
- Manual approval threshold
- Maximum customer actions per day
- Cooldown period

Example:

```
AI Recommendation: RETRY_PAYMENT
Transaction:       ₹11,563.01
Policy:            Automatic recovery limit = ₹10,000
Final Decision:    WAIT / ESCALATE
```

This guarantees that an AI recommendation cannot bypass business constraints.

### ⚙️ 5. Recovery Executor

The Executor performs approved actions and maintains the recovery lifecycle.

The system distinguishes between `INITIAL` and `RETRY` payment attempts.

Example:

```
#1 INITIAL FAILED
        ↓
#2 RETRY CAPTURED
```

This provides a clear recovery history for each transaction.

### 💳 6. Razorpay Integration

RecoverAI integrates with Razorpay Test Mode for payment recovery.

**Recovery checkout flow:**

```
Approved RecoveryCase
        ↓
Create Razorpay Recovery Order
        ↓
Open Razorpay Checkout
        ↓
Customer completes payment
        ↓
Razorpay returns payment response
        ↓
Server-side signature verification
        ↓
Payment validation
        ↓
Recovery state update
```

The application verifies:

- Razorpay order ID
- Payment ID
- Payment signature
- Payment-to-order relationship
- Payment status
- Payment amount

### 🔔 7. Webhook Processing

RecoverAI supports Razorpay webhook processing.

**Webhook flow:**

```
Razorpay
   ↓
payment.captured
   ↓
Signature Validation
   ↓
Event ID Check
   ↓
Idempotency
   ↓
Recovery Update
   ↓
Payment Attempt
   ↓
Audit Log
```

**Idempotency:** the same webhook event can be delivered more than once without processing the recovery twice.

Example test:

```
First event:
  processed = true

Same event again:
  processed = false
  duplicate = true
```

This prevents duplicate recovery state transitions.

### ✅ 8. Payment Verification

The browser payment response is not treated as the final source of truth. The backend performs server-side verification before marking the recovery successful.

The verification lifecycle is:

```
Checkout Success
      ↓
Receive payment ID
      ↓
Receive order ID
      ↓
Receive signature
      ↓
Verify signature
      ↓
Validate payment/order relationship
      ↓
Validate captured status
      ↓
Validate amount
      ↓
Mark transaction recovered
```

### 📜 9. Audit Trail

Important recovery events are recorded, including:

- `RECOVERY_PLANNED`
- `RECOVERY_PAYMENT_VERIFIED`
- `RAZORPAY_RECOVERY_ORDER_CREATED`
- `WEBHOOK_RECEIVED`
- `RECOVERY_COMPLETED`

Each event can capture details such as:

- Recovery case
- Merchant
- Action
- Status
- Risk score
- Diagnosis
- Policy result
- Final action
- Timestamps

This provides a traceable recovery lifecycle.

## 🧪 Evaluation Framework

RecoverAI includes a batch evaluation system designed to measure recovery impact across a synthetic benchmark.

The benchmark contains **10,000 synthetic transactions**. Each transaction contains ground-truth information such as:

- Expected action
- Recoverable
- Simulated recovery probability
- Simulated recoverable amount
- Reason

The ground truth is used for post-decision evaluation, and is not exposed as direct instructions to the AI during decision making.

### 📊 Baseline Strategy

The benchmark compares RecoverAI against a simpler baseline strategy. The baseline uses basic recovery rules without the full RecoverAI decision pipeline.

```
Failed Payment
      ↓
Basic Retry Logic
      ↓
High-Value Escalation
      ↓
Stop
```

This establishes a reference point for measuring improvement.

### 🚀 RecoverAI Strategy

```
Risk
  ↓
Diagnosis
  ↓
AI Recommendation
  ↓
Policy Enforcement
  ↓
Recovery Decision
```

Both strategies are scored against the same synthetic ground truth.

### 💰 Evaluation Results

> **Important:** the following results come from a synthetic benchmark and simulated recovery outcomes. They are not real customer payment results.

**10,000 transactions**

| Metric | Baseline | RecoverAI |
|---|---|---|
| Transactions Evaluated | 10,000 | 10,000 |
| Revenue at Risk | ₹1,48,73,374.49 | ₹1,48,73,374.49 |
| Recovered Revenue | ₹34,36,625.74 | ₹38,95,061.30 |
| Recovery Rate | 23.11% | 26.19% |
| Successful Recoveries | 555 | 718 |
| Correct Decisions | 811 | 971 |
| Escalations | 21 | 22 |
| Stopped Cases | 264 | 260 |

**Revenue impact**

- Baseline recovered: ₹34,36,625.74
- RecoverAI recovered: ₹38,95,061.30
- Additional revenue: ₹4,58,435.56
- Recovery lift: **+13.34%**

**Decision quality**

- Baseline correct decisions: 811
- RecoverAI correct decisions: 971
- Improvement: **+160 correct decisions**

### 📈 Why the Evaluation Matters

The objective is not simply to increase the number of retries. RecoverAI attempts to make better recovery decisions by considering:

- Failure reason
- Customer reliability
- Transaction value
- Payment method
- Attempt history
- Recovery probability
- Expected recovery
- Merchant policy

This allows different failure scenarios to receive different interventions.

### 🎯 Example Decision Scenarios

**Network timeout**

```
NETWORK_TIMEOUT → Transient failure → RETRY_PAYMENT
```

**Insufficient funds**

```
INSUFFICIENT_FUNDS → Customer may need to add funds → SEND_REMINDER
```

**UPI decline**

```
UPI_DECLINED → Payment method problem → OFFER_ALTERNATIVE_METHOD
```

**High-value transaction**

```
High Transaction Amount → Manual risk boundary → ESCALATE
```

**Repeated failure**

```
Multiple Failed Attempts → Diminishing recovery value → STOP
```

## 🧯 Failure-Safe AI Fallback

RecoverAI includes a deterministic fallback for temporary AI model availability failures.

If Gemini is unavailable:

```
Gemini
  ↓
Temporary Model Failure
  ↓
Deterministic Diagnosis Fallback
  ↓
Policy Engine
  ↓
Safe Continuation
```

Fallback decisions are explicitly labeled `DETERMINISTIC_FALLBACK`. The system never falsely claims that an AI response was generated.

## 🖥️ Application

RecoverAI includes two primary frontend experiences.

### Live Recovery — `/recovery-test`

This demonstrates the complete recovery flow:

```
Analyze Failed Payment
        ↓
Risk Assessment
        ↓
Diagnosis
        ↓
AI Recommendation
        ↓
Policy Decision
        ↓
Recover Payment
        ↓
Razorpay Checkout
        ↓
Payment Verification
        ↓
Recovery Completed
```

### Revenue Analytics — `/dashboard`

The dashboard displays:

- Revenue at risk
- Baseline recovery
- RecoverAI recovery
- Additional recovered revenue
- Recovery lift
- Successful recoveries
- Decision accuracy
- Escalations
- Stopped cases
- Unnecessary interventions
- Incorrect interventions
- Decision breakdown

## 🧪 Example Live Recovery

```
Transaction Amount:  ₹6,803.58
Risk Score:          86
Recovery Probability: 86.04%
Expected Recovery:   ₹5,853.51
Diagnosis:           TRANSIENT_NETWORK_FAILURE
AI Recommendation:   RETRY_PAYMENT
AI Confidence:       91%
Policy:              APPROVED
Final Action:        RETRY_PAYMENT
```

The approved recovery is then executed through Razorpay Test Mode.

## 🔄 End-to-End Demo Flow

1. Open Live Recovery
2. Analyze failed payment
3. Risk score calculated
4. Failure diagnosed
5. Gemini recommends a recovery action
6. Policy validates the recommendation
7. Recovery case approved
8. Razorpay recovery order created
9. Razorpay Checkout opens
10. Test payment completed
11. Server verifies payment
12. Webhook processed
13. RecoveryCase becomes `RECOVERED`
14. Recovered amount displayed

## 🗂️ Project Structure

```
recoverAI-buildathon/
│
├── apps/
│   │
│   ├── api/
│   │   ├── prisma/
│   │   ├── scripts/
│   │   └── src/
│   │       │
│   │       ├── ai/
│   │       │   ├── agent.js
│   │       │   ├── prompts.js
│   │       │   ├── provider.js
│   │       │   └── schemas.js
│   │       │
│   │       ├── controllers/
│   │       │
│   │       ├── integrations/
│   │       │   └── razorpay/
│   │       │
│   │       ├── lib/
│   │       │
│   │       ├── routes/
│   │       │
│   │       ├── services/
│   │       │   ├── diagnosis.service.js
│   │       │   ├── evaluation.service.js
│   │       │   ├── executor.service.js
│   │       │   ├── policy.service.js
│   │       │   ├── recovery.service.js
│   │       │   ├── risk.service.js
│   │       │   └── razorpay-*.service.js
│   │       │
│   │       └── server.js
│   │
│   └── web/
│       └── src/
│           │
│           ├── app/
│           │   ├── dashboard/
│           │   ├── recovery-test/
│           │   ├── globals.css
│           │   ├── layout.js
│           │   └── page.js
│           │
│           └── components/
│               └── recovery/
│
├── experiments/
│   └── ground-truth/
│
├── scripts/
│   └── run-evaluation.js
│
├── package.json
├── .gitignore
└── README.md
```

## 🛠️ Tech Stack

**Frontend**
- Next.js
- React
- JavaScript
- Tailwind CSS

**Backend**
- Node.js
- Express.js
- JavaScript

**Database**
- PostgreSQL
- Prisma ORM

**AI**
- Google Gemini
- `@google/genai`

**Payments**
- Razorpay Test Mode
- Razorpay Checkout
- Razorpay Webhooks

## 🔐 Environment Variables

The application requires environment configuration.

### API

Create `apps/api/.env`:

```
DATABASE_URL=
GEMINI_API_KEY=
GEMINI_MODEL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
FRONTEND_URL=http://localhost:3000
PORT=5000
```

### Web

Create `apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

> Never commit real credentials or secrets to GitHub.

## ⚙️ Local Installation

### Clone the repository

```bash
git clone https://github.com/chaitanyamule-tech/recoverAI-buildathon.git
cd recoverAI-buildathon
```

### Install API dependencies

```bash
cd apps/api
npm install
```

### Install web dependencies

```bash
cd ../web
npm install
```

## 🗄️ Database Setup

Make sure PostgreSQL is running.

From `apps/api`, run:

```bash
npx prisma generate
npx prisma migrate dev
```

Seed the database:

```bash
npm run seed
```

## ▶️ Run the Backend

From `apps/api`, run:

```bash
npm run dev
```

The backend runs on `http://localhost:5000`.

Health check: `http://localhost:5000/health`

## ▶️ Run the Frontend

From `apps/web`, run:

```bash
npm run dev
```

The frontend runs on `http://localhost:3000`.

## 🧪 Run the Evaluation

From the appropriate project directory containing the evaluation runner:

```bash
node scripts/run-evaluation.js
```

The evaluation reports:

- Total transactions
- Total revenue
- Revenue at risk
- Baseline recovery
- RecoverAI recovery
- Recovery rate
- Successful recoveries
- Correct decisions
- Unnecessary interventions
- Incorrect interventions
- Escalations
- Stopped cases
- Recovery lift

## 🔌 API Endpoints

**Health Check**
```
GET /health
```

**Create Demo Recovery Case**
```
POST /api/recovery/demo
```
Creates an eligible failed transaction recovery case and runs Risk → Diagnosis → AI → Policy. The demo uses `LIVE_TEST` execution mode, so the payment is not automatically executed.

**Create Recovery Checkout**
```
POST /api/recovery/:id/checkout
```
Creates a Razorpay recovery order for an approved recovery action.

**Verify Recovery Payment**
```
POST /api/recovery/:id/verify
```
Verifies the Razorpay payment and updates recovery state.

**Evaluation**
```
GET /api/evaluation
```
Returns the full evaluation result.

**Evaluation Summary**
```
GET /api/evaluation/summary
```
Returns the metrics required by the dashboard.

**Razorpay Webhook**
```
POST /api/webhooks/razorpay
```
Processes Razorpay webhook events with signature validation and idempotency.

## 🔒 Security and Control Considerations

RecoverAI uses several layers of bounded automation.

- **Deterministic Policy Enforcement** — AI recommendations are always validated before execution.
- **Payment Verification** — successful frontend checkout responses are not trusted on their own.
- **Webhook Signature Validation** — webhook requests are validated before processing.
- **Webhook Idempotency** — repeated webhook events do not result in duplicate processing.
- **Retry Limits** — repeated recovery attempts are bounded.
- **Amount Limits** — automatic recovery is limited by configured policy thresholds.
- **Manual Escalation** — high-value or restricted cases can be escalated rather than automatically executed.
- **Auditability** — important actions are recorded for traceability.

## 📌 Design Principles

**AI recommends, policy decides**
The AI layer focuses on reasoning and intervention selection. The deterministic policy layer controls financial permissions.

**Financial calculations remain deterministic**
Risk calculations, thresholds, limits, and recovery accounting are implemented as deterministic application logic.

**Recovery must be measurable**
A recovery system should not only generate actions — it should answer:

- How much revenue was at risk?
- How much did the baseline recover?
- How much did RecoverAI recover?
- How much additional revenue was recovered?
- What was the recovery lift?

**Recovery must know when to stop**
RecoverAI can intentionally decide `WAIT`, `ESCALATE`, or `STOP` rather than continuously retrying.

## 📈 Product Value

RecoverAI helps merchants move from:

```
Failed Payment → Generic Retry
```

to:

```
Failed Payment
      ↓
Understand Why
      ↓
Estimate Recovery Value
      ↓
Choose Appropriate Intervention
      ↓
Apply Policy
      ↓
Recover
      ↓
Verify
      ↓
Measure
```

The system turns payment recovery into a closed-loop revenue optimization workflow.

## 🚀 Future Extensions

The current prototype can be extended with:

- Merchant-specific policies
- Real-time payment degradation detection
- Historical payment-method intelligence
- WhatsApp recovery messaging
- Hinglish voice recovery
- Promise-to-pay workflows
- B2B receivable recovery
- Subscription recovery
- Mandate retry workflows
- Real-time recovery analytics
- Production-grade webhook infrastructure
- Larger-scale recovery experiments
- Learning from historical intervention outcomes

## 👨‍💻 Author

**Chaitanya Mule**

- GitHub: [github.com/chaitanyamule-tech](https://github.com/chaitanyamule-tech)
- Project Repository: [recoverAI-buildathon](https://github.com/chaitanyamule-tech/recoverAI-buildathon)

## 📄 Disclaimer

RecoverAI's evaluation results are based on synthetic transaction data and simulated recovery outcomes. The reported recovered revenue and recovery lift are benchmark results and do not represent real customer payment revenue.

Razorpay payments used for the demonstration are performed in Test Mode.
