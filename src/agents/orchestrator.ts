import { Span } from '@opentelemetry/api';
import { tracingService } from '../services/tracing';
import { logger } from '../utils/logger';
import { DiagramAnalysis, PolicyComplianceResult, CostOptimization, GeneratedFiles } from '../types';
import { AnalyzerAgent } from './analyzer';
import { PolicyComplianceAgent } from './policyCompliance';
import { CostOptimizationAgent } from './costOptimization';
import { GeneratorAgent } from './generator';
import { WebSocketService } from '../services/websocket';

export interface OrchestrationRequest {
  diagramFile: Buffer;
  fileName: string;
  userRequirements?: {
    targetRegion?: string;
    budgetConstraint?: number;
    complianceProfile?: string;
    scalabilityRequirements?: string;
  };
}

export interface OrchestrationResult {
  traceId: string;
  analysis: DiagramAnalysis;
  complianceReport: PolicyComplianceResult;
  costOptimization: CostOptimization;
  generatedFiles: GeneratedFiles;
  downloadUrl: string;
  processingTime: number;
}

export class OrchestratorAgent {
  private analyzerAgent: AnalyzerAgent;
  private policyAgent: PolicyComplianceAgent;
  private costAgent: CostOptimizationAgent;
  private generatorAgent: GeneratorAgent;

  constructor() {
    this.analyzerAgent = new AnalyzerAgent();
    this.policyAgent = new PolicyComplianceAgent();
    this.costAgent = new CostOptimizationAgent();
    this.generatorAgent = new GeneratorAgent();
  }

