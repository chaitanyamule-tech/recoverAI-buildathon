import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const model =
  process.env.GEMINI_MODEL || "gemini-3.6-flash";

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is not configured in apps/api/.env"
  );
}

const ai = new GoogleGenAI({
  apiKey,
});

async function generateRecoveryDecision(prompt) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return response.text;
}

export {
  ai,
  model,
  generateRecoveryDecision,
};