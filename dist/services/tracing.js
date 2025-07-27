"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracingService = void 0;
const api_1 = require("@opentelemetry/api");
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
class TracingService {
    constructor() {
        this.tracer = api_1.trace.getTracer('azure-ai-foundry-agents');
    }
    generateTraceId() {
        return (0, uuid_1.v4)();
    }
    async startTrace(operation, traceId) {
        const actualTraceId = traceId || this.generateTraceId();
        const span = this.tracer.startSpan(operation, {
            kind: api_1.SpanKind.SERVER,
            attributes: {
                'trace.id': actualTraceId,
                'operation.name': operation,
                'service.name': 'azure-ai-foundry-agents',
                'timestamp': new Date().toISOString()
            }
        });
        const traceInfo = {
            traceId: actualTraceId,
            spanId: span.spanContext().spanId,
            timestamp: new Date(),
            operation,
            status: 'started'
        };
        logger_1.logger.info('Trace started', traceInfo);
        return { span, traceId: actualTraceId };
    }
    async endTrace(span, traceId, operation, status, error) {
        const endTime = new Date();
        const duration = Date.now() - Date.now(); // Simplified for now
        if (status === 'failed' && error) {
            span.recordException(error);
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: error.message });
        }
        else {
            span.setStatus({ code: api_1.SpanStatusCode.OK });
        }
        span.setAttributes({
            'operation.status': status,
            'operation.duration': duration
        });
        const traceInfo = {
            traceId,
            spanId: span.spanContext().spanId,
            timestamp: endTime,
            operation,
            status,
            duration,
            metadata: error ? { error: error.message } : undefined
        };
        logger_1.logger.info('Trace ended', traceInfo);
        span.end();
    }
    async traceAgentCall(agentName, operation, traceId, input, agentFunction) {
        const { span } = await this.startTrace(`${agentName}.${operation}`, traceId);
        const request = {
            traceId,
            operation: `${agentName}.${operation}`,
            input,
            timestamp: new Date()
        };
        logger_1.logger.info(`Agent request: ${agentName}`, request);
        try {
            const startTime = Date.now();
            const result = await agentFunction();
            const duration = Date.now() - startTime;
            const response = {
                traceId,
                operation: `${agentName}.${operation}`,
                output: result,
                timestamp: new Date(),
                duration,
                status: 'success'
            };
            logger_1.logger.info(`Agent response: ${agentName}`, response);
            await this.endTrace(span, traceId, `${agentName}.${operation}`, 'completed');
            return result;
        }
        catch (error) {
            const response = {
                traceId,
                operation: `${agentName}.${operation}`,
                output: null,
                timestamp: new Date(),
                duration: Date.now() - Date.now(),
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            logger_1.logger.error(`Agent error: ${agentName}`, response);
            await this.endTrace(span, traceId, `${agentName}.${operation}`, 'failed', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async createChildSpan(parentSpan, operation) {
        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), parentSpan), () => {
            return this.tracer.startSpan(operation, {
                kind: api_1.SpanKind.INTERNAL,
                attributes: {
                    'operation.name': operation,
                    'span.type': 'child'
                }
            });
        });
    }
}
exports.tracingService = new TracingService();
//# sourceMappingURL=tracing.js.map