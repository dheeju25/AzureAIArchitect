import { DiagramAnalysis, PolicyComplianceResult, CostOptimization, GeneratedFiles } from '../types';
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
export declare class OrchestratorAgent {
    private analyzerAgent;
    private policyAgent;
    private costAgent;
    private generatorAgent;
    constructor();
    processArchitectureDiagram(request: OrchestrationRequest, providedTraceId?: string): Promise<OrchestrationResult>;
    getProcessingStatus(traceId: string): Promise<any>;
}
//# sourceMappingURL=orchestrator.d.ts.map