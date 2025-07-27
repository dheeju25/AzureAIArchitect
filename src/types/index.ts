export interface TraceInfo {
  traceId: string;
  spanId: string;
  timestamp: Date;
  operation: string;
  status: 'started' | 'completed' | 'failed';
  duration?: number;
  metadata?: Record<string, any>;
}

export interface AgentRequest {
  traceId: string;
  operation: string;
  input: any;
  timestamp: Date;
}

export interface AgentResponse {
  traceId: string;
  operation: string;
  output: any;
  timestamp: Date;
  duration: number;
  status: 'success' | 'error';
  error?: string;
}

export interface DiagramAnalysis {
  resources: AzureResource[];
  dependencies: ResourceDependency[];
  architecture: ArchitecturePattern;
}

export interface AzureResource {
  type: string;
  name: string;
  properties: Record<string, any>;
  location?: string;
  tags?: Record<string, string>;
}

export interface ResourceDependency {
  source: string;
  target: string;
  type: 'depends_on' | 'references' | 'connects_to';
}

export interface ArchitecturePattern {
  pattern: string;
  components: string[];
  scalability: 'low' | 'medium' | 'high';
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface PolicyComplianceResult {
  compliant: boolean;
  violations: PolicyViolation[];
  recommendations: string[];
  fixedResources?: any[];
  policyReport?: string;
}

export interface PolicyViolation {
  resource: string;
  policy: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation: string;
}

export interface CostOptimization {
  estimatedMonthlyCost: number;
  optimizations: CostOptimizationSuggestion[];
  potentialSavings: number;
  costReport?: string;
}

export interface CostOptimizationSuggestion {
  resource: string;
  suggestion: string;
  potentialSavings: number;
  impact: 'low' | 'medium' | 'high';
}

export interface GeneratedFiles {
  bicepFile: string;
  pipelineYaml: string;
  parametersFile: string;
  readmeFile: string;
}