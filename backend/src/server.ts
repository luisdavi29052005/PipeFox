import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import accounts from './api/accounts';
import workflows from './api/workflows';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/accounts', accounts);
app.use('/api/workflows', workflows);

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
