import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

export interface ProcessingEvent {
  traceId: string;
  agent: string;
  status: 'starting' | 'in_progress' | 'completed' | 'error';
  step: string;
  progress: number;
  message: string;
  timestamp: string;
  data?: any;
}

export class WebSocketService {
  private io: SocketIOServer;
  private static instance: WebSocketService;

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
  }

  static getInstance(httpServer?: HttpServer): WebSocketService {
    if (!WebSocketService.instance && httpServer) {
      WebSocketService.instance = new WebSocketService(httpServer);
    }
    return WebSocketService.instance;
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info('Client connected to WebSocket', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      socket.on('subscribe-to-trace', (traceId: string) => {
        socket.join(`trace-${traceId}`);
        logger.info('Client subscribed to trace', {
          socketId: socket.id,
          traceId
        });
      });

      socket.on('unsubscribe-from-trace', (traceId: string) => {
        socket.leave(`trace-${traceId}`);
        logger.info('Client unsubscribed from trace', {
          socketId: socket.id,
          traceId
        });
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from WebSocket', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  emitProcessingUpdate(event: ProcessingEvent): void {
    const room = `trace-${event.traceId}`;
    
    logger.info('Emitting processing update', {
      traceId: event.traceId,
      agent: event.agent,
      status: event.status,
      step: event.step,
      progress: event.progress
    });

    this.io.to(room).emit('processing-update', event);
  }

  emitAgentStart(traceId: string, agent: string, step: string): void {
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

  emitAgentProgress(traceId: string, agent: string, step: string, progress: number, message: string, data?: any): void {
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

  emitAgentComplete(traceId: string, agent: string, step: string, data?: any): void {
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

  emitAgentError(traceId: string, agent: string, step: string, error: string): void {
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

  emitOverallProgress(traceId: string, totalProgress: number, currentStep: string): void {
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

  getConnectedClients(traceId?: string): number {
    if (traceId) {
      const room = this.io.sockets.adapter.rooms.get(`trace-${traceId}`);
      return room ? room.size : 0;
    }
    return this.io.engine.clientsCount;
  }
}