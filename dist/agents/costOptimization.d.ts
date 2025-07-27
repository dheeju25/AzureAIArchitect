import { AzureResource, CostOptimization } from '../types';
export declare class CostOptimizationAgent {
    private azureAIEndpoint;
    private azureAIKey;
    constructor();
    optimizeCosts(resources: AzureResource[], budgetConstraint?: number, targetRegion?: string, traceId?: string): Promise<CostOptimization>;
    private callAzureAIFoundryAgent;
    private getCurrentPricing;
    private parseOptimizationResult;
}
//# sourceMappingURL=costOptimization.d.ts.map