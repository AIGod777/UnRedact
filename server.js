import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  app.post('/api/analyze', async (req, res) => {
    try {
      const { base64, prompt } = req.body;

      if (!base64 || !prompt) {
        return res.status(400).json({ error: { message: 'Missing base64 or prompt' } });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: [
          {
            inlineData: {
              data: base64,
              mimeType: 'application/pdf',
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reconstructedText: { type: Type.STRING },
              redactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    text: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    method: { type: Type.STRING },
                    alternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
                    explanation: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err) {
      console.error('API Error:', err);
      res.status(500).json({ error: { message: err.message || 'Internal server error' } });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
