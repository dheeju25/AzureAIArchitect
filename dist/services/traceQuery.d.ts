import { TraceInfo } from '../types';
export interface TraceQuery {
    traceId?: string;
    operation?: string;
    status?: 'started' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
}
export interface TraceQueryResult {
    traces: TraceInfo[];
    totalCount: number;
    hasMore: boolean;
}
export interface TraceDetails {
    traceId: string;
    operations: OperationTrace[];
    startTime: Date;
    endTime?: Date;
    totalDuration?: number;
    status: 'in_progress' | 'completed' | 'failed';
    metadata: Record<string, any>;
}
export interface OperationTrace {
    operation: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'started' | 'completed' | 'failed';
    input?: any;
    output?: any;
    error?: string;
    children: OperationTrace[];
}
declare class TraceQueryService {
    private traces;
    queryTraces(query: TraceQuery): Promise<TraceQueryResult>;
    getTraceDetails(traceId: string): Promise<TraceDetails | null>;
    getTraceMetrics(timeRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
    recordTrace(traceDetails: TraceDetails): void;
    private createMockTraceDetails;
    private calculateRequestsPerHour;
    private getTopOperations;
}
export declare const traceQueryService: TraceQueryService;
export {};
//# sourceMappingURL=traceQuery.d.ts.map