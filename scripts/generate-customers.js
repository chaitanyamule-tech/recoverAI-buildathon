import prisma from "../apps/api/src/lib/prisma.js";

const TOTAL_CUSTOMERS = 500;

const CUSTOMER_PROFILES = {
  HIGHLY_RELIABLE: {
    weight: 0.15,
    successRate: [0.94, 0.99],
    transactionRange: [15, 35],
    spendRange: [75000, 300000],
  },

  RELIABLE: {
    weight: 0.25,
    successRate: [0.85, 0.94],
    transactionRange: [12, 30],
    spendRange: [40000, 180000],
  },

  NORMAL: {
    weight: 0.30,
    successRate: [0.70, 0.85],
    transactionRange: [8, 25],
    spendRange: [15000, 100000],
  },

  UNSTABLE: {
    weight: 0.12,
    successRate: [0.50, 0.70],
    transactionRange: [8, 25],
    spendRange: [10000, 75000],
  },

  HIGH_FAILURE: {
    weight: 0.08,
    successRate: [0.25, 0.50],
    transactionRange: [8, 22],
    spendRange: [5000, 50000],
  },

  HIGH_VALUE: {
    weight: 0.07,
    successRate: [0.80, 0.95],
    transactionRange: [8, 20],
    spendRange: [200000, 1000000],
  },

  NEW_CUSTOMER: {
    weight: 0.03,
    successRate: [0.60, 0.90],
    transactionRange: [0, 4],
    spendRange: [0, 20000],
  },
};

const FIRST_NAMES = [
  "Aarav",
  "Aditi",
  "Aditya",
  "Akash",
  "Akshay",
  "Ananya",
  "Aniket",
  "Anjali",
  "Arjun",
  "Aryan",
  "Ashwin",
  "Avni",
  "Chaitanya",
  "Dev",
  "Diya",
  "Isha",
  "Ishaan",
  "Karan",
  "Kavya",
  "Krishna",
  "Manav",
  "Meera",
  "Neha",
  "Nikhil",
  "Nisha",
  "Pranav",
  "Priya",
  "Rahul",
  "Rhea",
  "Rohan",
  "Sahil",
  "Sakshi",
  "Sameer",
  "Shreya",
  "Sneha",
  "Tanvi",
  "Varun",
  "Vikram",
  "Yash",
];

const LAST_NAMES = [
  "Mehta",
  "Sharma",
  "Patil",
  "Desai",
  "Kulkarni",
  "Joshi",
  "Shah",
  "Nair",
  "Mule",
  "Pawar",
  "Jadhav",
  "Gupta",
  "Verma",
  "Singh",
  "Khan",
  "Reddy",
  "Iyer",
  "Naik",
  "Chavan",
  "Bhosale",
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInteger(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function weightedChoice(weightMap) {
  const random = Math.random();

  let cumulative = 0;

  for (const [key, config] of Object.entries(weightMap)) {
    cumulative += config.weight;

    if (random <= cumulative) {
      return key;
    }
  }

  return Object.keys(weightMap)[0];
}

function generateName() {
  return `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;
}

function generatePhone(index) {
  return `+9198${String(10000000 + index).slice(-8)}`;
}

function generateEmail(name, index) {
  const normalizedName = name
    .toLowerCase()
    .replace(/\s+/g, ".");

  return `${normalizedName}.${index}@synthetic.recoverai.dev`;
}

function generateCustomer(profileName, index) {
  const profile = CUSTOMER_PROFILES[profileName];

  const name = generateName();

  const totalPayments = randomInteger(
    profile.transactionRange[0],
    profile.transactionRange[1]
  );

  const successRate = randomBetween(
    profile.successRate[0],
    profile.successRate[1]
  );

  const successfulPayments = Math.round(
    totalPayments * successRate
  );

  const failedPayments =
    totalPayments - successfulPayments;

  const totalSpent = randomBetween(
    profile.spendRange[0],
    profile.spendRange[1]
  );

  return {
    name,
    email: generateEmail(name, index),
    phone: generatePhone(index),

    totalPayments,
    successfulPayments,
    failedPayments,

    totalSpent: Number(totalSpent.toFixed(2)),

    metadata: {
      source: "synthetic_customer_generator",
      datasetVersion: "v1",
      profile: profileName,
    },
  };
}

async function main() {
  console.log("🚀 Starting customer generation...");

  const merchant = await prisma.merchant.findUnique({
    where: {
      email: "demo@recoverai.dev",
    },
  });

  if (!merchant) {
    throw new Error(
      "Demo merchant not found. Run `npm run seed` first."
    );
  }

  console.log(`✅ Merchant found: ${merchant.name}`);

  const generatedCustomers = [];

  const profileCounts = {};

  for (let i = 0; i < TOTAL_CUSTOMERS; i++) {
    const profileName = weightedChoice(
      CUSTOMER_PROFILES
    );

    profileCounts[profileName] =
      (profileCounts[profileName] || 0) + 1;

    const customer = generateCustomer(
      profileName,
      i + 1
    );

    generatedCustomers.push({
      merchantId: merchant.id,
      ...customer,
    });
  }

  console.log(
    `📦 Generated ${generatedCustomers.length} customer profiles.`
  );

  const BATCH_SIZE = 100;

  for (
    let i = 0;
    i < generatedCustomers.length;
    i += BATCH_SIZE
  ) {
    const batch = generatedCustomers.slice(
      i,
      i + BATCH_SIZE
    );

    await prisma.customer.createMany({
      data: batch,
    });

    console.log(
      `✅ Inserted ${Math.min(
        i + BATCH_SIZE,
        generatedCustomers.length
      )}/${generatedCustomers.length}`
    );
  }

  console.log("\n📊 Profile distribution:");

  for (const [profile, count] of Object.entries(
    profileCounts
  )) {
    console.log(`   ${profile}: ${count}`);
  }

  const totalCustomers = await prisma.customer.count({
    where: {
      merchantId: merchant.id,
    },
  });

  console.log(
    `\n👥 Total customers for merchant: ${totalCustomers}`
  );

  console.log(
    "\n✅ Customer generation completed successfully."
  );
}

main()
  .catch((error) => {
    console.error(
      "❌ Customer generation failed:"
    );
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });