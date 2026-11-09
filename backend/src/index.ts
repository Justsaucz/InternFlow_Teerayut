import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { databaseFiles, readStoredUpload } from './lib/fileStorage';
import { seedDemo } from './lib/seedDemo';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

import authRoutes from './routes/auth.routes';
import accountRoutes from './routes/account.routes';
import notificationRoutes from './routes/notifications.routes';
import screeningRoutes from './routes/screening.routes';
import jobsRoutes from './routes/jobs.routes';
import applicationsRoutes from './routes/applications.routes';
import studentRoutes from './routes/student.routes';
import companyRoutes from './routes/company.routes';
import uploadRoutes from './routes/upload.routes';
import dashboardRoutes from './routes/dashboard.routes';
import logbookRoutes from './routes/logbook.routes';
import evaluationRoutes from './routes/evaluation.routes';
import profileRoutes from './routes/profile.routes';
import path from 'path';
import readinessRoutes from './routes/readiness.routes';
import { startReadinessNotices } from './lib/readiness';
import logbookFiles, { protectLegacyLogbookFiles, backfillLogbookAttachments } from './routes/logbook-private.routes';

app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);
app.use((_req, res, next) => { res.set('X-Robots-Tag', 'noindex, nofollow, noarchive'); next(); });

// Serve static files for mock S3 uploads
app.use('/api/logbook-files', logbookFiles);
app.use('/uploads', protectLegacyLogbookFiles, async (req, res, next) => {
  if (!databaseFiles()) return next();
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.sendStatus(405); return; }
    const file = await readStoredUpload('uploads' + req.path);
    res.set({'Content-Type':file.mimeType,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}).send(file.bytes);
  } catch { res.sendStatus(404); }
}, express.static(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'InternFlow API is running' });
});

app.use('/api/auth', accountRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/logbook', logbookRoutes);
app.use('/api/readiness', readinessRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/profile', profileRoutes);

seedDemo().then(() => backfillLogbookAttachments()).then(() => {
  if(process.env.READINESS_PROCESSOR_DISABLED !== 'true') startReadinessNotices();
  app.listen(PORT, () => { console.log(`Server is running on http://localhost:${PORT}`); });
}).catch(() => { console.error('Private logbook metadata could not be initialized. Server not started.'); process.exit(1); });