  async processArchitectureDiagram(request: OrchestrationRequest, providedTraceId?: string): Promise<OrchestrationResult> {
    const { span, traceId } = await tracingService.startTrace('orchestrator.processArchitectureDiagram', providedTraceId);
    const startTime = Date.now();
    const wsService = WebSocketService.getInstance();

    try {
      logger.info('Starting architecture diagram processing', {
        traceId,
        fileName: request.fileName,
        fileSize: request.diagramFile.length
      });

      // Emit initial processing start event
      wsService.emitOverallProgress(traceId, 0, 'initializing');

      span.setAttributes({
        'request.fileName': request.fileName,
        'request.fileSize': request.diagramFile.length,
        'request.targetRegion': request.userRequirements?.targetRegion || 'not-specified',
        'request.budgetConstraint': request.userRequirements?.budgetConstraint || 0
      });

      // Step 1: Analyze the diagram
      wsService.emitAgentStart(traceId, 'analyzer', 'extractArchitecture');
      wsService.emitOverallProgress(traceId, 10, 'analyzing diagram');
      
      const analysis = await tracingService.traceAgentCall(
        'analyzer',
        'extractArchitecture',
        traceId,
        { fileName: request.fileName, fileSize: request.diagramFile.length },
        () => this.analyzerAgent.analyzeDiagram(request.diagramFile, request.fileName, traceId)
      );

      wsService.emitAgentComplete(traceId, 'analyzer', 'extractArchitecture', {
        resourceCount: analysis.resources.length,
        pattern: analysis.architecture.pattern,
        complexity: analysis.architecture.complexity
      });

      logger.info('Diagram analysis completed', {
        traceId,
        resourceCount: analysis.resources.length,
        dependencyCount: analysis.dependencies.length,
        pattern: analysis.architecture.pattern
      });

      // Step 2: Check policy compliance
      wsService.emitAgentStart(traceId, 'policyCompliance', 'validateCompliance');
      wsService.emitOverallProgress(traceId, 35, 'checking policy compliance');
      
      const complianceReport = await tracingService.traceAgentCall(
        'policyCompliance',
        'validateCompliance',
        traceId,
        { resources: analysis.resources, complianceProfile: request.userRequirements?.complianceProfile },
        () => this.policyAgent.validateCompliance(
          analysis.resources,
          request.userRequirements?.complianceProfile,
          traceId
        )
      );

      wsService.emitAgentComplete(traceId, 'policyCompliance', 'validateCompliance', {
        compliant: complianceReport.compliant,
        violationCount: complianceReport.violations.length
      });

      logger.info('Policy compliance check completed', {
        traceId,
        compliant: complianceReport.compliant,
        violationCount: complianceReport.violations.length
      });

      // Step 3: Optimize costs
      wsService.emitAgentStart(traceId, 'costOptimization', 'optimizeCosts');
      wsService.emitOverallProgress(traceId, 60, 'optimizing costs');
      
      const costOptimization = await tracingService.traceAgentCall(
        'costOptimization',
        'optimizeCosts',
        traceId,
        { 
          resources: analysis.resources, 
          budgetConstraint: request.userRequirements?.budgetConstraint,
          targetRegion: request.userRequirements?.targetRegion 
        },
        () => this.costAgent.optimizeCosts(
          analysis.resources,
          request.userRequirements?.budgetConstraint,
          request.userRequirements?.targetRegion,
          traceId
        )
      );

      wsService.emitAgentComplete(traceId, 'costOptimization', 'optimizeCosts', {
        estimatedMonthlyCost: costOptimization.estimatedMonthlyCost,
        potentialSavings: costOptimization.potentialSavings,
        optimizationCount: costOptimization.optimizations.length
      });

      logger.info('Cost optimization completed', {
        traceId,
        estimatedMonthlyCost: costOptimization.estimatedMonthlyCost,
        potentialSavings: costOptimization.potentialSavings,
        optimizationCount: costOptimization.optimizations.length
      });

      // Step 4: Generate Bicep and YAML files
      wsService.emitAgentStart(traceId, 'generator', 'generateFiles');
      wsService.emitOverallProgress(traceId, 80, 'generating bicep files');
      
      const generatedFiles = await tracingService.traceAgentCall(
        'generator',
        'generateFiles',
        traceId,
        {
          analysis,
          complianceReport,
          costOptimization,
          userRequirements: request.userRequirements
        },
        () => this.generatorAgent.generateFiles(
          analysis,
          complianceReport,
          costOptimization,
          request.userRequirements,
          traceId
        )
      );

      // Step 5: Package files for download
      wsService.emitAgentProgress(traceId, 'generator', 'packageFiles', 90, 'packaging files for download');
      
      const downloadUrl = await tracingService.traceAgentCall(
        'generator',
        'packageFiles',
        traceId,
        { traceId },
        () => this.generatorAgent.packageFiles(generatedFiles, traceId, complianceReport, costOptimization)
      );

      // Complete generator agent after packaging
      wsService.emitAgentComplete(traceId, 'generator', 'packageFiles');
      wsService.emitOverallProgress(traceId, 100, 'processing completed');
      
      const processingTime = Date.now() - startTime;

      const result: OrchestrationResult = {
        traceId,
        analysis,
        complianceReport,
        costOptimization,
        generatedFiles,
        downloadUrl,
        processingTime
      };

      // Mark orchestrator as completed
      wsService.emitAgentComplete(traceId, 'orchestrator', 'orchestration', {
        processingTime,
        downloadUrl,
        summary: {
          resourceCount: analysis.resources.length,
          compliant: complianceReport.compliant,
          estimatedMonthlyCost: costOptimization.estimatedMonthlyCost
        }
      });

      // Emit final completion event
      wsService.emitProcessingUpdate({
        traceId,
        agent: 'orchestrator',
        status: 'completed',
        step: 'all-agents-completed',
        progress: 100,
        message: 'All agents completed successfully',
        timestamp: new Date().toISOString(),
        data: {
          processingTime,
          downloadUrl,
          summary: {
            resourceCount: analysis.resources.length,
            compliant: complianceReport.compliant,
            estimatedMonthlyCost: costOptimization.estimatedMonthlyCost
          }
        }
      });

      logger.info('Architecture diagram processing completed successfully', {
        traceId,
        processingTime,
        downloadUrl
      });

      span.setAttributes({
        'result.processingTime': processingTime,
        'result.resourceCount': analysis.resources.length,
        'result.compliant': complianceReport.compliant,
        'result.estimatedCost': costOptimization.estimatedMonthlyCost
      });

      await tracingService.endTrace(span, traceId, 'orchestrator.processArchitectureDiagram', 'completed');
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Architecture diagram processing failed', {
        traceId,
        error: errorMessage,
        processingTime
      });

      // Emit error to WebSocket so UI can display it
      wsService.emitAgentError(traceId, 'orchestrator', 'processing', errorMessage);

      await tracingService.endTrace(
        span,
        traceId,
        'orchestrator.processArchitectureDiagram',
        'failed',
        error instanceof Error ? error : new Error('Unknown error')
      );

      throw error;
    }
  }

  async getProcessingStatus(traceId: string): Promise<any> {
    const { span } = await tracingService.startTrace('orchestrator.getProcessingStatus', traceId);

    try {
      // In a real implementation, this would query the tracing system
      // for the current status of the processing pipeline
      logger.info('Retrieving processing status', { traceId });

      const status = {
        traceId,
        status: 'completed', // This would be dynamic based on actual trace data
        currentStep: 'generator',
        completedSteps: ['analyzer', 'policyCompliance', 'costOptimization'],
        timestamp: new Date().toISOString()
      };

      await tracingService.endTrace(span, traceId, 'orchestrator.getProcessingStatus', 'completed');
      return status;

    } catch (error) {
      await tracingService.endTrace(
        span,
        traceId,
        'orchestrator.getProcessingStatus',
        'failed',
        error instanceof Error ? error : new Error('Unknown error')
      );
      throw error;
    }
  }
}