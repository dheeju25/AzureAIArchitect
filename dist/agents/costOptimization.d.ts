import { AzureResource, CostOptimization } from '../types';
export declare class CostOptimizationAgent {
    private azureAIEndpoint;
    private azureAIKey;
    constructor();
    optimizeCosts(resources: AzureResource[], budgetConstraint?: number, targetRegion?: string, traceId?: string): Promise<CostOptimization>;
    private callAzureAIFoundryAgent;
    private getCurrentPricing;
    generateDetailedCostReport(result: CostOptimization, resources: AzureResource[], budgetConstraint?: number, targetRegion?: string): Promise<string>;
    private estimateResourceCost;
    private getCostCategory;
    private calculateEfficiencyScore;
    private getOptimizationPriority;
    private getImplementationSteps;
    private generateRegionalComparison;
    private parseOptimizationResult;
}
//# sourceMappingURL=costOptimization.d.ts.map