import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { logToFile } from './logger.ts';

// Import routes
import habitsRoutes from './routes/habits.ts';
import vlogsRoutes from './routes/vlogs.ts';
import tasksRoutes from './routes/tasks.ts';
import diaryRoutes from './routes/diary.ts';
import nextRoutes from './routes/next.ts';
import listsRoutes from './routes/lists.ts';
import landmarksRoutes from './routes/landmarks.ts';
import calendarRoutes from './routes/calendar.ts';
import memoriesRoutes from './routes/memories.ts';
import servicesRoutes from './routes/services.ts';
import { checkCalendarConnection, syncCalendarEvents } from './services/calendarService.ts';

console.log('[SERVER] 🏁 Starting server process...');

const app = express();
app.use(cors());
app.use(express.json());

// Extended Response type for logging
interface LoggingResponse extends Response {
  locals: {
    responseBody?: unknown;
  };
}

// Comprehensive logging middleware
app.use((req: Request, res: LoggingResponse, next: NextFunction) => {
  // Skip logging for health checks to keep console clean
  if (req.path === '/health') {
    return next();
  }

  const start = Date.now();

  // Wrap res.json to capture body for logging
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    res.locals = res.locals || {};
    res.locals.responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    const status = res.statusCode;

    // Colorize status
    const statusIcon = status >= 500 ? '🔥' : status >= 400 ? '⚠️' : '✅';

    let extraInfo = '';
    if (Object.keys(req.query).length > 0) {
      extraInfo += ` | Q: ${JSON.stringify(req.query)}`;
    }

    // Log the single line
    const logLine = `[SERVER] ${timestamp} | ${statusIcon} ${status} | ${duration.toString().padStart(4)}ms | ${req.method.padEnd(6)} ${req.path}${extraInfo}`;
    console.log(logLine);
    logToFile(logLine);

    if (status >= 400 && res.locals?.responseBody) {
      const errorLog = `[SERVER]      ❌ Error: ${JSON.stringify(res.locals.responseBody)}`;
      console.log(errorLog);
      logToFile(errorLog);
    }
  });

  next();
});

// --- API Endpoints ---

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/', habitsRoutes);
app.use('/', vlogsRoutes);
app.use('/', tasksRoutes);
app.use('/', diaryRoutes);
app.use('/', nextRoutes);
app.use('/', listsRoutes);
app.use('/', landmarksRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/', memoriesRoutes);
app.use('/api/services', servicesRoutes);

const PORT = process.env.PORT || 4000; // Changed from 3000 to avoid conflict with Cap
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`[SERVER] 🚀 API running on http://0.0.0.0:${PORT}`);
  console.log(`[SERVER] 🐘 Connected to PostgreSQL`);

  // Check Calendar Connection
  checkCalendarConnection().then(async isConnected => {
    console.log(`[SERVER] 📅 ${isConnected ? 'Connected to Google Calendar' : 'Failed to connect to Google Calendar'}`);
    if (isConnected) {
      await syncCalendarEvents();
    }
  });

  console.log(`[SERVER] 📝 Verbose logging enabled`);
  console.log('='.repeat(60) + '\n');
});
