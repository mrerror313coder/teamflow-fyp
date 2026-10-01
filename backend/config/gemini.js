const { GoogleGenerativeAI } = require('@google/generative-ai');

let geminiModel = null;
let genAI = null;

const initGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('⚠️ GEMINI_API_KEY not configured. AI will run in mock/smart fallback mode.');
    return null;
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-2.5-flash or gemini-2.0-flash (free tier)
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log(' Google Gemini AI initialized successfully');
    return geminiModel;
  } catch (error) {
    console.error('⚠️ Failed to initialize Gemini AI:', error.message);
    return null;
  }
};

const getGeminiModel = () => {
  if (!geminiModel && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    return initGemini();
  }
  return geminiModel;
};

module.exports = {
  initGemini,
  getGeminiModel,
};
