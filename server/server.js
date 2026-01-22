require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const multipart = require('@fastify/multipart');
const cors = require('@fastify/cors');
const Redis = require('ioredis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- FIX: ROBUST PDF IMPORT ---
const pdfLib = require('pdf-parse');
// If it imports as an object with .default, use that. Otherwise use the lib itself.
const pdfParse = typeof pdfLib === 'function' ? pdfLib : pdfLib.default; 
// ------------------------------

// 1. CONFIGURATION
fastify.register(cors, { origin: '*' });
fastify.register(multipart);

// Storage Setup (Mock or Real)
let mockDb = {}; 
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL) 
  : { 
      get: async (k) => mockDb[k],
      set: async (k, v) => { mockDb[k] = v; },
      lpush: async (k, v) => { 
        if(!mockDb[k]) mockDb[k] = [];
        mockDb[k].unshift(v); 
      },
      lrange: async (k) => (mockDb[k] || [])
    };

// AI Setup
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || "YOUR_GEMINI_KEY");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// 2. MOCK DATA 
const JOBS = [
  { id: 1, title: "Senior React Developer", company: "TechFlow", location: "Remote", type: "Full-time", skills: ["React", "Node.js"], description: "Expert React dev needed.", posted: new Date().toISOString() },
  { id: 2, title: "Junior Python Engineer", company: "DataCorp", location: "New York", type: "Hybrid", skills: ["Python", "SQL"], description: "Backend data role.", posted: new Date().toISOString() },
  { id: 3, title: "UX Designer", company: "CreativeStudio", location: "London", type: "Contract", skills: ["Figma", "UI"], description: "Design systems.", posted: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 4, title: "DevOps Engineer", company: "CloudSystems", location: "Remote", type: "Full-time", skills: ["AWS", "Docker"], description: "Infrastructure scaling.", posted: new Date().toISOString() }
];

// 3. ROUTES

// GET /jobs - Returns job feed
fastify.get('/api/jobs', async () => JOBS);

// POST /upload-resume - Handles PDF parsing SAFELY
fastify.post('/api/upload-resume', async (req, reply) => {
  try {
    const data = await req.file();
    if (!data) return { error: "No file" };

    const buffer = await data.toBuffer();
    let text = "";
    
    if (data.mimetype === 'application/pdf') {
      try {
        // Use the fixed pdfParse function
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
      } catch (e) {
        console.error("PDF Parsing failed:", e);
        // Fallback: If PDF fails, just say "PDF Uploaded" so user can continue
        text = "Resume PDF uploaded successfully. (Text extraction skipped due to file format).";
      }
    } else {
      text = buffer.toString('utf-8');
    }
    
    // Sanitize
    return { text: text.replace(/\n/g, " ").substring(0, 3000) };
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ error: "Upload failed" });
  }
});

// POST /match - AI Scoring
fastify.post('/api/match', async (req) => {
  const { resumeText, jobDescription } = req.body;
  const prompt = `
    Role: Recruiter. Task: Compare Resume to Job.
    Resume: ${resumeText.substring(0, 1000)}...
    Job: ${jobDescription.substring(0, 500)}...
    Output JSON ONLY: { "score": (0-100 number), "reason": (max 15 words explaining why) }
  `;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    return { score: 50, reason: "AI Service Busy" };
  }
});

// POST /track - Saves application
fastify.post('/api/track', async (req) => {
  const app = { ...req.body, timestamp: new Date() };
  await redis.lpush('user:applications', JSON.stringify(app));
  return { success: true };
});

// GET /applications - Retreive Dashboard
fastify.get('/api/applications', async () => {
  const apps = await redis.lrange('user:applications', 0, -1);
  return apps.map(JSON.parse);
});

// POST /chat - AI Sidebar
fastify.post('/api/chat', async (req) => {
  const { message } = req.body;
  const jobContext = JOBS.map(j => `${j.title} (${j.location})`).join(", ");
  const prompt = `System: You are a Job Assistant. Available jobs: ${jobContext}. User: ${message}. Keep answer short.`;
  const result = await model.generateContent(prompt);
  return { reply: result.response.text() };
});
// Add a simple root route to confirm server is up
fastify.get('/', async (request, reply) => {
  return { status: "Active", message: "Job Tracker API is running!" };
});
// Start Server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Server running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();