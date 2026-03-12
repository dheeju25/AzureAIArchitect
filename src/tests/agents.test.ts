/**
 * Agent unit tests
 *
 * These tests mock the OpenAI client so they run without real credentials.
 * They verify:
 *   • BaseAgent retry logic
 *   • Zod schema validation
 *   • Agent output shape correctness
 */
import { z } from 'zod';

// ── Minimal stub so tests don’t need a real OpenAI key ────────────────────
jest.mock('openai', () => {
  const mockCreate = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    AzureOpenAI: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    _mockCreate: mockCreate,
  };
});

const getOpenAIMock = () =>
  (jest.requireMock('openai') as any)._mockCreate as jest.Mock;

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeOpenAIResponse(content: object) {
  return {
    choices: [{ message: { content: JSON.stringify(content) } }],
    model:   'gpt-4o',
    usage:   { prompt_tokens: 100, completion_tokens: 200 },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('PolicyComplianceAgent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns structured compliance result', async () => {
    const mockPayload = {
      compliant:       false,
      overallScore:    55,
      violations: [{
        resource:    'app-frontend',
        policy:      'HTTPS only',
        severity:    'high',
        description: 'HTTP traffic allowed',
        remediation: 'Set httpsOnly = true',
        autoFixable: true,
      }],
      recommendations: ['Enable Defender for Cloud'],
      fixedResources:  [],
      policyReport:    'Two critical issues found.',
      profileApplied:  'Default',
    };
    getOpenAIMock().mockResolvedValueOnce(makeOpenAIResponse(mockPayload));

    const { PolicyComplianceAgent } = await import('../agents/policyCompliance');
    const agent = new PolicyComplianceAgent();
    const result = await agent.validateCompliance(
      [{ type: 'Microsoft.Web/sites', name: 'app-frontend', properties: {} }],
      'Default',
      'trace-001',
    );

    expect(result.compliant).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('high');
    expect(result.recommendations).toContain('Enable Defender for Cloud');
  });

  it('retries on transient failure then succeeds', async () => {
    const mockPayload = {
      compliant: true, overallScore: 95, violations: [],
      recommendations: [], fixedResources: [],
      policyReport: 'All clear.', profileApplied: 'Default',
    };
    getOpenAIMock()
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValueOnce(makeOpenAIResponse(mockPayload));

    const { PolicyComplianceAgent } = await import('../agents/policyCompliance');
    const agent = new PolicyComplianceAgent();
    const result = await agent.validateCompliance(
      [{ type: 'Microsoft.Storage/storageAccounts', name: 'store01', properties: {} }],
      'Default',
      'trace-002',
    );

    expect(result.compliant).toBe(true);
    expect(getOpenAIMock()).toHaveBeenCalledTimes(2);
  });
});

describe('CostOptimizationAgent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns structured cost optimisation result', async () => {
    const mockPayload = {
      estimatedMonthlyCost: 850,
      budgetStatus:         'within',
      currency:             'USD',
      resourceCosts: [{
        resourceName:  'app-frontend',
        resourceType:  'Microsoft.Web/sites',
        estimatedCost: 146,
        sku:           'P2v3',
        pricingTier:   'PremiumV3',
        costDrivers:   ['2 vCPU, 8 GB RAM, West Europe'],
      }],
      optimizations: [{
        resource:         'app-frontend',
        suggestion:       'Downgrade to B2ms',
        potentialSavings: 80,
        impact:           'medium',
        category:         'immediate',
        effort:           'low',
        riskLevel:        'low',
        action:           'Change sku.name to B2ms',
      }],
      potentialSavings:        80,
      reservedInstanceSavings: 120,
      spotInstanceSavings:     0,
      costReport:              'Optimisations identified.',
    };
    getOpenAIMock().mockResolvedValueOnce(makeOpenAIResponse(mockPayload));

    const { CostOptimizationAgent } = await import('../agents/costOptimization');
    const agent = new CostOptimizationAgent();
    const result = await agent.optimizeCosts(
      [{ type: 'Microsoft.Web/sites', name: 'app-frontend', properties: {} }],
      { compliant: true, violations: [], recommendations: [] },
      1000,
      'West Europe',
      'trace-003',
    );

    expect(result.estimatedMonthlyCost).toBe(850);
    expect(result.optimizations).toHaveLength(1);
    expect(result.potentialSavings).toBe(80);
  });
});

describe('Zod schema edge cases', () => {
  it('PolicyComplianceAgent rejects missing required fields', async () => {
    getOpenAIMock().mockResolvedValue(makeOpenAIResponse({
      // missing compliant, overallScore, violations, etc.
      foo: 'bar',
    }));

    const { PolicyComplianceAgent } = await import('../agents/policyCompliance');
    const agent = new PolicyComplianceAgent();
    await expect(
      agent.validateCompliance(
        [{ type: 'Microsoft.Web/sites', name: 'x', properties: {} }],
        'Default',
        'trace-004',
      )
    ).rejects.toThrow(/schema validation failed/);
  });
});
