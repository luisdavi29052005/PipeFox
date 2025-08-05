import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';

// Routers
import authRouter from './api/auth';
import accountsRouter from './api/accounts';
import workflowsRouter from './api/workflows';

// Carrega variáveis de ambiente
config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Origem permitida do frontend
const ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// Configuração de CORS com credenciais
const corsOptions: cors.CorsOptions = {
origin: ORIGIN,
credentials: true,
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
res.json({
ok: true,
timestamp: new Date().toISOString(),
uptime: process.uptime(),
});
});

// Rotas da API
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/workflows', workflowsRouter);

// Middleware de erro
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
console.error('Unhandled error:', err);
res.status(500).json({ error: 'Internal server error' });
});

// Start
app.listen(PORT, '0.0.0.0', () => {
console.log(🚀 Server running on http://0.0.0.0:${PORT});
console.log(📊 Health check: http://0.0.0.0:${PORT}/health);
});