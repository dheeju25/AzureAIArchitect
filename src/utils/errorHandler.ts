import { logger } from './logger';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 422, 'FILE_PROCESSING_ERROR');
    this.name = 'FileProcessingError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class AgentError extends AppError {
  public agentName: string;
  
  constructor(message: string, agentName: string, originalError?: Error) {
    super(message, 500, 'AGENT_ERROR');
    this.name = 'AgentError';
    this.agentName = agentName;
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class TracingError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500, 'TRACING_ERROR');
    this.name = 'TracingError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export function handleAsyncError(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function logError(error: Error, context?: Record<string, any>) {
  const errorInfo: Record<string, any> = {
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

  logger.error('Application error occurred', errorInfo);
}

export function sanitizeError(error: Error): Record<string, any> {
  const sanitized: Record<string, any> = {
    name: error.name,
    message: error.message
  };

  if (error instanceof AppError) {
    sanitized.code = error.code;
    sanitized.statusCode = error.statusCode;

    if (error instanceof ValidationError) {
      sanitized.type = 'validation';
    } else if (error instanceof FileProcessingError) {
      sanitized.type = 'file_processing';
    } else if (error instanceof AgentError) {
      sanitized.type = 'agent';
      sanitized.agentName = error.agentName;
    } else if (error instanceof TracingError) {
      sanitized.type = 'tracing';
    }
  }

  // Don't expose sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    delete sanitized.stack;
  } else {
    sanitized.stack = error.stack;
  }

  return sanitized;
}

export function createRetryHandler(maxRetries: number = 3, baseDelay: number = 1000) {
  return async function retry<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
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

    throw lastError!;
  };
}