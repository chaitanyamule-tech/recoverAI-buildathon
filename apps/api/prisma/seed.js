import "dotenv/config";
import prisma from "../src/lib/prisma.js";
import {
  PaymentMethod,
  TransactionStatus,
} from "@prisma/client";

// const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting RecoverAI database seed...");

  // --------------------------------------------------
  // 1. Create / reuse demo merchant
  // --------------------------------------------------

  const merchant = await prisma.merchant.upsert({
    where: {
      email: "demo@recoverai.dev",
    },
    update: {},
    create: {
      name: "RecoverAI Demo Merchant",
      email: "demo@recoverai.dev",
    },
  });

  console.log(`✅ Merchant ready: ${merchant.name}`);

  // --------------------------------------------------
  // 2. Create default recovery policy
  // --------------------------------------------------

  const existingPolicy = await prisma.policy.findFirst({
    where: {
      merchantId: merchant.id,
      name: "Default Recovery Policy",
    },
  });

  const policy =
    existingPolicy ||
    (await prisma.policy.create({
      data: {
        merchantId: merchant.id,
        name: "Default Recovery Policy",
        maxAutomaticRetryAttempts: 2,
        maxAutomaticRecoveryAmount: 10000,
        manualApprovalAmount: 25000,
        maxCustomerActionsPerDay: 3,
        cooldownMinutes: 30,
        active: true,
      },
    }));

  console.log(`✅ Policy ready: ${policy.name}`);

  // --------------------------------------------------
  // 3. Customer profiles
  // --------------------------------------------------

  const customerProfiles = [
    {
      name: "Aarav Mehta",
      email: "aarav@example.com",
      phone: "+919800000001",
      totalPayments: 25,
      successfulPayments: 24,
      failedPayments: 1,
      totalSpent: 125000,
    },
    {
      name: "Priya Sharma",
      email: "priya@example.com",
      phone: "+919800000002",
      totalPayments: 18,
      successfulPayments: 16,
      failedPayments: 2,
      totalSpent: 82000,
    },
    {
      name: "Rohan Patil",
      email: "rohan@example.com",
      phone: "+919800000003",
      totalPayments: 10,
      successfulPayments: 7,
      failedPayments: 3,
      totalSpent: 24500,
    },
    {
      name: "Sneha Kulkarni",
      email: "sneha@example.com",
      phone: "+919800000004",
      totalPayments: 6,
      successfulPayments: 6,
      failedPayments: 0,
      totalSpent: 18500,
    },
    {
      name: "Vikram Joshi",
      email: "vikram@example.com",
      phone: "+919800000005",
      totalPayments: 14,
      successfulPayments: 8,
      failedPayments: 6,
      totalSpent: 34000,
    },
    {
      name: "Ananya Desai",
      email: "ananya@example.com",
      phone: "+919800000006",
      totalPayments: 30,
      successfulPayments: 28,
      failedPayments: 2,
      totalSpent: 210000,
    },
    {
      name: "Karan Shah",
      email: "karan@example.com",
      phone: "+919800000007",
      totalPayments: 4,
      successfulPayments: 2,
      failedPayments: 2,
      totalSpent: 6500,
    },
    {
      name: "Isha Nair",
      email: "isha@example.com",
      phone: "+919800000008",
      totalPayments: 20,
      successfulPayments: 19,
      failedPayments: 1,
      totalSpent: 97000,
    },
  ];

  const customers = [];

 for (const profile of customerProfiles) {
  let customer = await prisma.customer.findFirst({
    where: {
      merchantId: merchant.id,
      email: profile.email,
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        merchantId: merchant.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        totalPayments: profile.totalPayments,
        successfulPayments: profile.successfulPayments,
        failedPayments: profile.failedPayments,
        totalSpent: profile.totalSpent,
      },
    });
  }

  customers.push(customer);
}

  console.log(`✅ Customers ready: ${customers.length}`);

  // --------------------------------------------------
  // 4. Development transactions
  // --------------------------------------------------

  const transactionTemplates = [
    {
      customerIndex: 0,
      amount: 2500,
      paymentMethod: PaymentMethod.UPI,
      status: TransactionStatus.FAILED,
      failureReason: "NETWORK_TIMEOUT",
      description: "Demo failed UPI payment",
    },
    {
      customerIndex: 1,
      amount: 4999,
      paymentMethod: PaymentMethod.CARD,
      status: TransactionStatus.FAILED,
      failureReason: "BANK_ERROR",
      description: "Demo card payment",
    },
    {
      customerIndex: 2,
      amount: 899,
      paymentMethod: PaymentMethod.UPI,
      status: TransactionStatus.CAPTURED,
      failureReason: null,
      description: "Successful demo payment",
    },
    {
      customerIndex: 5,
      amount: 45000,
      paymentMethod: PaymentMethod.CARD,
      status: TransactionStatus.FAILED,
      failureReason: "INSUFFICIENT_FUNDS",
      description: "High-value payment requiring escalation",
    },
    {
      customerIndex: 7,
      amount: 1200,
      paymentMethod: PaymentMethod.UPI,
      status: TransactionStatus.ABANDONED,
      failureReason: "CHECKOUT_ABANDONED",
      description: "Demo checkout abandonment",
    },
  ];

  for (const template of transactionTemplates) {
    const customer = customers[template.customerIndex];

    const externalId = `demo_${customer.id}_${template.amount}_${template.paymentMethod}_${template.description}`;

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        merchantId: merchant.id,
        externalId,
      },
    });

    if (!existingTransaction) {
      await prisma.transaction.create({
        data: {
          merchantId: merchant.id,
          customerId: customer.id,
          externalId,
          amount: template.amount,
          currency: "INR",
          paymentMethod: template.paymentMethod,
          status: template.status,
          failureReason: template.failureReason,
          description: template.description,
          metadata: {
            source: "seed",
            environment: "development",
          },
        },
      });
    }
  }

  console.log("✅ Development transactions ready");

  // --------------------------------------------------
  // 5. Final counts
  // --------------------------------------------------

  const merchantCount = await prisma.merchant.count();
  const customerCount = await prisma.customer.count();
  const transactionCount = await prisma.transaction.count();
  const policyCount = await prisma.policy.count();

  console.log("\n📊 RecoverAI database:");
  console.log(`   Merchants:    ${merchantCount}`);
  console.log(`   Customers:    ${customerCount}`);
  console.log(`   Transactions: ${transactionCount}`);
  console.log(`   Policies:     ${policyCount}`);

  console.log("\n✅ Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });