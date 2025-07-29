import { AzureResource, PolicyComplianceResult, PolicyViolation } from '../types';
export declare class PolicyComplianceAgent {
    private azureAIEndpoint;
    private azureAIKey;
    constructor();
    validateCompliance(resources: AzureResource[], complianceProfile?: string, traceId?: string): Promise<PolicyComplianceResult>;
    autoFixPolicyViolations(resources: AzureResource[], violations: PolicyViolation[]): Promise<any[]>;
    generateDetailedPolicyReport(result: PolicyComplianceResult, complianceProfile?: string): Promise<string>;
    private callAzureAIFoundryAgent;
    private getApplicablePolicies;
    private getPolicyDescription;
    private getComplianceRequirement;
    private getRemediationGuidance;
    private getViolationImpact;
    private parseComplianceResult;
}
//# sourceMappingURL=policyCompliance.d.ts.map