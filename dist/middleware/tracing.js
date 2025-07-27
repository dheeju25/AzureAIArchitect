"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracingMiddleware = void 0;
const tracing_1 = require("../services/tracing");
const uuid_1 = require("uuid");
const tracingMiddleware = async (req, res, next) => {
    const traceId = req.headers['x-trace-id'] || (0, uuid_1.v4)();
    req.traceId = traceId;
    // Set trace ID in response headers for client tracking
    res.setHeader('x-trace-id', traceId);
    // Start trace for the request
    const { span } = await tracing_1.tracingService.startTrace(`http.${req.method.toLowerCase()}.${req.path}`, traceId);
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
    res.end = function (chunk, encoding) {
        span.setAttributes({
            'http.status_code': res.statusCode,
            'http.response_size': res.get('content-length') || 0
        });
        if (res.statusCode >= 400) {
            tracing_1.tracingService.endTrace(span, traceId, `http.${req.method.toLowerCase()}.${req.path}`, 'failed');
        }
        else {
            tracing_1.tracingService.endTrace(span, traceId, `http.${req.method.toLowerCase()}.${req.path}`, 'completed');
        }
        return originalEnd.call(this, chunk, encoding);
    };
    next();
};
exports.tracingMiddleware = tracingMiddleware;
//# sourceMappingURL=tracing.js.map