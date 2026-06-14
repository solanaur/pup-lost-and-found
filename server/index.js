require('dotenv').config();
const { createApp } = require('./app');
const { isGeminiEnabled, geminiModel } = require('./gemini');

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Lost & Found server http://localhost:${PORT}`);
  if (isGeminiEnabled()) {
    console.log(`AI: Gemini (${geminiModel()})`);
  } else if (process.env.OPENAI_API_KEY) {
    console.log('AI: OpenAI');
  } else {
    console.log('AI: off (set GEMINI_API_KEY for free vision — https://aistudio.google.com/apikey)');
  }
});
