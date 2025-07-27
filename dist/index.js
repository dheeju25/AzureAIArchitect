"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const telemetry_1 = require("./services/telemetry");
const tracing_1 = require("./middleware/tracing");
const upload_1 = require("./middleware/upload");
const orchestrator_1 = require("./agents/orchestrator");
const logger_1 = require("./utils/logger");
const traceQuery_1 = require("./services/traceQuery");
const websocket_1 = require("./services/websocket");
const fs = __importStar(require("fs/promises"));
// Initialize telemetry before anything else
telemetry_1.telemetryService.initialize();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const httpServer = (0, http_1.createServer)(app);
const orchestrator = new orchestrator_1.OrchestratorAgent();
// Initialize WebSocket service
const wsService = websocket_1.WebSocketService.getInstance(httpServer);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(tracing_1.tracingMiddleware);
// Ensure required directories exist
async function ensureDirectories() {
    const dirs = ['./uploads', './generated', './logs'];
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        }
        catch (error) {
            logger_1.logger.warn(`Failed to create directory ${dir}`, { error });
        }
    }
}
// Routes
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        traceId: req.traceId
    });
});
// Upload and process architecture diagram
app.post('/api/process-diagram', upload_1.upload.single('diagram'), async (req, res) => {
    const traceId = req.traceId;
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No diagram file uploaded',
                traceId
            });
        }
        logger_1.logger.info('Processing diagram upload', {
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
        const request = {
            diagramFile: fileBuffer,
            fileName: req.file.originalname,
            userRequirements
        };
        // Process the diagram through the orchestrator
        const result = await orchestrator.processArchitectureDiagram(request);
        // Clean up uploaded file
        try {
            await fs.unlink(req.file.path);
        }
        catch (error) {
            logger_1.logger.warn('Failed to clean up uploaded file', { traceId, error });
        }
        res.json({
            success: true,
            traceId: result.traceId,
            processingTime: result.processingTime,
            analysis: {
                resourceCount: result.analysis.resources.length,
                pattern: result.analysis.architecture.pattern,
                complexity: result.analysis.architecture.complexity
            },
            compliance: {
                compliant: result.complianceReport.compliant,
                violationCount: result.complianceReport.violations.length
            },
            cost: {
                estimatedMonthlyCost: result.costOptimization.estimatedMonthlyCost,
                potentialSavings: result.costOptimization.potentialSavings
            },
            downloadUrl: result.downloadUrl,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Diagram processing failed', {
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
    const requestTraceId = req.traceId;
    try {
        const status = await orchestrator.getProcessingStatus(traceId);
        res.json({
            success: true,
            status,
            requestTraceId
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get processing status', {
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
    const traceId = req.traceId;
    try {
        const filePath = path_1.default.join(process.env.OUTPUT_DIR || './generated', filename);
        // Check if file exists
        await fs.access(filePath);
        logger_1.logger.info('File download requested', {
            traceId,
            filename,
            filePath
        });
        res.download(filePath, filename, (error) => {
            if (error) {
                logger_1.logger.error('File download failed', {
                    traceId,
                    filename,
                    error: error.message
                });
            }
            else {
                logger_1.logger.info('File download completed', {
                    traceId,
                    filename
                });
            }
        });
    }
    catch (error) {
        logger_1.logger.error('File not found for download', {
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
    const traceId = req.traceId;
    try {
        const query = {
            traceId: req.query.traceId,
            operation: req.query.operation,
            status: req.query.status,
            startTime: req.query.startTime ? new Date(req.query.startTime) : undefined,
            endTime: req.query.endTime ? new Date(req.query.endTime) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined
        };
        // Remove undefined values
        Object.keys(query).forEach(key => {
            if (query[key] === undefined) {
                delete query[key];
            }
        });
        const result = await traceQuery_1.traceQueryService.queryTraces(query);
        res.json({
            success: true,
            traces: result.traces,
            totalCount: result.totalCount,
            hasMore: result.hasMore,
            requestTraceId: traceId
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to query traces', {
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
    const requestTraceId = req.traceId;
    try {
        const trace = await traceQuery_1.traceQueryService.getTraceDetails(targetTraceId);
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get trace details', {
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
    const traceId = req.traceId;
    try {
        const startTime = req.query.start ? new Date(req.query.start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const endTime = req.query.end ? new Date(req.query.end) : new Date();
        const metrics = await traceQuery_1.traceQueryService.getTraceMetrics({ start: startTime, end: endTime });
        res.json({
            success: true,
            metrics,
            timeRange: { start: startTime, end: endTime },
            requestTraceId: traceId
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get trace metrics', {
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
app.use(express_1.default.static('public'));
// Catch-all route for frontend
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
// Error handling middleware
app.use((error, req, res, next) => {
    const traceId = req.traceId;
    logger_1.logger.error('Unhandled error', {
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
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    await telemetry_1.telemetryService.shutdown();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    await telemetry_1.telemetryService.shutdown();
    process.exit(0);
});
// Start server
async function startServer() {
    try {
        await ensureDirectories();
        httpServer.listen(port, () => {
            logger_1.logger.info(`AI Superman server started`, {
                port,
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString()
            });
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map