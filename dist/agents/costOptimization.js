"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostOptimizationAgent = void 0;
const logger_1 = require("../utils/logger");
class CostOptimizationAgent {
    constructor() {
        this.azureAIEndpoint = process.env.COST_OPTIMIZATION_AGENT_URL || '';
        this.azureAIKey = process.env.AZURE_AI_FOUNDRY_API_KEY || '';
    }
    async optimizeCosts(resources, budgetConstraint, targetRegion, traceId) {
        logger_1.logger.info('Starting cost optimization analysis', {
            traceId,
            resourceCount: resources.length,
            budgetConstraint,
            targetRegion
        });
        try {
            // Call Azure AI Foundry agent for cost optimization
            const optimizationResult = await this.callAzureAIFoundryAgent({
                resources,
                budgetConstraint,
                targetRegion,
                currentPricing: await this.getCurrentPricing(targetRegion || 'East US')
            });
            const result = this.parseOptimizationResult(optimizationResult);
            // Generate detailed cost report
            result.costReport = await this.generateDetailedCostReport(result, resources, budgetConstraint, targetRegion);
            logger_1.logger.info('Cost optimization analysis completed', {
                traceId,
                estimatedMonthlyCost: result.estimatedMonthlyCost,
                potentialSavings: result.potentialSavings,
                optimizationCount: result.optimizations.length
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Cost optimization analysis failed', {
                traceId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async callAzureAIFoundryAgent(payload) {
        logger_1.logger.info('Calling Azure AI Foundry Cost Optimization Agent', {
            endpoint: this.azureAIEndpoint,
            resourceCount: payload.resources.length,
            budgetConstraint: payload.budgetConstraint
        });
        // Simulate AI cost optimization
        await new Promise(resolve => setTimeout(resolve, 1800));
        // Mock cost optimization analysis
        const optimizations = [];
        let totalEstimatedCost = 0;
        let totalPotentialSavings = 0;
        payload.resources.forEach((resource) => {
            let resourceCost = 0;
            let resourceSavings = 0;
            switch (resource.type) {
                case 'Microsoft.Web/sites':
                    resourceCost = 73.00; // Standard tier monthly cost
                    if (resource.properties.sku === 'Premium') {
                        optimizations.push({
                            resource: resource.name,
                            suggestion: 'Downgrade from Premium to Standard tier if traffic allows',
                            potentialSavings: 30.00,
                            impact: 'medium'
                        });
                        resourceSavings += 30.00;
                    }
                    break;
                case 'Microsoft.Sql/servers/databases':
                    resourceCost = 230.00; // Standard tier monthly cost
                    optimizations.push({
                        resource: resource.name,
                        suggestion: 'Consider using Azure SQL Database serverless for variable workloads',
                        potentialSavings: 45.00,
                        impact: 'high'
                    });
                    resourceSavings += 45.00;
                    break;
                case 'Microsoft.Storage/storageAccounts':
                    resourceCost = 25.00; // Standard LRS monthly cost
                    if (resource.properties.accessTier !== 'Cool') {
                        optimizations.push({
                            resource: resource.name,
                            suggestion: 'Move infrequently accessed data to Cool tier',
                            potentialSavings: 8.00,
                            impact: 'low'
                        });
                        resourceSavings += 8.00;
                    }
                    break;
                default:
                    resourceCost = 50.00; // Default estimate
            }
            totalEstimatedCost += resourceCost;
            totalPotentialSavings += resourceSavings;
        });
        // Add general optimization suggestions
        optimizations.push({
            resource: 'All resources',
            suggestion: 'Implement Azure Reserved Instances for 1-year commitment',
            potentialSavings: totalEstimatedCost * 0.15, // 15% savings with reserved instances
            impact: 'high'
        });
        totalPotentialSavings += totalEstimatedCost * 0.15;
        return {
            estimatedMonthlyCost: totalEstimatedCost,
            optimizations,
            potentialSavings: totalPotentialSavings,
            budgetCompliant: payload.budgetConstraint ? totalEstimatedCost <= payload.budgetConstraint : true
        };
    }
    async getCurrentPricing(region) {
        // Mock pricing data - in real implementation, this would call Azure Pricing API
        const pricingData = {
            'Microsoft.Web/sites.Standard': 73.00,
            'Microsoft.Web/sites.Premium': 103.00,
            'Microsoft.Sql/servers/databases.Standard': 230.00,
            'Microsoft.Sql/servers/databases.Premium': 460.00,
            'Microsoft.Storage/storageAccounts.Standard_LRS': 25.00,
            'Microsoft.Storage/storageAccounts.Premium_LRS': 35.00
        };
        // Apply regional pricing modifiers
        const regionModifiers = {
            'East US': 1.0,
            'West US': 1.05,
            'North Europe': 1.1,
            'East Asia': 1.15
        };
        const modifier = regionModifiers[region] || 1.0;
        const adjustedPricing = {};
        Object.entries(pricingData).forEach(([key, value]) => {
            adjustedPricing[key] = value * modifier;
        });
        return adjustedPricing;
    }
    async generateDetailedCostReport(result, resources, budgetConstraint, targetRegion) {
        const timestamp = new Date().toISOString();
        const budgetStatus = budgetConstraint ?
            (result.estimatedMonthlyCost <= budgetConstraint ? '✅ Within Budget' : '⚠️ Over Budget') :
            'No Budget Constraint';
        const budgetVariance = budgetConstraint ?
            ((result.estimatedMonthlyCost - budgetConstraint) / budgetConstraint * 100).toFixed(1) :
            'N/A';
        return `# Cost Optimization Report

Generated by AI Superman Cost Optimization Agent
Date: ${timestamp}
Target Region: ${targetRegion || 'East US'}

## Executive Summary

- **Total Estimated Monthly Cost**: $${result.estimatedMonthlyCost.toFixed(2)}
- **Total Potential Savings**: $${result.potentialSavings.toFixed(2)}
- **Optimization Opportunities**: ${result.optimizations.length}
- **Budget Status**: ${budgetStatus}
${budgetConstraint ? `- **Budget Variance**: ${budgetVariance}%` : ''}
- **Cost Efficiency Score**: ${this.calculateEfficiencyScore(result)}%

## Resource Cost Breakdown

${resources.map(resource => {
            const resourceCost = this.estimateResourceCost(resource, targetRegion);
            const optimization = result.optimizations.find(opt => opt.resource === resource.name);
            return `### ${resource.name} (${resource.type})

- **Monthly Cost**: $${resourceCost.toFixed(2)}
- **Cost Category**: ${this.getCostCategory(resourceCost)}
- **Optimization Available**: ${optimization ? '✅ Yes' : '❌ None'}
${optimization ? `- **Potential Savings**: $${optimization.potentialSavings.toFixed(2)}
- **Impact Level**: ${optimization.impact.toUpperCase()}` : ''}
`;
        }).join('\n')}

## Optimization Recommendations

${result.optimizations.length === 0 ? '✅ Your architecture is already cost-optimized!' :
            result.optimizations.map((opt, index) => `### ${index + 1}. ${opt.resource}

**Recommendation**: ${opt.suggestion}
**Monthly Savings**: $${opt.potentialSavings.toFixed(2)}
**Impact Level**: ${opt.impact.toUpperCase()}
**Priority**: ${this.getOptimizationPriority(opt.potentialSavings, opt.impact)}

**Implementation Steps**:
${this.getImplementationSteps(opt.suggestion)}
`).join('\n')}

## Cost Optimization Strategies

### Short-term (0-30 days)
- Review and rightsize compute resources
- Optimize storage configurations
- Enable auto-scaling where appropriate
- Review unused or underutilized resources

### Medium-term (1-3 months)
- Consider reserved instances for stable workloads
- Implement automated cost management policies
- Optimize data transfer and bandwidth usage
- Review licensing and subscription options

### Long-term (3-12 months)
- Architect for cloud-native cost efficiency
- Implement comprehensive monitoring and alerting
- Consider hybrid cloud strategies
- Plan for long-term capacity and growth

## Cost Management Best Practices

1. **Monitoring**: Set up Azure Cost Management alerts
2. **Budgets**: Implement departmental and project budgets
3. **Tagging**: Use consistent resource tagging for cost allocation
4. **Reviews**: Conduct monthly cost optimization reviews
5. **Automation**: Implement automated shutdown for development resources

## Regional Cost Comparison

${this.generateRegionalComparison(result.estimatedMonthlyCost, targetRegion)}

## Budget Analysis

${budgetConstraint ? `
Your current budget constraint is $${budgetConstraint.toFixed(2)} per month.

- **Current Estimate**: $${result.estimatedMonthlyCost.toFixed(2)}
- **After Optimizations**: $${(result.estimatedMonthlyCost - result.potentialSavings).toFixed(2)}
- **Budget Utilization**: ${(result.estimatedMonthlyCost / budgetConstraint * 100).toFixed(1)}%
- **Optimized Budget Utilization**: ${((result.estimatedMonthlyCost - result.potentialSavings) / budgetConstraint * 100).toFixed(1)}%
` : 'No budget constraint specified. Consider setting budget limits for better cost control.'}

## Next Steps

1. **Immediate Actions**: Review high-impact optimizations first
2. **Testing**: Implement changes in development environment first  
3. **Monitoring**: Set up cost alerts and monitoring dashboards
4. **Regular Reviews**: Schedule monthly cost optimization reviews

---
*This report was generated automatically by AI Superman's Cost Optimization Agent*
`;
    }
    estimateResourceCost(resource, region) {
        // Simple cost estimation logic - in real implementation, use Azure Pricing API
        const costs = {
            'Microsoft.Web/sites': 73.00,
            'Microsoft.Sql/servers/databases': 230.00,
            'Microsoft.Storage/storageAccounts': 25.00,
            'Microsoft.Network/virtualNetworks': 5.00,
            'Microsoft.Compute/virtualMachines': 150.00
        };
        const baseCost = costs[resource.type] || 50.00;
        const regionMultiplier = region === 'North Europe' ? 1.1 : 1.0;
        return baseCost * regionMultiplier;
    }
    getCostCategory(cost) {
        if (cost < 30)
            return 'Low Cost';
        if (cost < 100)
            return 'Medium Cost';
        if (cost < 300)
            return 'High Cost';
        return 'Very High Cost';
    }
    calculateEfficiencyScore(result) {
        const savingsRatio = result.potentialSavings / result.estimatedMonthlyCost;
        const baseScore = 85; // Base efficiency score
        const penalty = Math.min(savingsRatio * 30, 25); // More potential savings = lower efficiency
        return Math.max(Math.round(baseScore - penalty), 60);
    }
    getOptimizationPriority(savings, impact) {
        if (savings > 50 || impact === 'high')
            return 'HIGH';
        if (savings > 20 || impact === 'medium')
            return 'MEDIUM';
        return 'LOW';
    }
    getImplementationSteps(suggestion) {
        const steps = {
            'Downgrade': '1. Test performance in staging\n2. Update ARM template\n3. Deploy during maintenance window\n4. Monitor performance metrics',
            'serverless': '1. Analyze usage patterns\n2. Configure serverless settings\n3. Update connection strings\n4. Monitor costs and performance',
            'reserved': '1. Analyze 12-month usage patterns\n2. Purchase appropriate reservations\n3. Apply reservations to resources\n4. Monitor utilization rates',
            'lifecycle': '1. Configure lifecycle policies\n2. Set retention periods\n3. Enable archiving rules\n4. Monitor storage costs'
        };
        for (const [key, value] of Object.entries(steps)) {
            if (suggestion.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }
        return '1. Review current configuration\n2. Plan implementation approach\n3. Test in development environment\n4. Deploy and monitor';
    }
    generateRegionalComparison(baseCost, currentRegion) {
        const regions = ['East US', 'North Europe', 'West US', 'East Asia'];
        const multipliers = { 'East US': 1.0, 'North Europe': 1.1, 'West US': 1.05, 'East Asia': 1.15 };
        return regions.map(region => {
            const cost = baseCost * (multipliers[region] || 1.0);
            const current = region === currentRegion ? ' (Current)' : '';
            return `- **${region}${current}**: $${cost.toFixed(2)}/month`;
        }).join('\n');
    }
    parseOptimizationResult(result) {
        const optimizations = result.optimizations.map((opt) => ({
            resource: opt.resource,
            suggestion: opt.suggestion,
            potentialSavings: opt.potentialSavings,
            impact: opt.impact
        }));
        return {
            estimatedMonthlyCost: result.estimatedMonthlyCost,
            optimizations,
            potentialSavings: result.potentialSavings
        };
    }
}
exports.CostOptimizationAgent = CostOptimizationAgent;
//# sourceMappingURL=costOptimization.js.map