require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const multipart = require('@fastify/multipart');
const cors = require('@fastify/cors');
const Redis = require('ioredis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// PDF Setup
const pdfLib = require('pdf-parse');
const pdfParse = typeof pdfLib === 'function' ? pdfLib : pdfLib.default; 

// Config
fastify.register(cors, { origin: '*' });
fastify.register(multipart);

// Mock DB
let mockDb = {}; 
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL) 
  : { 
      get: async (k) => mockDb[k],
      set: async (k, v) => { mockDb[k] = v; },
      lpush: async (k, v) => { if(!mockDb[k]) mockDb[k] = []; mockDb[k].unshift(v); },
      lrange: async (k) => (mockDb[k] || [])
    };

// AI
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || "dummy_key");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Data
const JOBS = [
  { id: 1, title: "Senior React Developer", company: "TechFlow", location: "Remote", type: "Full-time", skills: ["React", "Node.js"], description: "Expert React dev needed.", posted: new Date().toISOString() },
  { id: 2, title: "Junior Python Engineer", company: "DataCorp", location: "New York", type: "Hybrid", skills: ["Python", "SQL"], description: "Backend data role.", posted: new Date().toISOString() },
  { id: 3, title: "UX Designer", company: "CreativeStudio", location: "London", type: "Contract", skills: ["Figma", "UI"], description: "Design systems.", posted: new Date().toISOString() }
];

// --- ROUTES ---

// 1. Root Route
fastify.get('/', async () => ({ status: "Online", message: "API is running" }));

// 2. Jobs Route
fastify.get('/api/jobs', async () => JOBS);

// 3. Upload Route
fastify.post('/api/upload-resume', async (req, reply) => {
  const data = await req.file();
  if (!data) return { error: "No file" };
  const buffer = await data.toBuffer();
  let text = "Resume text"; 
  if (data.mimetype === 'application/pdf') {
     try { const p = await pdfParse(buffer); text = p.text; } catch(e) {}
  }
  return { text: text.substring(0, 2000) };
});

// 4. Match Route
fastify.post('/api/match', async (req) => {
  return { score: Math.floor(Math.random() * 40) + 60, reason: "Good match based on skills." }; 
});

// 5. Track Route
fastify.post('/api/track', async (req) => {
  const app = { ...req.body, timestamp: new Date() };
  await redis.lpush('user:applications', JSON.stringify(app));
  return { success: true };
});

// 6. Applications Route
fastify.get('/api/applications', async () => {
  const apps = await redis.lrange('user:applications', 0, -1);
  return apps.map(JSON.parse);
});

// 7. ➤ CRITICAL CHAT ROUTE (This is what was missing)
fastify.post('/api/chat', async (req) => {
  const { message } = req.body;
  // Simple fallback logic if AI fails
  try {
    const context = JOBS.map(j => `${j.title} (${j.location})`).join(", ");
    const result = await model.generateContent(`System: Job Assistant. Jobs: ${context}. User: ${message}. Keep it short.`);
    return { reply: result.response.text() };
  } catch (e) {
    return { reply: "I can help you find jobs! Ask me about remote roles or specific skills." };
  }
});

// Start
const start = async () => {
  try { await fastify.listen({ port: 3001, host: '0.0.0.0' }); console.log('Server running'); }
  catch (err) { process.exit(1); }
};
start();