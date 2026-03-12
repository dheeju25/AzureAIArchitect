// ============================================================
// Core domain types shared across all agents
// ============================================================

export interface TraceInfo {
  traceId:    string;
  spanId:     string;
  timestamp:  Date;
  operation:  string;
  status:     'started' | 'completed' | 'failed';
  duration?:  number;
  metadata?:  Record<string, any>;
  steps?:     TraceStep[];
}

export interface TraceStep {
  agent:      string;
  operation:  string;
  status:     'started' | 'completed' | 'failed';
  durationMs: number;
  timestamp:  string;
}

export interface AgentRequest {
  traceId:   string;
  operation: string;
  input:     any;
  timestamp: Date;
}

export interface AgentResponse {
  traceId:   string;
  operation: string;
  output:    any;
  timestamp: Date;
  duration:  number;
  status:    'success' | 'error';
  error?:    string;
}

// ── Diagram Analysis ───────────────────────────────────────────────────────────

export interface AzureResource {
  type:       string;                    // e.g. Microsoft.Web/sites
  name:       string;                    // kebab-case logical name
  properties: Record<string, unknown>;
  location?:  string;
  tags?:      Record<string, string>;
}

export interface ResourceDependency {
  source:      string;
  target:      string;
  type:        'depends_on' | 'references' | 'connects_to' | 'triggers' | 'reads_from' | 'writes_to';
  description?: string;
}

export interface ArchitecturePattern {
  pattern:     string;
  components:  string[];
  scalability: 'low' | 'medium' | 'high';
  complexity:  'simple' | 'moderate' | 'complex';
}

export interface DiagramAnalysis {
  resources:    AzureResource[];
  dependencies: ResourceDependency[];
  architecture: ArchitecturePattern;
}

// ── Policy Compliance ───────────────────────────────────────────────────────────

export interface PolicyViolation {
  resource:    string;
  policy:      string;
  severity:    'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation: string;
  autoFixable?: boolean;
  policyId?:   string;
}

export interface PolicyComplianceResult {
  compliant:        boolean;
  violations:       PolicyViolation[];
  recommendations:  string[];
  fixedResources?:  any[];
  policyReport?:    string;
}

// ── Cost Optimisation ───────────────────────────────────────────────────────────

export interface CostOptimizationSuggestion {
  resource:         string;
  suggestion:       string;
  potentialSavings: number;              // USD/month
  impact:           'low' | 'medium' | 'high';
  category?:        'immediate' | 'planned' | 'strategic';
  effort?:          'low' | 'medium' | 'high';
  riskLevel?:       'low' | 'medium' | 'high';
  action?:          string;
}

export interface CostOptimization {
  estimatedMonthlyCost: number;
  optimizations:        CostOptimizationSuggestion[];
  potentialSavings:     number;
  costReport?:          string;
}

// ── Generated Files ───────────────────────────────────────────────────────────

export interface GeneratedFiles {
  bicepFile:      string;
  pipelineYaml:   string;
  parametersFile: string;
  readmeFile:     string;
}
