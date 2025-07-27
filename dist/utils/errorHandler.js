"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracingError = exports.AgentError = exports.FileProcessingError = exports.ValidationError = exports.AppError = void 0;
exports.handleAsyncError = handleAsyncError;
exports.logError = logError;
exports.sanitizeError = sanitizeError;
exports.createRetryHandler = createRetryHandler;
const logger_1 = require("./logger");
class AppError extends Error {
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, field) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class FileProcessingError extends AppError {
    constructor(message, originalError) {
        super(message, 422, 'FILE_PROCESSING_ERROR');
        this.name = 'FileProcessingError';
        if (originalError) {
            this.stack = originalError.stack;
        }
    }
}
exports.FileProcessingError = FileProcessingError;
class AgentError extends AppError {
    constructor(message, agentName, originalError) {
        super(message, 500, 'AGENT_ERROR');
        this.name = 'AgentError';
        this.agentName = agentName;
        if (originalError) {
            this.stack = originalError.stack;
        }
    }
}
exports.AgentError = AgentError;
class TracingError extends AppError {
    constructor(message, originalError) {
        super(message, 500, 'TRACING_ERROR');
        this.name = 'TracingError';
        if (originalError) {
            this.stack = originalError.stack;
        }
    }
}
exports.TracingError = TracingError;
function handleAsyncError(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
function logError(error, context) {
    const errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...context
    };
    if (error instanceof AppError) {
        errorInfo.statusCode = error.statusCode;
        errorInfo.code = error.code;
        errorInfo.isOperational = error.isOperational;
        if (error instanceof AgentError) {
            errorInfo.agentName = error.agentName;
        }
    }
    logger_1.logger.error('Application error occurred', errorInfo);
}
function sanitizeError(error) {
    const sanitized = {
        name: error.name,
        message: error.message
    };
    if (error instanceof AppError) {
        sanitized.code = error.code;
        sanitized.statusCode = error.statusCode;
        if (error instanceof ValidationError) {
            sanitized.type = 'validation';
        }
        else if (error instanceof FileProcessingError) {
            sanitized.type = 'file_processing';
        }
        else if (error instanceof AgentError) {
            sanitized.type = 'agent';
            sanitized.agentName = error.agentName;
        }
        else if (error instanceof TracingError) {
            sanitized.type = 'tracing';
        }
    }
    // Don't expose sensitive information in production
    if (process.env.NODE_ENV === 'production') {
        delete sanitized.stack;
    }
    else {
        sanitized.stack = error.stack;
    }
    return sanitized;
}
function createRetryHandler(maxRetries = 3, baseDelay = 1000) {
    return async function retry(operation, context) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                if (attempt === maxRetries) {
                    logError(lastError, {
                        ...context,
                        attempt,
                        maxRetries,
                        finalAttempt: true
                    });
                    throw lastError;
                }
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                logError(lastError, {
                    ...context,
                    attempt,
                    maxRetries,
                    retryAfter: delay
                });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    };
}
//# sourceMappingURL=errorHandler.js.map