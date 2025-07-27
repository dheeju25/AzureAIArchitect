import { AzureResource, PolicyComplianceResult } from '../types';
export declare class PolicyComplianceAgent {
    private azureAIEndpoint;
    private azureAIKey;
    constructor();
    validateCompliance(resources: AzureResource[], complianceProfile?: string, traceId?: string): Promise<PolicyComplianceResult>;
    private callAzureAIFoundryAgent;
    private getApplicablePolicies;
    private parseComplianceResult;
}
//# sourceMappingURL=policyCompliance.d.ts.map