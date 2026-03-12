/**
 * CostOptimizationAgent
 *
 * Receives the resource list + compliance data and:
 *   • Estimates monthly cost per resource using Azure public pricing
 *   • Identifies right-sizing, reserved-instance, spot, and tier-downgrade opportunities
 *   • Validates against a budget constraint if provided
 *   • Categorises optimisations: Immediate | Planned | Strategic
 *   • Returns a structured cost report
 */
import { z } from 'zod';
import { BaseAgent, ProgressCallback, AgentCallResult } from './base';
import { logger } from '../utils/logger';
import { AzureResource, PolicyComplianceResult, CostOptimization } from '../types';

// ── Output schema ────────────────────────────────────────────────────────────
const OptimisationSchema = z.object({
  resource:         z.string(),
  suggestion:       z.string(),
  potentialSavings: z.number().describe('USD per month'),
  impact:           z.enum(['low', 'medium', 'high']),
  category:         z.enum(['immediate', 'planned', 'strategic']),
  effort:           z.enum(['low', 'medium', 'high']).describe('Implementation effort'),
  riskLevel:        z.enum(['low', 'medium', 'high']).describe('Risk of applying this optimisation'),
  action:           z.string().describe('Concrete action to take'),
});

const ResourceCostSchema = z.object({
  resourceName:    z.string(),
  resourceType:    z.string(),
  estimatedCost:   z.number().describe('USD per month'),
  sku:             z.string().optional(),
  pricingTier:     z.string().optional(),
  costDrivers:     z.array(z.string()),
});

const CostOutputSchema = z.object({
  estimatedMonthlyCost: z.number(),
  budgetStatus:         z.enum(['within', 'at-risk', 'exceeded', 'unknown']),
  resourceCosts:        z.array(ResourceCostSchema),
  optimizations:        z.array(OptimisationSchema),
  potentialSavings:     z.number(),
  costReport:           z.string(),
  reservedInstanceSavings: z.number().optional(),
  spotInstanceSavings:     z.number().optional(),
  currency:             z.string().default('USD'),
});

type CostOutput = z.infer<typeof CostOutputSchema>;

// ── Agent ────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a certified Azure FinOps practitioner and cost optimisation specialist.

Your job: estimate costs and identify savings opportunities for the provided Azure resources.

Cost estimation guidelines:
- Use publicly available Azure pricing (West Europe region unless told otherwise).
- Where exact SKU is unknown, use a reasonable mid-tier estimate and say so.
- Always state your pricing assumptions in costDrivers.

Optimisation categories:
  immediate  — can be applied today with no architecture change (e.g. resize, delete idle resource)
  planned    — requires a maintenance window or minor config change (e.g. reserved instances, storage tier)
  strategic  — requires architectural change but high long-term saving (e.g. migrate to serverless, consolidate DBs)

For each optimisation: be specific. "Downgrade App Service from P2v3 to B2ms" not just "resize".

Respond ONLY with valid JSON (no markdown):
{
  "estimatedMonthlyCost": 1240.50,
  "budgetStatus": "within",
  "currency": "USD",
  "resourceCosts": [
    {
      "resourceName": "app-frontend",
      "resourceType": "Microsoft.Web/sites",
      "estimatedCost": 146.00,
      "sku": "P2v3",
      "pricingTier": "PremiumV3",
      "costDrivers": ["2 vCPU, 8 GB RAM, West Europe, Linux"]
    }
  ],
  "optimizations": [
    {
      "resource": "app-frontend",
      "suggestion": "Downgrade from P2v3 to B2ms for non-peak workload",
      "potentialSavings": 80.00,
      "impact": "medium",
      "category": "immediate",
      "effort": "low",
      "riskLevel": "low",
      "action": "Change sku.name to B2ms in Bicep and redeploy."
    }
  ],
  "potentialSavings": 320.00,
  "reservedInstanceSavings": 150.00,
  "spotInstanceSavings": 0,
  "costReport": "Executive summary..."
}`;

export class CostOptimizationAgent extends BaseAgent {
  constructor() {
    super({ name: 'CostOptimizationAgent', role: 'Azure FinOps cost estimator and optimiser' });
  }

  async optimizeCosts(
    resources:         AzureResource[],
    complianceReport:  PolicyComplianceResult,
    budgetConstraint?: number,
    targetRegion?:     string,
    traceId:           string = '',
    onProgress?:       ProgressCallback,
  ): Promise<CostOptimization> {
    logger.info('CostOptimizationAgent: starting cost analysis', {
      traceId, resourceCount: resources.length, budgetConstraint, targetRegion,
    });
    onProgress?.('cost-analysis', 10, 'Estimating resource costs...');

    const userContent = JSON.stringify({
      targetRegion:      targetRegion ?? 'West Europe',
      budgetConstraintUSD: budgetConstraint ?? null,
      complianceSummary: {
        compliant:      complianceReport.compliant,
        violationCount: complianceReport.violations.length,
        // Include violations so agent can flag cost of remediation
        violations:     complianceReport.violations.map(v => ({
          resource:   v.resource,
          severity:   v.severity,
          autoFixable: (v as any).autoFixable,
        })),
      },
      resources,
      instruction: 'Estimate costs and identify optimisations. Return JSON as specified.',
    }, null, 2);

    const result: AgentCallResult<CostOutput> = await this.callLLM(
      SYSTEM_PROMPT,
      userContent,
      CostOutputSchema,
      traceId,
      onProgress,
    );

    onProgress?.('complete', 100, 'Cost analysis complete');

    logger.info('CostOptimizationAgent: cost analysis complete', {
      traceId,
      estimatedMonthlyCost: result.data.estimatedMonthlyCost,
      potentialSavings:     result.data.potentialSavings,
      optimisationCount:    result.data.optimizations.length,
      durationMs:           result.durationMs,
    });

    return {
      estimatedMonthlyCost: result.data.estimatedMonthlyCost,
      optimizations:        result.data.optimizations,
      potentialSavings:     result.data.potentialSavings,
      costReport:           result.data.costReport,
    };
  }
}
