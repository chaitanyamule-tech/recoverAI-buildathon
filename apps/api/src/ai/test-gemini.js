import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config({
  path: new URL("../../.env", import.meta.url),
});

const apiKey = process.env.GEMINI_API_KEY;
const model =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is not configured in apps/api/.env"
  );
}

const ai = new GoogleGenAI({
  apiKey,
});

async function main() {
  console.log("🔌 Testing Gemini API...");
  console.log(`🤖 Model: ${model}`);

  const response = await ai.models.generateContent({
    model,
    contents:
      "Reply with exactly: RecoverAI Gemini connection successful.",
  });

  console.log("\n✅ Response:");
  console.log(response.text);
}

main().catch((error) => {
  console.error("\n❌ Gemini API test failed:");
  console.error(error?.message || error);

  process.exit(1);
});