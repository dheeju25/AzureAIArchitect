/**
 * OrchestratorAgent
 *
 * The brain of the pipeline. Coordinates all agents in sequence,
 * passes context between them, emits real-time WebSocket progress,
 * and returns the final result.
 *
 * Agent execution order:
 *   1. AnalyzerAgent      → DiagramAnalysis
 *   2. PolicyCompliance   → ComplianceReport  (receives analysis)
 *   3. CostOptimization   → CostReport        (receives analysis + compliance)
 *   4. GeneratorAgent     → GeneratedFiles    (receives all three above)
 *   5. Package + ZIP
 */
import { tracingService } from '../services/tracing';
import { logger } from '../utils/logger';
import { DiagramAnalysis, PolicyComplianceResult, CostOptimization, GeneratedFiles } from '../types';
import { AnalyzerAgent } from './analyzer';
import { PolicyComplianceAgent } from './policyCompliance';
import { CostOptimizationAgent } from './costOptimization';
import { GeneratorAgent } from './generator';
import { WebSocketService } from '../services/websocket';

export interface OrchestrationRequest {
  diagramFile:       Buffer;
  fileName:          string;
  userRequirements?: {
    targetRegion?:            string;
    budgetConstraint?:        number;
    complianceProfile?:       string;
    scalabilityRequirements?: string;
  };
}

export interface OrchestrationResult {
  traceId:          string;
  analysis:         DiagramAnalysis;
  complianceReport: PolicyComplianceResult;
  costOptimization: CostOptimization;
  generatedFiles:   GeneratedFiles;
  downloadUrl:      string;
  processingTime:   number;
  agentMetrics: {
    analyzer:         { durationMs: number };
    policyCompliance: { durationMs: number };
    costOptimization: { durationMs: number };
    generator:        { durationMs: number };
  };
}

export class OrchestratorAgent {
  private analyzerAgent:  AnalyzerAgent;
  private policyAgent:    PolicyComplianceAgent;
  private costAgent:      CostOptimizationAgent;
  private generatorAgent: GeneratorAgent;

  constructor() {
    this.analyzerAgent  = new AnalyzerAgent();
    this.policyAgent    = new PolicyComplianceAgent();
    this.costAgent      = new CostOptimizationAgent();
    this.generatorAgent = new GeneratorAgent();
  }

