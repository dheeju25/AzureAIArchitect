import { Span } from '@opentelemetry/api';
declare class TracingService {
    private tracer;
    generateTraceId(): string;
    startTrace(operation: string, traceId?: string): Promise<{
        span: Span;
        traceId: string;
    }>;
    endTrace(span: Span, traceId: string, operation: string, status: 'completed' | 'failed', error?: Error): Promise<void>;
    traceAgentCall<T>(agentName: string, operation: string, traceId: string, input: any, agentFunction: () => Promise<T>): Promise<T>;
    createChildSpan(parentSpan: Span, operation: string): Promise<Span>;
}
export declare const tracingService: TracingService;
export {};
//# sourceMappingURL=tracing.d.ts.map