import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import noteRoutes from './server/routes/notes';
import { Config } from './server/lib/config';
import { isSupabaseConfigured } from './server/lib/supabase';

async function startServer() {
  Config.validate();

  const app = express();
  
  const getPort = (): number => {
    const args = process.argv.slice(2);
    const portIndex = args.indexOf('--port');
    if (portIndex !== -1 && args[portIndex + 1]) {
      return Number(args[portIndex + 1]);
    }
    return Number(process.env.PORT) || 3000;
  };

  const PORT = getPort();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Structured Logging Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${color}${status}\x1b[0m - ${duration}ms`);
    });
    next();
  });

  // API Routes
  app.use('/api/notes', noteRoutes);

  // Health check endpoint (Does NOT depend on external services)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'ok',
      supabaseConfigured: isSupabaseConfigured(),
      gnaniConfigured: !!Config.GNANI_API_KEY?.trim(),
      geminiConfigured: !!Config.GEMINI_API_KEY?.trim()
    });
  });

  // 404 handler for API routes
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ 
      success: false,
      error: `API route ${req.method} ${req.url} not found`,
      code: 'NOT_FOUND'
    });
  });

  // Centralized Error Handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    let message = err.message || 'Unknown error';

    if (message.includes('Invalid API key') || message.includes('Invalid Compact JWS') || message.includes('PGRST301')) {
      message = 'Database service authentication failed. Please check SUPABASE_SERVICE_ROLE_KEY in server environment.';
    }
    
    // Log the error internally
    console.error(`[ERROR] ${req.method} ${req.url}:`, err);

    // Return structured JSON error
    res.status(status).json({ 
      success: false,
      error: message,
      code,
      message
    });
  });

  // Frontend / Static Serving
  if (Config.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n\x1b[36m🚀 Audio Notes Platform Backend\x1b[0m`);
    console.log(`\x1b[32m✔ Server running on http://0.0.0.0:${PORT}\x1b[0m`);
    console.log(`\x1b[33m✔ Mode: ${Config.NODE_ENV}\x1b[0m\n`);
  });
}

startServer().catch(err => {
  console.error('\x1b[31m[FATAL] Server failed to start:\x1b[0m', err);
  process.exit(1);
});

