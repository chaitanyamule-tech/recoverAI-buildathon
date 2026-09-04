import "dotenv/config";
import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;
const model =
  process.env.OPENROUTER_MODEL ||
  "openai/gpt-oss-120b:free";

if (!apiKey) {
  throw new Error(
    "OPENROUTER_API_KEY is not configured in apps/api/.env"
  );
}

const client = new OpenAI({
  apiKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "RecoverAI",
  },
});

async function main() {
  console.log("🔌 Testing OpenRouter...");
  console.log(`🤖 Model: ${model}`);

  const response =
    await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are RecoverAI. Answer clearly and briefly.",
        },
        {
          role: "user",
          content:
            "Reply with exactly: RecoverAI OpenRouter connection successful.",
        },
      ],
      temperature: 0,
    });

  const output =
    response.choices?.[0]?.message?.content;

  if (!output) {
    throw new Error(
      "OpenRouter returned an empty response."
    );
  }

  console.log("\n✅ Response:");
  console.log(output);
}

main().catch((error) => {
  console.error("\n❌ OpenRouter API test failed:");
  console.error(
    error?.response?.data ||
      error?.message ||
      error
  );

  process.exit(1);
});