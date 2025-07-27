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