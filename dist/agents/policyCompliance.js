"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyComplianceAgent = void 0;
const logger_1 = require("../utils/logger");
class PolicyComplianceAgent {
    constructor() {
        this.azureAIEndpoint = process.env.POLICY_COMPLIANCE_AGENT_URL || '';
        this.azureAIKey = process.env.AZURE_AI_FOUNDRY_API_KEY || '';
    }
    async validateCompliance(resources, complianceProfile, traceId) {
        logger_1.logger.info('Starting policy compliance validation', {
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
            logger_1.logger.info('Policy compliance validation completed', {
                traceId,
                compliant: result.compliant,
                violationCount: result.violations.length,
                criticalViolations: result.violations.filter(v => v.severity === 'critical').length
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Policy compliance validation failed', {
                traceId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async callAzureAIFoundryAgent(payload) {
        logger_1.logger.info('Calling Azure AI Foundry Policy Compliance Agent', {
            endpoint: this.azureAIEndpoint,
            resourceCount: payload.resources.length,
            complianceProfile: payload.complianceProfile
        });
        // Simulate AI policy validation
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Mock compliance validation result
        const violations = [];
        // Check for common policy violations
        payload.resources.forEach((resource) => {
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
    async getApplicablePolicies(complianceProfile) {
        const profiles = {
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
    parseComplianceResult(result) {
        const violations = result.violations.map((violation) => ({
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
exports.PolicyComplianceAgent = PolicyComplianceAgent;
//# sourceMappingURL=policyCompliance.js.map