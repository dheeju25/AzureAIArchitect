import { logger } from '../utils/logger';
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

class TraceQueryService {
  private traces: Map<string, TraceDetails> = new Map();

  async queryTraces(query: TraceQuery): Promise<TraceQueryResult> {
    logger.info('Querying traces', { query });

    try {
      // In a real implementation, this would query Azure Monitor or OpenTelemetry backend
      // For now, we'll return mock data based on the in-memory store
      
      let traces = Array.from(this.traces.values());

      // Apply filters
      if (query.traceId) {
        traces = traces.filter(t => t.traceId === query.traceId);
      }

      if (query.status) {
        traces = traces.filter(t => t.status === query.status);
      }

      if (query.startTime) {
        traces = traces.filter(t => t.startTime >= query.startTime!);
      }

      if (query.endTime) {
        traces = traces.filter(t => t.startTime <= query.endTime!);
      }

      // Sort by start time (most recent first)
      traces.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      const totalCount = traces.length;
      const offset = query.offset || 0;
      const limit = query.limit || 50;

      // Apply pagination
      const paginatedTraces = traces.slice(offset, offset + limit);

      const traceInfos: TraceInfo[] = paginatedTraces.map(trace => ({
        traceId: trace.traceId,
        spanId: 'root',
        timestamp: trace.startTime,
        operation: trace.operations[0]?.operation || 'unknown',
        status: trace.status === 'in_progress' ? 'started' : trace.status,
        duration: trace.totalDuration,
        metadata: trace.metadata
      }));

      return {
        traces: traceInfos,
        totalCount,
        hasMore: offset + limit < totalCount
      };

    } catch (error) {
      logger.error('Failed to query traces', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async getTraceDetails(traceId: string): Promise<TraceDetails | null> {
    logger.info('Getting trace details', { traceId });

    try {
      // In a real implementation, this would query the tracing backend for detailed trace information
      const trace = this.traces.get(traceId);
      
      if (!trace) {
        // Mock trace details for demonstration
        return this.createMockTraceDetails(traceId);
      }

      return trace;

    } catch (error) {
      logger.error('Failed to get trace details', { 
        traceId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async getTraceMetrics(timeRange: { start: Date; end: Date }): Promise<any> {
    logger.info('Getting trace metrics', { timeRange });

    try {
      // In a real implementation, this would aggregate metrics from the tracing backend
      const traces = Array.from(this.traces.values()).filter(
        t => t.startTime >= timeRange.start && t.startTime <= timeRange.end
      );

      const metrics = {
        totalRequests: traces.length,
        successfulRequests: traces.filter(t => t.status === 'completed').length,
        failedRequests: traces.filter(t => t.status === 'failed').length,
        averageDuration: traces.reduce((sum, t) => sum + (t.totalDuration || 0), 0) / traces.length || 0,
        requestsPerHour: this.calculateRequestsPerHour(traces, timeRange),
        topOperations: this.getTopOperations(traces),
        errorRate: traces.length > 0 ? (traces.filter(t => t.status === 'failed').length / traces.length) * 100 : 0
      };

      return metrics;

    } catch (error) {
      logger.error('Failed to get trace metrics', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  // Internal methods for storing trace information (in real implementation, this would be handled by the tracing backend)
  recordTrace(traceDetails: TraceDetails): void {
    this.traces.set(traceDetails.traceId, traceDetails);
  }

  private createMockTraceDetails(traceId: string): TraceDetails {
    return {
      traceId,
      startTime: new Date(Date.now() - 5000),
      endTime: new Date(),
      totalDuration: 5000,
      status: 'completed',
      metadata: {
        userAgent: 'Mozilla/5.0',
        clientIp: '192.168.1.1'
      },
      operations: [
        {
          operation: 'orchestrator.processArchitectureDiagram',
          startTime: new Date(Date.now() - 5000),
          endTime: new Date(Date.now() - 500),
          duration: 4500,
          status: 'completed',
          input: { fileName: 'architecture.png' },
          output: { success: true },
          children: [
            {
              operation: 'analyzer.extractArchitecture',
              startTime: new Date(Date.now() - 4800),
              endTime: new Date(Date.now() - 4000),
              duration: 800,
              status: 'completed',
              input: { fileName: 'architecture.png' },
              output: { resourceCount: 3 },
              children: []
            },
            {
              operation: 'policyCompliance.validateCompliance',
              startTime: new Date(Date.now() - 3900),
              endTime: new Date(Date.now() - 3200),
              duration: 700,
              status: 'completed',
              input: { resourceCount: 3 },
              output: { compliant: true },
              children: []
            },
            {
              operation: 'costOptimization.optimizeCosts',
              startTime: new Date(Date.now() - 3100),
              endTime: new Date(Date.now() - 2300),
              duration: 800,
              status: 'completed',
              input: { resourceCount: 3 },
              output: { estimatedCost: 328.00 },
              children: []
            },
            {
              operation: 'generator.generateFiles',
              startTime: new Date(Date.now() - 2200),
              endTime: new Date(Date.now() - 500),
              duration: 1700,
              status: 'completed',
              input: { resourceCount: 3 },
              output: { downloadUrl: '/download/files.zip' },
              children: []
            }
          ]
        }
      ]
    };
  }

  private calculateRequestsPerHour(traces: TraceDetails[], timeRange: { start: Date; end: Date }): number[] {
    const hours = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60));
    const requestsPerHour = new Array(hours).fill(0);

    traces.forEach(trace => {
      const hourIndex = Math.floor((trace.startTime.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60));
      if (hourIndex >= 0 && hourIndex < hours) {
        requestsPerHour[hourIndex]++;
      }
    });

    return requestsPerHour;
  }

  private getTopOperations(traces: TraceDetails[]): Array<{ operation: string; count: number; avgDuration: number }> {
    const operationStats: Record<string, { count: number; totalDuration: number }> = {};

    traces.forEach(trace => {
      trace.operations.forEach(op => {
        if (!operationStats[op.operation]) {
          operationStats[op.operation] = { count: 0, totalDuration: 0 };
        }
        operationStats[op.operation].count++;
        operationStats[op.operation].totalDuration += op.duration || 0;
      });
    });

    return Object.entries(operationStats)
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

export const traceQueryService = new TraceQueryService();