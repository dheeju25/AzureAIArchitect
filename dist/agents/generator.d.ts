import { DiagramAnalysis, PolicyComplianceResult, CostOptimization, GeneratedFiles } from '../types';
export declare class GeneratorAgent {
    private azureAIEndpoint;
    private azureAIKey;
    private outputDir;
    constructor();
    generateFiles(analysis: DiagramAnalysis, complianceReport: PolicyComplianceResult, costOptimization: CostOptimization, userRequirements?: any, traceId?: string): Promise<GeneratedFiles>;
    packageFiles(files: GeneratedFiles, traceId: string, complianceReport?: PolicyComplianceResult, costOptimization?: CostOptimization): Promise<string>;
    private callAzureAIFoundryAgent;
    private generateBicepContent;
    private generateBicepResource;
    private getBicepResourceName;
    private generatePipelineContent;
    private generateParametersContent;
    private generateReadmeContent;
    private generateSummaryReport;
    private generateFixedResourcesReport;
    private getSecurityBenefits;
    private parseGenerationResult;
}
//# sourceMappingURL=generator.d.ts.map