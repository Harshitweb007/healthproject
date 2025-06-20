import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config(); // Load .env

const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API key from .env
const API_KEY = process.env.API_KEY || 'AIzaSyDqdR8Ec-R_bb-mrnCmoaS-dhqoZ9CmxSk';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Warn if key is missing
if (!API_KEY) {
  console.error('❌ API_KEY is missing! Set it in .env or Render environment settings.');
}

// Store conversations
const userConversations = new Map();

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, userId = 'guest' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const isNewConversation = !userConversations.has(userId);
    if (isNewConversation) userConversations.set(userId, true);

    const prompt = `
You are Medinova, a compassionate and knowledgeable AI Doctor...

${isNewConversation 
  ? 'This is a new conversation. Greet the user warmly and express your readiness to assist with medical advice.' 
  : 'This is an ongoing conversation. Provide specific and actionable suggestions based on the current symptoms.'}

User: ${message}
`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data, null, 2)); // optional debug log

    const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure.";

    res.json({ reply: botReply });

  } catch (error) {
    console.error('❌ Request Error:', error.message);
    res.status(500).json({ reply: "Sorry, something went wrong!" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
