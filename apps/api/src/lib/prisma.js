import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  PaymentMethod,
  TransactionStatus,
} from "@prisma/client";

dotenv.config({
  path: new URL("../../.env", import.meta.url),
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not defined. Check apps/api/.env"
  );
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

export {
  prisma,
  PaymentMethod,
  TransactionStatus,
};

export default prisma;