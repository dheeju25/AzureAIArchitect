export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    code?: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string, field?: string);
}
export declare class FileProcessingError extends AppError {
    constructor(message: string, originalError?: Error);
}
export declare class AgentError extends AppError {
    agentName: string;
    constructor(message: string, agentName: string, originalError?: Error);
}
export declare class TracingError extends AppError {
    constructor(message: string, originalError?: Error);
}
export declare function handleAsyncError(fn: Function): (req: any, res: any, next: any) => void;
export declare function logError(error: Error, context?: Record<string, any>): void;
export declare function sanitizeError(error: Error): Record<string, any>;
export declare function createRetryHandler(maxRetries?: number, baseDelay?: number): <T>(operation: () => Promise<T>, context?: Record<string, any>) => Promise<T>;
//# sourceMappingURL=errorHandler.d.ts.map