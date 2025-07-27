import { Request, Response, NextFunction } from 'express';
import { tracingService } from '../services/tracing';
import { v4 as uuidv4 } from 'uuid';

export interface TracedRequest extends Request {
  traceId: string;
}

export const tracingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const traceId = req.headers['x-trace-id'] as string || uuidv4();
  (req as TracedRequest).traceId = traceId;

  // Set trace ID in response headers for client tracking
  res.setHeader('x-trace-id', traceId);

  // Start trace for the request
  const { span } = await tracingService.startTrace(`http.${req.method.toLowerCase()}.${req.path}`, traceId);

  // Add request attributes to span
  span.setAttributes({
    'http.method': req.method,
    'http.url': req.url,
    'http.path': req.path,
    'http.user_agent': req.get('User-Agent') || 'unknown',
    'http.remote_addr': req.ip || 'unknown'
  });

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    span.setAttributes({
      'http.status_code': res.statusCode,
      'http.response_size': res.get('content-length') || 0
    });

    if (res.statusCode >= 400) {
      tracingService.endTrace(span, traceId, `http.${req.method.toLowerCase()}.${req.path}`, 'failed');
    } else {
      tracingService.endTrace(span, traceId, `http.${req.method.toLowerCase()}.${req.path}`, 'completed');
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};