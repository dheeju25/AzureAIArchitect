"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
class WebSocketService {
    constructor(httpServer) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.setupEventHandlers();
    }
    static getInstance(httpServer) {
        if (!WebSocketService.instance && httpServer) {
            WebSocketService.instance = new WebSocketService(httpServer);
        }
        return WebSocketService.instance;
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.logger.info('Client connected to WebSocket', {
                socketId: socket.id,
                timestamp: new Date().toISOString()
            });
            socket.on('subscribe-to-trace', (traceId) => {
                socket.join(`trace-${traceId}`);
                logger_1.logger.info('Client subscribed to trace', {
                    socketId: socket.id,
                    traceId
                });
            });
            socket.on('unsubscribe-from-trace', (traceId) => {
                socket.leave(`trace-${traceId}`);
                logger_1.logger.info('Client unsubscribed from trace', {
                    socketId: socket.id,
                    traceId
                });
            });
            socket.on('disconnect', () => {
                logger_1.logger.info('Client disconnected from WebSocket', {
                    socketId: socket.id,
                    timestamp: new Date().toISOString()
                });
            });
        });
    }
    emitProcessingUpdate(event) {
        const room = `trace-${event.traceId}`;
        logger_1.logger.info('Emitting processing update', {
            traceId: event.traceId,
            agent: event.agent,
            status: event.status,
            step: event.step,
            progress: event.progress
        });
        this.io.to(room).emit('processing-update', event);
    }
    emitAgentStart(traceId, agent, step) {
        this.emitProcessingUpdate({
            traceId,
            agent,
            status: 'starting',
            step,
            progress: 0,
            message: `Starting ${agent} agent...`,
            timestamp: new Date().toISOString()
        });
    }
    emitAgentProgress(traceId, agent, step, progress, message, data) {
        this.emitProcessingUpdate({
            traceId,
            agent,
            status: 'in_progress',
            step,
            progress,
            message,
            timestamp: new Date().toISOString(),
            data
        });
    }
    emitAgentComplete(traceId, agent, step, data) {
        this.emitProcessingUpdate({
            traceId,
            agent,
            status: 'completed',
            step,
            progress: 100,
            message: `${agent} agent completed successfully`,
            timestamp: new Date().toISOString(),
            data
        });
    }
    emitAgentError(traceId, agent, step, error) {
        this.emitProcessingUpdate({
            traceId,
            agent,
            status: 'error',
            step,
            progress: 0,
            message: `${agent} agent failed: ${error}`,
            timestamp: new Date().toISOString()
        });
    }
    emitOverallProgress(traceId, totalProgress, currentStep) {
        this.emitProcessingUpdate({
            traceId,
            agent: 'orchestrator',
            status: 'in_progress',
            step: currentStep,
            progress: totalProgress,
            message: `Overall progress: ${totalProgress}%`,
            timestamp: new Date().toISOString()
        });
    }
    getConnectedClients(traceId) {
        if (traceId) {
            const room = this.io.sockets.adapter.rooms.get(`trace-${traceId}`);
            return room ? room.size : 0;
        }
        return this.io.engine.clientsCount;
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=websocket.js.map