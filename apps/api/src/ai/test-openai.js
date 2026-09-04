import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const response = await client.responses.create({
    model: "gpt-5-mini",
    input: "Reply with exactly: RecoverAI API connection successful.",
  });

  console.log(response.output_text);
}

main().catch((error) => {
  console.error("OpenAI API test failed:");
  console.error(error.message);
  process.exit(1);
});