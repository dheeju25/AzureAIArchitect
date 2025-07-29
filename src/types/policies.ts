/**
 * Types for Manual Policy System
 */

export interface ManualPolicy {
  id: string;
  name: string;
  category: 'security' | 'cost' | 'performance' | 'compliance' | 'custom';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  resourceTypes: string[];
  conditions: PolicyCondition;
  fix: PolicyFix;
  bicepModification: BicepModification;
  enabled: boolean;
  tags: string[];
}

export interface PolicyCondition {
  property: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
  value: any;
}

export interface PolicyFix {
  action: 'set' | 'remove' | 'add';
  property: string;
  value: any;
}

export interface BicepModification {
  template: string;
  parameters: string[];
}

export interface ManualPolicyViolation {
  policyId: string;
  policyName: string;
  resource: string;
  resourceType: string;
  severity: string;
  description: string;
  currentValue: any;
  expectedValue: any;
  fix: PolicyFix;
  bicepModification: BicepModification;
}

export interface ManualPolicyResult {
  compliant: boolean;
  totalPolicies: number;
  violationsCount: number;
  violations: ManualPolicyViolation[];
  appliedFixes: PolicyFix[];
  bicepModifications: BicepModification[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface PolicyEvaluationContext {
  resource: any;
  resourceType: string;
  resourceName: string;
  properties: any;
}

export interface PolicyLoader {
  loadPolicies(): Promise<ManualPolicy[]>;
  loadPoliciesByCategory(category: string): Promise<ManualPolicy[]>;
  validatePolicy(policy: ManualPolicy): boolean;
}