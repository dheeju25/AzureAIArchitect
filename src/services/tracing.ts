import { trace, context, SpanStatusCode, SpanKind, Span } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import { TraceInfo, AgentRequest, AgentResponse } from '../types';
import { logger } from '../utils/logger';

class TracingService {
  private tracer = trace.getTracer('azure-ai-foundry-agents');

  generateTraceId(): string {
    return uuidv4();
  }

  async startTrace(operation: string, traceId?: string): Promise<{ span: Span; traceId: string }> {
    const actualTraceId = traceId || this.generateTraceId();
    
    const span = this.tracer.startSpan(operation, {
      kind: SpanKind.SERVER,
      attributes: {
        'trace.id': actualTraceId,
        'operation.name': operation,
        'service.name': 'azure-ai-foundry-agents',
        'timestamp': new Date().toISOString()
      }
    });

    const traceInfo: TraceInfo = {
      traceId: actualTraceId,
      spanId: span.spanContext().spanId,
      timestamp: new Date(),
      operation,
      status: 'started'
    };

    logger.info('Trace started', traceInfo);
    
    return { span, traceId: actualTraceId };
  }

  async endTrace(span: Span, traceId: string, operation: string, status: 'completed' | 'failed', error?: Error): Promise<void> {
    const endTime = new Date();
    const duration = Date.now() - Date.now(); // Simplified for now

    if (status === 'failed' && error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    span.setAttributes({
      'operation.status': status,
      'operation.duration': duration
    });

    const traceInfo: TraceInfo = {
      traceId,
      spanId: span.spanContext().spanId,
      timestamp: endTime,
      operation,
      status,
      duration,
      metadata: error ? { error: error.message } : undefined
    };

    logger.info('Trace ended', traceInfo);
    span.end();
  }

  async traceAgentCall<T>(
    agentName: string,
    operation: string,
    traceId: string,
    input: any,
    agentFunction: () => Promise<T>
  ): Promise<T> {
    const { span } = await this.startTrace(`${agentName}.${operation}`, traceId);
    
    const request: AgentRequest = {
      traceId,
      operation: `${agentName}.${operation}`,
      input,
      timestamp: new Date()
    };

    logger.info(`Agent request: ${agentName}`, request);

    try {
      const startTime = Date.now();
      const result = await agentFunction();
      const duration = Date.now() - startTime;

      const response: AgentResponse = {
        traceId,
        operation: `${agentName}.${operation}`,
        output: result,
        timestamp: new Date(),
        duration,
        status: 'success'
      };

      logger.info(`Agent response: ${agentName}`, response);
      await this.endTrace(span, traceId, `${agentName}.${operation}`, 'completed');
      
      return result;
    } catch (error) {
      const response: AgentResponse = {
        traceId,
        operation: `${agentName}.${operation}`,
        output: null,
        timestamp: new Date(),
        duration: Date.now() - Date.now(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      logger.error(`Agent error: ${agentName}`, response);
      await this.endTrace(span, traceId, `${agentName}.${operation}`, 'failed', error instanceof Error ? error : new Error('Unknown error'));
      
      throw error;
    }
  }

  async createChildSpan(parentSpan: Span, operation: string): Promise<Span> {
    return context.with(trace.setSpan(context.active(), parentSpan), () => {
      return this.tracer.startSpan(operation, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'operation.name': operation,
          'span.type': 'child'
        }
      });
    });
  }
}

export const tracingService = new TracingService();