  async processArchitectureDiagram(
    request:           OrchestrationRequest,
    providedTraceId?:  string,
  ): Promise<OrchestrationResult> {
    const { span, traceId } = await tracingService.startTrace(
      'orchestrator.processArchitectureDiagram',
      providedTraceId,
    );
    const startTime = Date.now();
    const ws        = WebSocketService.getInstance();
    const metrics   = { analyzer: 0, policyCompliance: 0, costOptimization: 0, generator: 0 };

    const progress = (agent: string, pct: number, step: string, detail?: string) => {
      ws.emitProcessingUpdate({
        traceId, agent, status: 'running', step,
        progress: pct, message: detail ?? step,
        timestamp: new Date().toISOString(),
      });
    };

    try {
      logger.info('OrchestratorAgent: pipeline starting', {
        traceId, fileName: request.fileName,
      });

      // ── Step 1: Analyze ───────────────────────────────────────────────
      ws.emitOverallProgress(traceId, 5, 'analyzing diagram');
      ws.emitAgentStart(traceId, 'analyzer', 'extractArchitecture');

      const t1 = Date.now();
      const analysis = await this.analyzerAgent.analyzeDiagram(
        request.diagramFile,
        request.fileName,
        traceId,
        (step, pct, detail) => progress('analyzer', Math.round(pct * 0.25), step, detail),
      );
      metrics.analyzer = Date.now() - t1;

      ws.emitAgentComplete(traceId, 'analyzer', 'extractArchitecture', {
        resourceCount: analysis.resources.length,
        pattern:       analysis.architecture.pattern,
        durationMs:    metrics.analyzer,
      });

      // ── Step 2: Compliance ───────────────────────────────────────────
      ws.emitOverallProgress(traceId, 30, 'checking policy compliance');
      ws.emitAgentStart(traceId, 'policyCompliance', 'validateCompliance');

      const t2 = Date.now();
      const complianceReport = await this.policyAgent.validateCompliance(
        analysis.resources,
        request.userRequirements?.complianceProfile ?? 'Default',
        traceId,
        (step, pct, detail) => progress('policyCompliance', 25 + Math.round(pct * 0.20), step, detail),
      );
      metrics.policyCompliance = Date.now() - t2;

      ws.emitAgentComplete(traceId, 'policyCompliance', 'validateCompliance', {
        compliant:      complianceReport.compliant,
        violationCount: complianceReport.violations.length,
        durationMs:     metrics.policyCompliance,
      });

      // ── Step 3: Cost optimisation ────────────────────────────────────
      ws.emitOverallProgress(traceId, 55, 'optimizing costs');
      ws.emitAgentStart(traceId, 'costOptimization', 'optimizeCosts');

      const t3 = Date.now();
      const costOptimization = await this.costAgent.optimizeCosts(
        analysis.resources,
        complianceReport,
        request.userRequirements?.budgetConstraint,
        request.userRequirements?.targetRegion,
        traceId,
        (step, pct, detail) => progress('costOptimization', 50 + Math.round(pct * 0.20), step, detail),
      );
      metrics.costOptimization = Date.now() - t3;

      ws.emitAgentComplete(traceId, 'costOptimization', 'optimizeCosts', {
        estimatedMonthlyCost: costOptimization.estimatedMonthlyCost,
        potentialSavings:     costOptimization.potentialSavings,
        durationMs:           metrics.costOptimization,
      });

      // ── Step 4: Generate Bicep + pipeline ────────────────────────────
      ws.emitOverallProgress(traceId, 75, 'generating bicep + pipeline');
      ws.emitAgentStart(traceId, 'generator', 'generateFiles');

      const t4 = Date.now();
      const generatedFiles = await this.generatorAgent.generateFiles(
        analysis,
        complianceReport,
        costOptimization,
        request.userRequirements,
        traceId,
        (step, pct, detail) => progress('generator', 70 + Math.round(pct * 0.20), step, detail),
      );
      metrics.generator = Date.now() - t4;

      // ── Step 5: Package ZIP ───────────────────────────────────────────
      ws.emitAgentProgress(traceId, 'generator', 'packageFiles', 92, 'Packaging ZIP...');
      const downloadUrl = await this.generatorAgent.packageFiles(
        generatedFiles, traceId, complianceReport, costOptimization,
      );

      ws.emitAgentComplete(traceId, 'generator', 'packageFiles', { downloadUrl });
      ws.emitOverallProgress(traceId, 100, 'processing completed');

      const processingTime = Date.now() - startTime;

      ws.emitProcessingUpdate({
        traceId,
        agent:     'orchestrator',
        status:    'completed',
        step:      'all-agents-completed',
        progress:  100,
        message:   'All agents completed successfully',
        timestamp: new Date().toISOString(),
        data: {
          processingTime, downloadUrl,
          summary: {
            resourceCount:        analysis.resources.length,
            compliant:            complianceReport.compliant,
            estimatedMonthlyCost: costOptimization.estimatedMonthlyCost,
            potentialSavings:     costOptimization.potentialSavings,
          },
        },
      });

      span.setAttributes({
        'result.processingTime':   processingTime,
        'result.resourceCount':    analysis.resources.length,
        'result.compliant':        complianceReport.compliant,
        'result.estimatedCost':    costOptimization.estimatedMonthlyCost,
        'result.potentialSavings': costOptimization.potentialSavings,
        'agent.analyzer.ms':       metrics.analyzer,
        'agent.policy.ms':         metrics.policyCompliance,
        'agent.cost.ms':           metrics.costOptimization,
        'agent.generator.ms':      metrics.generator,
      });

      await tracingService.endTrace(span, traceId, 'orchestrator.processArchitectureDiagram', 'completed');

      return {
        traceId, analysis, complianceReport, costOptimization,
        generatedFiles, downloadUrl, processingTime,
        agentMetrics: {
          analyzer:         { durationMs: metrics.analyzer },
          policyCompliance: { durationMs: metrics.policyCompliance },
          costOptimization: { durationMs: metrics.costOptimization },
          generator:        { durationMs: metrics.generator },
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('OrchestratorAgent: pipeline failed', { traceId, error: errorMessage });
      ws.emitAgentError(traceId, 'orchestrator', 'processing', errorMessage);
      await tracingService.endTrace(
        span, traceId, 'orchestrator.processArchitectureDiagram', 'failed',
        error instanceof Error ? error : new Error('Unknown error'),
      );
      throw error;
    }
  }

  /**
   * Returns live status by querying the trace store.
   * Previously this was hardcoded — now it reads real trace data.
   */
  async getProcessingStatus(traceId: string): Promise<any> {
    const { span } = await tracingService.startTrace('orchestrator.getProcessingStatus', traceId);
    try {
      const { traceQueryService } = await import('../services/traceQuery');
      const trace = await traceQueryService.getTraceDetails(traceId);

      const status = trace
        ? {
            traceId,
            status:    trace.status ?? 'unknown',
            steps:     trace.steps  ?? [],
            timestamp: new Date().toISOString(),
          }
        : {
            traceId,
            status:    'not-found',
            steps:     [],
            timestamp: new Date().toISOString(),
          };

      await tracingService.endTrace(span, traceId, 'orchestrator.getProcessingStatus', 'completed');
      return status;
    } catch (error) {
      await tracingService.endTrace(
        span, traceId, 'orchestrator.getProcessingStatus', 'failed',
        error instanceof Error ? error : new Error('Unknown'),
      );
      throw error;
    }
  }
}
