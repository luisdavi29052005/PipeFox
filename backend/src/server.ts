import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import cookieParser from 'cookie-parser';
import authRouter from './api/auth';
import leadsRouter from './api/leads';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost and Replit domains
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://0.0.0.0:5173',
      'http://0.0.0.0:3000'
    ];
    
    // Allow any replit domain
    if (origin.includes('replit.dev') || origin.includes('repl.co') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(cookieParser());  // <--- ESSENCIAL PARA AUTENTICAÇÃO COM COOKIE!
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Import routes
import accountsRouter from './api/accounts';
import workflowsRouter from './api/workflows';
import workflowNodesRoutes from './api/workflow-nodes.js';

// API routes
app.use('/api/accounts', accountsRouter);
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/workflow-nodes', workflowNodesRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});

export default app;