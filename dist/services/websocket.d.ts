import { Server as HttpServer } from 'http';
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
export declare class WebSocketService {
    private io;
    private static instance;
    constructor(httpServer: HttpServer);
    static getInstance(httpServer?: HttpServer): WebSocketService;
    private setupEventHandlers;
    emitProcessingUpdate(event: ProcessingEvent): void;
    emitAgentStart(traceId: string, agent: string, step: string): void;
    emitAgentProgress(traceId: string, agent: string, step: string, progress: number, message: string, data?: any): void;
    emitAgentComplete(traceId: string, agent: string, step: string, data?: any): void;
    emitAgentError(traceId: string, agent: string, step: string, error: string): void;
    emitOverallProgress(traceId: string, totalProgress: number, currentStep: string): void;
    getConnectedClients(traceId?: string): number;
}
//# sourceMappingURL=websocket.d.ts.map