"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAgent = void 0;
const tracing_1 = require("../services/tracing");
const logger_1 = require("../utils/logger");
const analyzer_1 = require("./analyzer");
const policyCompliance_1 = require("./policyCompliance");
const costOptimization_1 = require("./costOptimization");
const generator_1 = require("./generator");
const websocket_1 = require("../services/websocket");
class OrchestratorAgent {
    constructor() {
        this.analyzerAgent = new analyzer_1.AnalyzerAgent();
        this.policyAgent = new policyCompliance_1.PolicyComplianceAgent();
        this.costAgent = new costOptimization_1.CostOptimizationAgent();
        this.generatorAgent = new generator_1.GeneratorAgent();
    }
    async processArchitectureDiagram(request, providedTraceId) {
        const { span, traceId } = await tracing_1.tracingService.startTrace('orchestrator.processArchitectureDiagram', providedTraceId);
        const startTime = Date.now();
        const wsService = websocket_1.WebSocketService.getInstance();
        try {
            logger_1.logger.info('Starting architecture diagram processing', {
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
            const analysis = await tracing_1.tracingService.traceAgentCall('analyzer', 'extractArchitecture', traceId, { fileName: request.fileName, fileSize: request.diagramFile.length }, () => this.analyzerAgent.analyzeDiagram(request.diagramFile, request.fileName, traceId));
            wsService.emitAgentComplete(traceId, 'analyzer', 'extractArchitecture', {
                resourceCount: analysis.resources.length,
                pattern: analysis.architecture.pattern,
                complexity: analysis.architecture.complexity
            });
            logger_1.logger.info('Diagram analysis completed', {
                traceId,
                resourceCount: analysis.resources.length,
                dependencyCount: analysis.dependencies.length,
                pattern: analysis.architecture.pattern
            });
            // Step 2: Check policy compliance
            wsService.emitAgentStart(traceId, 'policyCompliance', 'validateCompliance');
            wsService.emitOverallProgress(traceId, 35, 'checking policy compliance');
            const complianceReport = await tracing_1.tracingService.traceAgentCall('policyCompliance', 'validateCompliance', traceId, { resources: analysis.resources, complianceProfile: request.userRequirements?.complianceProfile }, () => this.policyAgent.validateCompliance(analysis.resources, request.userRequirements?.complianceProfile, traceId));
            wsService.emitAgentComplete(traceId, 'policyCompliance', 'validateCompliance', {
                compliant: complianceReport.compliant,
                violationCount: complianceReport.violations.length
            });
            logger_1.logger.info('Policy compliance check completed', {
                traceId,
                compliant: complianceReport.compliant,
                violationCount: complianceReport.violations.length
            });
            // Step 3: Optimize costs
            wsService.emitAgentStart(traceId, 'costOptimization', 'optimizeCosts');
            wsService.emitOverallProgress(traceId, 60, 'optimizing costs');
            const costOptimization = await tracing_1.tracingService.traceAgentCall('costOptimization', 'optimizeCosts', traceId, {
                resources: analysis.resources,
                budgetConstraint: request.userRequirements?.budgetConstraint,
                targetRegion: request.userRequirements?.targetRegion
            }, () => this.costAgent.optimizeCosts(analysis.resources, request.userRequirements?.budgetConstraint, request.userRequirements?.targetRegion, traceId));
            wsService.emitAgentComplete(traceId, 'costOptimization', 'optimizeCosts', {
                estimatedMonthlyCost: costOptimization.estimatedMonthlyCost,
                potentialSavings: costOptimization.potentialSavings,
                optimizationCount: costOptimization.optimizations.length
            });
            logger_1.logger.info('Cost optimization completed', {
                traceId,
                estimatedMonthlyCost: costOptimization.estimatedMonthlyCost,
                potentialSavings: costOptimization.potentialSavings,
                optimizationCount: costOptimization.optimizations.length
            });
            // Step 4: Generate Bicep and YAML files
            wsService.emitAgentStart(traceId, 'generator', 'generateFiles');
            wsService.emitOverallProgress(traceId, 80, 'generating bicep files');
            const generatedFiles = await tracing_1.tracingService.traceAgentCall('generator', 'generateFiles', traceId, {
                analysis,
                complianceReport,
                costOptimization,
                userRequirements: request.userRequirements
            }, () => this.generatorAgent.generateFiles(analysis, complianceReport, costOptimization, request.userRequirements, traceId));
            wsService.emitAgentComplete(traceId, 'generator', 'generateFiles');
            // Step 5: Package files for download
            wsService.emitAgentProgress(traceId, 'generator', 'packageFiles', 90, 'packaging files for download');
            const downloadUrl = await tracing_1.tracingService.traceAgentCall('generator', 'packageFiles', traceId, { traceId }, () => this.generatorAgent.packageFiles(generatedFiles, traceId, complianceReport, costOptimization));
            wsService.emitOverallProgress(traceId, 100, 'processing completed');
            const processingTime = Date.now() - startTime;
            const result = {
                traceId,
                analysis,
                complianceReport,
                costOptimization,
                generatedFiles,
                downloadUrl,
                processingTime
            };
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
            logger_1.logger.info('Architecture diagram processing completed successfully', {
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
            await tracing_1.tracingService.endTrace(span, traceId, 'orchestrator.processArchitectureDiagram', 'completed');
            return result;
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Architecture diagram processing failed', {
                traceId,
                error: errorMessage,
                processingTime
            });
            // Emit error to WebSocket so UI can display it
            wsService.emitAgentError(traceId, 'orchestrator', 'processing', errorMessage);
            await tracing_1.tracingService.endTrace(span, traceId, 'orchestrator.processArchitectureDiagram', 'failed', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async getProcessingStatus(traceId) {
        const { span } = await tracing_1.tracingService.startTrace('orchestrator.getProcessingStatus', traceId);
        try {
            // In a real implementation, this would query the tracing system
            // for the current status of the processing pipeline
            logger_1.logger.info('Retrieving processing status', { traceId });
            const status = {
                traceId,
                status: 'completed', // This would be dynamic based on actual trace data
                currentStep: 'generator',
                completedSteps: ['analyzer', 'policyCompliance', 'costOptimization'],
                timestamp: new Date().toISOString()
            };
            await tracing_1.tracingService.endTrace(span, traceId, 'orchestrator.getProcessingStatus', 'completed');
            return status;
        }
        catch (error) {
            await tracing_1.tracingService.endTrace(span, traceId, 'orchestrator.getProcessingStatus', 'failed', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
}
exports.OrchestratorAgent = OrchestratorAgent;
//# sourceMappingURL=orchestrator.js.map