/**
 * PolicyComplianceAgent
 *
 * Takes the list of resources from AnalyzerAgent and:
 *   • Validates each one against Azure Policy best practices
 *   • Enforces the chosen compliance profile (Default | HIPAA | PCI DSS | SOX)
 *   • Returns violations with severity, remediation steps, and auto-fix suggestions
 *   • Produces a human-readable compliance report
 *
 * The agent receives the FULL analysis context so it can reason about
 * cross-resource issues (e.g. SQL not behind private endpoint in the same VNet).
 */
import { z } from 'zod';
import { BaseAgent, ProgressCallback, AgentCallResult } from './base';
import { logger } from '../utils/logger';
import { AzureResource, PolicyComplianceResult } from '../types';

// ── Output schema ────────────────────────────────────────────────────────────
const ViolationSchema = z.object({
  resource:    z.string(),
  policy:      z.string(),
  severity:    z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  remediation: z.string(),
  autoFixable: z.boolean().default(false),
  policyId:    z.string().optional().describe('Azure Policy initiative ID if applicable'),
});

const ComplianceOutputSchema = z.object({
  compliant:        z.boolean(),
  overallScore:     z.number().min(0).max(100).describe('Compliance score 0-100'),
  violations:       z.array(ViolationSchema),
  recommendations:  z.array(z.string()),
  fixedResources:   z.array(z.record(z.unknown())).optional(),
  policyReport:     z.string().describe('Executive summary of compliance status'),
  profileApplied:   z.string(),
});

type ComplianceOutput = z.infer<typeof ComplianceOutputSchema>;

// ── Agent ────────────────────────────────────────────────────────────────────
export class PolicyComplianceAgent extends BaseAgent {
  constructor() {
    super({ name: 'PolicyComplianceAgent', role: 'Azure Policy & compliance validator' });
  }

  async validateCompliance(
    resources:         AzureResource[],
    complianceProfile: string = 'Default',
    traceId:           string,
    onProgress?:       ProgressCallback,
  ): Promise<PolicyComplianceResult> {
    logger.info('PolicyComplianceAgent: starting compliance check', {
      traceId, profile: complianceProfile, resourceCount: resources.length,
    });
    onProgress?.('compliance-check', 10, `Validating against ${complianceProfile} profile...`);

    const systemPrompt = this.buildSystemPrompt(complianceProfile);

    const userContent = JSON.stringify({
      complianceProfile,
      resources,
      instruction: 'Validate these Azure resources against the specified compliance profile. Return the JSON as specified.',
    }, null, 2);

    const result: AgentCallResult<ComplianceOutput> = await this.callLLM(
      systemPrompt,
      userContent,
      ComplianceOutputSchema,
      traceId,
      onProgress,
    );

    onProgress?.('complete', 100, 'Compliance check complete');

    logger.info('PolicyComplianceAgent: compliance check complete', {
      traceId,
      compliant:       result.data.compliant,
      overallScore:    result.data.overallScore,
      violationCount:  result.data.violations.length,
      durationMs:      result.durationMs,
    });

    return {
      compliant:       result.data.compliant,
      violations:      result.data.violations,
      recommendations: result.data.recommendations,
      fixedResources:  result.data.fixedResources,
      policyReport:    result.data.policyReport,
    };
  }

  private buildSystemPrompt(profile: string): string {
    const profileRules: Record<string, string> = {
      Default: `Azure Security Benchmark v3 and Microsoft Cloud Security Benchmark.
Check: HTTPS-only, TLS 1.2+, CMK encryption at rest, RBAC least-privilege, diagnostic settings enabled, resource locks on production, private endpoints for PaaS, no public IPs on backend resources, required tagging (environment, owner, costCenter).`,
      HIPAA: `HIPAA/HITRUST controls on top of the Default profile.
Additional checks: AuditIfNotExists for all data stores, customer-managed keys mandatory, audit logging 90-day retention, data residency within specified regions, PHI data classification tags, Just-In-Time VM access, Azure Defender enabled for all resource types.`,
      'PCI DSS': `PCI DSS v4.0 controls on top of the Default profile.
Additional checks: network segmentation (no direct internet to cardholder data), WAF on all public endpoints, DDoS Protection Standard, Key Vault for all secrets/keys, MFA enforced, vulnerability assessment enabled, no legacy TLS/SSL.`,
      SOX: `Sarbanes-Oxley IT controls on top of the Default profile.
Additional checks: immutable audit logs (WORM storage), change management tagging, segregation of duties (separate prod/dev subscriptions), access reviews, backup policies with tested recovery, configuration drift alerts.`,
    };

    const rules = profileRules[profile] ?? profileRules['Default'];

    return `You are an Azure compliance expert and certified cloud security architect.

Apply the following compliance rules to the provided list of Azure resources:
${rules}

For each violation found:
  - name the exact resource
  - cite the policy or control being violated
  - assign severity: critical | high | medium | low
  - give a clear remediation step
  - flag autoFixable = true only if a Bicep property change can fix it with no re-architecture

Compute an overallScore 0-100 (100 = fully compliant, 0 = completely non-compliant).
Set compliant = true only if there are zero critical or high violations.

Respond ONLY with valid JSON (no markdown):
{
  "compliant": false,
  "overallScore": 62,
  "violations": [
    {
      "resource": "sql-db",
      "policy": "SQL databases should use customer-managed keys",
      "severity": "high",
      "description": "Database uses Microsoft-managed keys; CMK required for ${profile}.",
      "remediation": "Enable CMK via Key Vault and set keyVaultUri in Bicep.",
      "autoFixable": true,
      "policyId": "ac01ad65-10e5-46df-bdd9-6b0cad13e1d2"
    }
  ],
  "recommendations": ["Enable Microsoft Defender for Cloud"],
  "fixedResources": [],
  "policyReport": "Executive summary...",
  "profileApplied": "${profile}"
}`;
  }
}
