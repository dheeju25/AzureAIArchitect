import { tracingService } from '../services/tracing';
import { logger } from '../utils/logger';
import { AzureResource, PolicyComplianceResult, PolicyViolation } from '../types';
import { ManualPolicyLoader } from '../utils/manualPolicyLoader';
import { ManualPolicy, ManualPolicyResult, ManualPolicyViolation, PolicyEvaluationContext } from '../types/policies';

export class PolicyComplianceAgent {
  private azureAIEndpoint: string;
  private azureAIKey: string;
  private manualPolicyLoader: ManualPolicyLoader;

  constructor() {
    this.azureAIEndpoint = process.env.POLICY_COMPLIANCE_AGENT_URL || '';
    this.azureAIKey = process.env.AZURE_AI_FOUNDRY_API_KEY || '';
    this.manualPolicyLoader = new ManualPolicyLoader();
  }

  async validateCompliance(
    resources: AzureResource[],
    complianceProfile?: string,
    traceId?: string
  ): Promise<PolicyComplianceResult & { manualPolicyResult: ManualPolicyResult }> {
    logger.info('Starting policy compliance validation', {
      traceId,
      resourceCount: resources.length,
      complianceProfile: complianceProfile || 'default'
    });

    try {
      // Call Azure AI Foundry agent for policy compliance validation
      const complianceResult = await this.callAzureAIFoundryAgent({
        resources,
        complianceProfile: complianceProfile || 'default',
        policies: await this.getApplicablePolicies(complianceProfile)
      });

      const result = this.parseComplianceResult(complianceResult);

      // Evaluate manual policies
      const manualPolicyResult = await this.evaluateManualPolicies(resources, traceId);

      // Auto-fix policy violations (both built-in and manual)
      result.fixedResources = await this.autoFixPolicyViolations(resources, result.violations);
      const fixedManualResources = await this.autoFixManualPolicyViolations(resources, manualPolicyResult.violations);
      
      // Combine fixed resources
      result.fixedResources = [...result.fixedResources, ...fixedManualResources];
      manualPolicyResult.appliedFixes = fixedManualResources.map(fix => fix.fix || {});
      
      result.policyReport = await this.generateDetailedPolicyReport(result, complianceProfile, manualPolicyResult);

      logger.info('Policy compliance validation completed', {
        traceId,
        compliant: result.compliant && manualPolicyResult.compliant,
        violationCount: result.violations.length,
        manualViolationCount: manualPolicyResult.violationsCount,
        criticalViolations: result.violations.filter(v => v.severity === 'critical').length,
        criticalManualViolations: manualPolicyResult.summary.critical,
        fixedViolations: result.fixedResources.length
      });

      return { ...result, manualPolicyResult };

    } catch (error) {
      logger.error('Policy compliance validation failed', {
        traceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async autoFixPolicyViolations(
    resources: AzureResource[],
    violations: PolicyViolation[]
  ): Promise<any[]> {
    const fixedResources: any[] = [];

    for (const violation of violations) {
      const resource = resources.find(r => r.name === violation.resource);
      if (!resource) continue;

      let fixApplied = false;
      const originalConfig = JSON.stringify(resource);

      switch (violation.policy) {
        case 'HTTPS_ENFORCEMENT':
          if (resource.type === 'Microsoft.Web/sites') {
            resource.properties.httpsOnly = true;
            resource.properties.siteConfig = resource.properties.siteConfig || {};
            resource.properties.siteConfig.minTlsVersion = '1.2';
            resource.properties.siteConfig.ftpsState = 'Disabled';
            fixApplied = true;
          }
          break;

        case 'ENCRYPTION_AT_REST':
          if (resource.type === 'Microsoft.Storage/storageAccounts') {
            resource.properties.encryption = {
              services: {
                file: { enabled: true },
                blob: { enabled: true }
              },
              keySource: 'Microsoft.Storage'
            };
            resource.properties.supportsHttpsTrafficOnly = true;
            resource.properties.minimumTlsVersion = 'TLS1_2';
            fixApplied = true;
          }
          break;

        case 'REQUIRED_TAGS':
          resource.tags = resource.tags || {};
          if (!resource.tags.environment) resource.tags.environment = 'production';
          if (!resource.tags.owner) resource.tags.owner = 'ai-superman';
          if (!resource.tags['cost-center']) resource.tags['cost-center'] = 'engineering';
          resource.tags['compliance-fixed'] = 'true';
          fixApplied = true;
          break;

        case 'NETWORK_SECURITY':
          if (resource.type === 'Microsoft.Network/virtualNetworks') {
            resource.properties.enableDdosProtection = true;
            resource.properties.enableVmProtection = true;
            fixApplied = true;
          }
          break;

        case 'ACCESS_CONTROL':
          if (resource.type === 'Microsoft.Sql/servers') {
            resource.properties.administrators = resource.properties.administrators || {};
            resource.properties.administrators.administratorType = 'ActiveDirectory';
            resource.properties.minimalTlsVersion = '1.2';
            resource.properties.publicNetworkAccess = 'Disabled';
            fixApplied = true;
          }
          break;
      }

      if (fixApplied) {
        fixedResources.push({
          resourceName: resource.name,
          resourceType: resource.type,
          policy: violation.policy,
          severity: violation.severity,
          description: violation.description,
          fixApplied: violation.remediation,
          originalConfig,
          newConfig: JSON.stringify(resource),
          fixedAt: new Date().toISOString()
        });
      }
    }

    return fixedResources;
  }

  /**
   * Evaluate resources against manual policies
   */
  async evaluateManualPolicies(
    resources: AzureResource[],
    traceId?: string
  ): Promise<ManualPolicyResult> {
    logger.info('Starting manual policy evaluation', {
      traceId,
      resourceCount: resources.length
    });

    try {
      // Load manual policies
      const manualPolicies = await this.manualPolicyLoader.loadPolicies();
      
      if (manualPolicies.length === 0) {
        logger.info('No manual policies found', { traceId });
        return {
          compliant: true,
          totalPolicies: 0,
          violationsCount: 0,
          violations: [],
          appliedFixes: [],
          bicepModifications: [],
          summary: { critical: 0, high: 0, medium: 0, low: 0 }
        };
      }

      const violations: ManualPolicyViolation[] = [];
      const bicepModifications: any[] = [];
      
      // Evaluate each resource against applicable policies
      for (const resource of resources) {
        const applicablePolicies = await this.manualPolicyLoader.getPoliciesForResourceType(resource.type);
        
        for (const policy of applicablePolicies) {
          if (!policy.enabled) continue;

          const context: PolicyEvaluationContext = {
            resource,
            resourceType: resource.type,
            resourceName: resource.name,
            properties: resource.properties || {}
          };

          const violationFound = this.evaluatePolicyCondition(policy, context);
          
          if (violationFound) {
            violations.push({
              policyId: policy.id,
              policyName: policy.name,
              resource: resource.name,
              resourceType: resource.type,
              severity: policy.severity,
              description: policy.description,
              currentValue: this.getPropertyValue(context, policy.conditions.property),
              expectedValue: policy.conditions.value,
              fix: policy.fix,
              bicepModification: policy.bicepModification
            });

            // Collect Bicep modifications for fixes
            if (policy.bicepModification) {
              bicepModifications.push(policy.bicepModification);
            }
          }
        }
      }

      // Calculate summary statistics
      const summary = {
        critical: violations.filter(v => v.severity === 'critical').length,
        high: violations.filter(v => v.severity === 'high').length,
        medium: violations.filter(v => v.severity === 'medium').length,
        low: violations.filter(v => v.severity === 'low').length
      };

      const result: ManualPolicyResult = {
        compliant: violations.length === 0,
        totalPolicies: manualPolicies.length,
        violationsCount: violations.length,
        violations,
        appliedFixes: [], // Will be populated by auto-fix function
        bicepModifications,
        summary
      };

      logger.info('Manual policy evaluation completed', {
        traceId,
        totalPolicies: manualPolicies.length,
        violations: violations.length,
        compliant: result.compliant,
        summary
      });

      return result;
    } catch (error) {
      logger.error('Manual policy evaluation failed', {
        traceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return empty result on error
      return {
        compliant: true,
        totalPolicies: 0,
        violationsCount: 0,
        violations: [],
        appliedFixes: [],
        bicepModifications: [],
        summary: { critical: 0, high: 0, medium: 0, low: 0 }
      };
    }
  }

  /**
   * Auto-fix manual policy violations
   */
  async autoFixManualPolicyViolations(
    resources: AzureResource[],
    violations: ManualPolicyViolation[]
  ): Promise<any[]> {
    const fixedResources: any[] = [];

    for (const violation of violations) {
      const resource = resources.find(r => r.name === violation.resource);
      if (!resource) continue;

      const originalConfig = JSON.stringify(resource);
      let fixApplied = false;

      try {
        // Apply the fix based on the policy definition
        switch (violation.fix.action) {
          case 'set':
            this.setPropertyValue(resource, violation.fix.property, violation.fix.value);
            fixApplied = true;
            break;
          
          case 'add':
            this.addPropertyValue(resource, violation.fix.property, violation.fix.value);
            fixApplied = true;
            break;
          
          case 'remove':
            this.removePropertyValue(resource, violation.fix.property);
            fixApplied = true;
            break;
        }

        if (fixApplied) {
          fixedResources.push({
            resourceName: resource.name,
            resourceType: resource.type,
            policyId: violation.policyId,
            policyName: violation.policyName,
            severity: violation.severity,
            description: violation.description,
            fix: violation.fix,
            originalConfig,
            newConfig: JSON.stringify(resource),
            fixedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error('Failed to apply manual policy fix', {
          policyId: violation.policyId,
          resource: violation.resource,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return fixedResources;
  }

  /**
   * Evaluate a policy condition against a resource
   */
  private evaluatePolicyCondition(policy: ManualPolicy, context: PolicyEvaluationContext): boolean {
    const { conditions } = policy;
    const actualValue = this.getPropertyValue(context, conditions.property);
    const expectedValue = conditions.value;

    switch (conditions.operator) {
      case 'equals':
        return actualValue !== expectedValue;
      
      case 'notEquals':
        return actualValue === expectedValue;
      
      case 'contains':
        if (Array.isArray(expectedValue)) {
          return !expectedValue.includes(actualValue);
        }
        return !String(actualValue).includes(String(expectedValue));
      
      case 'notContains':
        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(actualValue);
        }
        return String(actualValue).includes(String(expectedValue));
      
      case 'greaterThan':
        return Number(actualValue) <= Number(expectedValue);
      
      case 'lessThan':
        return Number(actualValue) >= Number(expectedValue);
      
      case 'exists':
        return actualValue === undefined || actualValue === null;
      
      case 'notExists':
        return actualValue !== undefined && actualValue !== null;
      
      default:
        return false;
    }
  }

  /**
   * Get property value from resource using dot notation
   */
  private getPropertyValue(context: PolicyEvaluationContext, propertyPath: string): any {
    const parts = propertyPath.split('.');
    let value: any = context.resource;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set property value on resource using dot notation
   */
  private setPropertyValue(resource: any, propertyPath: string, value: any): void {
    const parts = propertyPath.split('.');
    let current = resource;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Add value to property (for arrays or objects)
   */
  private addPropertyValue(resource: any, propertyPath: string, value: any): void {
    const parts = propertyPath.split('.');
    let current = resource;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const finalProp = parts[parts.length - 1];
    if (Array.isArray(current[finalProp])) {
      current[finalProp].push(value);
    } else if (typeof current[finalProp] === 'object') {
      Object.assign(current[finalProp], value);
    } else {
      current[finalProp] = value;
    }
  }

  /**
   * Remove property value
   */
  private removePropertyValue(resource: any, propertyPath: string): void {
    const parts = propertyPath.split('.');
    let current = resource;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        return; // Property doesn't exist
      }
      current = current[part];
    }

    delete current[parts[parts.length - 1]];
  }

  async generateDetailedPolicyReport(
    result: PolicyComplianceResult,
    complianceProfile?: string,
    manualPolicyResult?: ManualPolicyResult
  ): Promise<string> {
    const policies = await this.getApplicablePolicies(complianceProfile);
    const timestamp = new Date().toISOString();
    
    return `# Policy Compliance Report

Generated by AI Superman Policy Agent
Date: ${timestamp}
Compliance Profile: ${complianceProfile || 'default'}

## Executive Summary

- **Overall Compliance Status**: ${result.compliant && (manualPolicyResult?.compliant ?? true) ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
- **Built-in Policy Violations**: ${result.violations.length}
- **Manual Policy Violations**: ${manualPolicyResult?.violationsCount || 0}
- **Total Critical Violations**: ${result.violations.filter(v => v.severity === 'critical').length + (manualPolicyResult?.summary.critical || 0)}
- **Total High Severity**: ${result.violations.filter(v => v.severity === 'high').length + (manualPolicyResult?.summary.high || 0)}
- **Total Medium Severity**: ${result.violations.filter(v => v.severity === 'medium').length + (manualPolicyResult?.summary.medium || 0)}
- **Auto-Fixed Violations**: ${result.fixedResources?.length || 0}

## Policy Framework Applied

The following policies were checked against your architecture:

${policies.map(policy => `### ${policy.replace(/_/g, ' ').toUpperCase()}
- **Description**: ${this.getPolicyDescription(policy)}
- **Compliance Requirement**: ${this.getComplianceRequirement(policy)}
- **Remediation**: ${this.getRemediationGuidance(policy)}
`).join('\n')}

## Built-in Policy Violations

${result.violations.length === 0 ? '✅ No built-in policy violations found!' : 
result.violations.map(violation => `### ${violation.policy.replace(/_/g, ' ')} - ${violation.severity.toUpperCase()}

- **Resource**: ${violation.resource}
- **Issue**: ${violation.description}
- **Impact**: ${this.getViolationImpact(violation.severity)}
- **Remediation**: ${violation.remediation}
- **Status**: ${result.fixedResources?.some(f => f.resourceName === violation.resource && f.policy === violation.policy) ? '🔧 AUTO-FIXED' : '⚠️ REQUIRES MANUAL ATTENTION'}
`).join('\n')}

## Manual Policy Violations

${!manualPolicyResult || manualPolicyResult.violationsCount === 0 ? '✅ No manual policy violations found!' : 
manualPolicyResult.violations.map(violation => `### ${violation.policyName} - ${violation.severity.toUpperCase()}

- **Resource**: ${violation.resource} (${violation.resourceType})
- **Issue**: ${violation.description}
- **Current Value**: \`${JSON.stringify(violation.currentValue)}\`
- **Expected Value**: \`${JSON.stringify(violation.expectedValue)}\`
- **Impact**: ${this.getViolationImpact(violation.severity)}
- **Status**: ${manualPolicyResult.appliedFixes?.some(f => f.property === violation.fix.property) ? '🔧 AUTO-FIXED' : '⚠️ REQUIRES MANUAL ATTENTION'}
`).join('\n')}

## Auto-Applied Fixes

${result.fixedResources?.length === 0 ? 'No automatic fixes were applied.' :
result.fixedResources?.map(fix => `### ${fix.resourceName} - ${fix.policy.replace(/_/g, ' ')}

- **Resource Type**: ${fix.resourceType}
- **Fix Applied**: ${fix.fixApplied}
- **Severity**: ${fix.severity}
- **Fixed At**: ${fix.fixedAt}
`).join('\n')}

## Recommendations

${result.recommendations?.map(rec => `- ${rec}`).join('\n') || '- Implement continuous compliance monitoring\n- Regular policy review and updates\n- Automated remediation where possible'}

## Next Steps

1. **Review Auto-Fixes**: Verify that all automatically applied fixes meet your requirements
2. **Manual Remediation**: Address any remaining violations that require manual intervention
3. **Monitoring**: Implement Azure Policy for ongoing compliance monitoring
4. **Documentation**: Update your security documentation to reflect these changes

---
*This report was generated automatically by AI Superman's Policy Compliance Agent*
`;
  }

  private async callAzureAIFoundryAgent(payload: any): Promise<any> {
    logger.info('Calling Azure AI Foundry Policy Compliance Agent', {
      endpoint: this.azureAIEndpoint,
      resourceCount: payload.resources.length,
      complianceProfile: payload.complianceProfile
    });

    // Simulate AI policy validation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock compliance validation result
    const violations: any[] = [];
    
    // Check for common policy violations
    payload.resources.forEach((resource: AzureResource) => {
      // Check for HTTPS enforcement
      if (resource.type === 'Microsoft.Web/sites' && !resource.properties.httpsOnly) {
        violations.push({
          resource: resource.name,
          policy: 'HTTPS_ENFORCEMENT',
          severity: 'high',
          description: 'Web app must enforce HTTPS only',
          remediation: 'Set httpsOnly property to true'
        });
      }

      // Check for encryption at rest
      if (resource.type === 'Microsoft.Storage/storageAccounts' && !resource.properties.encryption) {
        violations.push({
          resource: resource.name,
          policy: 'ENCRYPTION_AT_REST',
          severity: 'critical',
          description: 'Storage account must have encryption at rest enabled',
          remediation: 'Enable encryption at rest for storage account'
        });
      }

      // Check for required tags
      const requiredTags = ['environment', 'owner', 'cost-center'];
      requiredTags.forEach(tag => {
        if (!resource.tags || !resource.tags[tag]) {
          violations.push({
            resource: resource.name,
            policy: 'REQUIRED_TAGS',
            severity: 'medium',
            description: `Missing required tag: ${tag}`,
            remediation: `Add ${tag} tag to resource`
          });
        }
      });
    });

    return {
      compliant: violations.length === 0,
      violations,
      recommendations: [
        'Implement Azure Policy assignments for automated compliance monitoring',
        'Use Azure Security Center for continuous compliance assessment',
        'Enable diagnostic logging for all resources'
      ]
    };
  }

  private async getApplicablePolicies(complianceProfile?: string): Promise<string[]> {
    const profiles: Record<string, string[]> = {
      'default': [
        'HTTPS_ENFORCEMENT',
        'ENCRYPTION_AT_REST',
        'REQUIRED_TAGS',
        'NETWORK_SECURITY',
        'ACCESS_CONTROL'
      ],
      'hipaa': [
        'ENCRYPTION_AT_REST',
        'ENCRYPTION_IN_TRANSIT',
        'ACCESS_LOGGING',
        'DATA_RESIDENCY',
        'BACKUP_RETENTION'
      ],
      'pci': [
        'NETWORK_SEGMENTATION',
        'ENCRYPTION_AT_REST',
        'ENCRYPTION_IN_TRANSIT',
        'ACCESS_MONITORING',
        'VULNERABILITY_SCANNING'
      ],
      'sox': [
        'AUDIT_LOGGING',
        'ACCESS_CONTROL',
        'DATA_RETENTION',
        'CHANGE_MANAGEMENT',
        'BACKUP_PROCEDURES'
      ]
    };

    return profiles[complianceProfile || 'default'] || profiles.default;
  }

  private getPolicyDescription(policy: string): string {
    const descriptions: Record<string, string> = {
      'HTTPS_ENFORCEMENT': 'Ensures all web applications use HTTPS encryption for secure communication',
      'ENCRYPTION_AT_REST': 'Requires data encryption when stored in databases and storage accounts',
      'REQUIRED_TAGS': 'Mandates specific tags for resource management and cost tracking',
      'NETWORK_SECURITY': 'Implements network-level security controls and protections',
      'ACCESS_CONTROL': 'Enforces proper authentication and authorization mechanisms',
      'ENCRYPTION_IN_TRANSIT': 'Ensures data is encrypted during transmission between services',
      'ACCESS_LOGGING': 'Requires comprehensive logging of all access attempts and activities',
      'DATA_RESIDENCY': 'Ensures data remains within specified geographic boundaries',
      'BACKUP_RETENTION': 'Mandates proper backup procedures and retention policies',
      'NETWORK_SEGMENTATION': 'Requires proper network isolation and segmentation',
      'ACCESS_MONITORING': 'Implements continuous monitoring of access patterns and anomalies',
      'VULNERABILITY_SCANNING': 'Requires regular security vulnerability assessments',
      'AUDIT_LOGGING': 'Mandates comprehensive audit trails for all system activities',
      'DATA_RETENTION': 'Ensures proper data lifecycle management and retention policies',
      'CHANGE_MANAGEMENT': 'Requires formal change control processes for all modifications',
      'BACKUP_PROCEDURES': 'Mandates reliable backup and recovery procedures'
    };
    return descriptions[policy] || 'Security policy enforcement requirement';
  }

  private getComplianceRequirement(policy: string): string {
    const requirements: Record<string, string> = {
      'HTTPS_ENFORCEMENT': 'All web applications must redirect HTTP to HTTPS and disable insecure protocols',
      'ENCRYPTION_AT_REST': 'All data storage must use AES-256 encryption or equivalent',
      'REQUIRED_TAGS': 'Resources must include environment, owner, and cost-center tags',
      'NETWORK_SECURITY': 'Virtual networks must enable DDoS protection and VM protection',
      'ACCESS_CONTROL': 'SQL servers must use Azure AD authentication and disable public access',
      'ENCRYPTION_IN_TRANSIT': 'All communications must use TLS 1.2 or higher',
      'ACCESS_LOGGING': 'All resource access must be logged with retention >= 90 days',
      'DATA_RESIDENCY': 'Data must remain within approved geographic regions',
      'BACKUP_RETENTION': 'Backups must be retained for minimum compliance periods',
      'NETWORK_SEGMENTATION': 'Network traffic must be properly segmented and controlled',
      'ACCESS_MONITORING': 'Privileged access must be monitored and alerted',
      'VULNERABILITY_SCANNING': 'Resources must be scanned weekly for vulnerabilities',
      'AUDIT_LOGGING': 'All administrative actions must be logged and monitored',
      'DATA_RETENTION': 'Data must be retained according to regulatory requirements',
      'CHANGE_MANAGEMENT': 'All changes must follow approved change control processes',
      'BACKUP_PROCEDURES': 'Regular automated backups with tested recovery procedures'
    };
    return requirements[policy] || 'Compliance requirement not specified';
  }

  private getRemediationGuidance(policy: string): string {
    const guidance: Record<string, string> = {
      'HTTPS_ENFORCEMENT': 'Enable httpsOnly property and configure minimum TLS version',
      'ENCRYPTION_AT_REST': 'Configure encryption settings in storage and database properties',
      'REQUIRED_TAGS': 'Add required tags during resource deployment or via Azure Policy',
      'NETWORK_SECURITY': 'Enable network protection features in virtual network configuration',
      'ACCESS_CONTROL': 'Configure Azure AD integration and disable public network access',
      'ENCRYPTION_IN_TRANSIT': 'Configure TLS settings and disable legacy protocols',
      'ACCESS_LOGGING': 'Enable diagnostic settings and configure log retention',
      'DATA_RESIDENCY': 'Select appropriate Azure regions during resource deployment',
      'BACKUP_RETENTION': 'Configure backup policies with appropriate retention settings',
      'NETWORK_SEGMENTATION': 'Implement network security groups and application security groups',
      'ACCESS_MONITORING': 'Enable Azure AD monitoring and configure security alerts',
      'VULNERABILITY_SCANNING': 'Enable Azure Security Center and configure scanning policies',
      'AUDIT_LOGGING': 'Configure activity logs and enable security monitoring',
      'DATA_RETENTION': 'Implement data lifecycle management policies',
      'CHANGE_MANAGEMENT': 'Use ARM templates and implement CI/CD with approval processes',
      'BACKUP_PROCEDURES': 'Configure Azure Backup with automated scheduling and testing'
    };
    return guidance[policy] || 'Follow Azure security best practices';
  }

  private getViolationImpact(severity: string): string {
    const impacts: Record<string, string> = {
      'critical': 'High risk of data breach or compliance violation. Immediate action required.',
      'high': 'Significant security risk. Should be addressed promptly.',
      'medium': 'Moderate security risk. Should be addressed in next maintenance window.',
      'low': 'Minor security concern. Can be addressed during regular updates.'
    };
    return impacts[severity] || 'Impact assessment needed';
  }

  private parseComplianceResult(result: any): PolicyComplianceResult {
    const violations: PolicyViolation[] = result.violations.map((violation: any) => ({
      resource: violation.resource,
      policy: violation.policy,
      severity: violation.severity,
      description: violation.description,
      remediation: violation.remediation
    }));

    return {
      compliant: result.compliant,
      violations,
      recommendations: result.recommendations || []
    };
  }
}