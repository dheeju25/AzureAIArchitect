import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { telemetryService } from './services/telemetry';
import { tracingMiddleware } from './middleware/tracing';
import { upload } from './middleware/upload';
import { OrchestratorAgent, OrchestrationRequest } from './agents/orchestrator';
import { logger } from './utils/logger';
import { TracedRequest } from './middleware/tracing';
import { traceQueryService } from './services/traceQuery';
import { WebSocketService } from './services/websocket';
import * as fs from 'fs/promises';

// Initialize telemetry before anything else
telemetryService.initialize();

const app = express();
const port = process.env.PORT || 3000;
const httpServer = createServer(app);
const orchestrator = new OrchestratorAgent();

// Initialize WebSocket service
const wsService = WebSocketService.getInstance(httpServer);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(tracingMiddleware);

// Ensure required directories exist
async function ensureDirectories() {
  const dirs = ['./uploads', './generated', './logs'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.warn(`Failed to create directory ${dir}`, { error });
    }
  }
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    traceId: (req as TracedRequest).traceId
  });
});

// Upload and process architecture diagram
app.post('/api/process-diagram', upload.single('diagram'), async (req, res) => {
  const traceId = (req as TracedRequest).traceId;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No diagram file uploaded',
        traceId
      });
    }

    logger.info('Processing diagram upload', {
      traceId,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    // Read the uploaded file
    const fileBuffer = await fs.readFile(req.file.path);

    // Parse user requirements from request body
    const userRequirements = {
      targetRegion: req.body.targetRegion,
      budgetConstraint: req.body.budgetConstraint ? parseFloat(req.body.budgetConstraint) : undefined,
      complianceProfile: req.body.complianceProfile,
      scalabilityRequirements: req.body.scalabilityRequirements
    };

    const request: OrchestrationRequest = {
      diagramFile: fileBuffer,
      fileName: req.file.originalname,
      userRequirements
    };

    // Return trace ID immediately and start processing asynchronously
    res.json({
      success: true,
      traceId,
      message: 'Processing started',
      timestamp: new Date().toISOString()
    });

    // Process asynchronously
    try {
      const result = await orchestrator.processArchitectureDiagram(request, traceId);
      
      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        logger.warn('Failed to clean up uploaded file', { traceId, error });
      }

      logger.info('Async processing completed successfully', {
        traceId: result.traceId,
        processingTime: result.processingTime,
        downloadUrl: result.downloadUrl
      });

    } catch (asyncError) {
      logger.error('Async diagram processing failed', {
        traceId,
        error: asyncError instanceof Error ? asyncError.message : 'Unknown error'
      });
      
      // Clean up uploaded file on error
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.warn('Failed to clean up uploaded file after error', { traceId, error: cleanupError });
      }
    }

  } catch (error) {
    logger.error('Diagram processing failed', {
      traceId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to process diagram',
      message: error instanceof Error ? error.message : 'Unknown error',
      traceId
    });
  }
});

// Get processing status
app.get('/api/status/:traceId', async (req, res) => {
  const { traceId } = req.params;
  const requestTraceId = (req as any).traceId;

  try {
    const status = await orchestrator.getProcessingStatus(traceId);
    
    res.json({
      success: true,
      status,
      requestTraceId
    });

  } catch (error) {
    logger.error('Failed to get processing status', {
      traceId: requestTraceId,
      targetTraceId: traceId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get processing status',
      message: error instanceof Error ? error.message : 'Unknown error',
      traceId: requestTraceId
    });
  }
});

// Download generated files
app.get('/download/:filename', async (req, res) => {
  const { filename } = req.params;
  const traceId = (req as any).traceId;

  try {
    const filePath = path.join(process.env.OUTPUT_DIR || './generated', filename);
    
    // Check if file exists
    await fs.access(filePath);

    logger.info('File download requested', {
      traceId,
      filename,
      filePath
    });

    res.download(filePath, filename, (error) => {
      if (error) {
        logger.error('File download failed', {
          traceId,
          filename,
          error: error.message
        });
      } else {
        logger.info('File download completed', {
          traceId,
          filename
        });
      }
    });

  } catch (error) {
    logger.error('File not found for download', {
      traceId,
      filename,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(404).json({
      error: 'File not found',
      filename,
      traceId
    });
  }
});

// Tracing API endpoints

// Query traces with filtering
app.get('/api/traces', async (req, res) => {
  const traceId = (req as any).traceId;

  try {
    const query = {
      traceId: req.query.traceId as string,
      operation: req.query.operation as string,
      status: req.query.status as 'started' | 'completed' | 'failed',
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    // Remove undefined values
    Object.keys(query).forEach(key => {
      if (query[key as keyof typeof query] === undefined) {
        delete query[key as keyof typeof query];
      }
    });

    const result = await traceQueryService.queryTraces(query);

    res.json({
      success: true,
      traces: result.traces,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
      requestTraceId: traceId
    });

  } catch (error) {
    logger.error('Failed to query traces', {
      traceId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to query traces',
      message: error instanceof Error ? error.message : 'Unknown error',
      traceId
    });
  }
});

// Get detailed trace information
app.get('/api/traces/:traceId', async (req, res) => {
  const { traceId: targetTraceId } = req.params;
  const requestTraceId = (req as any).traceId;

  try {
    const trace = await traceQueryService.getTraceDetails(targetTraceId);

    if (!trace) {
      return res.status(404).json({
        error: 'Trace not found',
        traceId: targetTraceId,
        requestTraceId
      });
    }

    res.json({
      success: true,
      ...trace,
      requestTraceId
    });

  } catch (error) {
    logger.error('Failed to get trace details', {
      traceId: requestTraceId,
      targetTraceId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get trace details',
      message: error instanceof Error ? error.message : 'Unknown error',
      traceId: requestTraceId
    });
  }
});

// Get trace metrics for dashboard
app.get('/api/trace-metrics', async (req, res) => {
  const traceId = (req as any).traceId;

  try {
    const startTime = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = req.query.end ? new Date(req.query.end as string) : new Date();

    const metrics = await traceQueryService.getTraceMetrics({ start: startTime, end: endTime });

    res.json({
      success: true,
      metrics,
      timeRange: { start: startTime, end: endTime },
      requestTraceId: traceId
    });

  } catch (error) {
    logger.error('Failed to get trace metrics', {
      traceId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to get trace metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      traceId
    });
  }
});

// Serve static files for the frontend
app.use(express.static('public'));

// Catch-all route for frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const traceId = (req as any).traceId;
  
  logger.error('Unhandled error', {
    traceId,
    error: error.message,
    stack: error.stack
  });

  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    traceId
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await telemetryService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await telemetryService.shutdown();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await ensureDirectories();
    
    httpServer.listen(port, () => {
      logger.info(`AI Superman server started`, {
        port,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

startServer();