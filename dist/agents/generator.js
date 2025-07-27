"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratorAgent = void 0;
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const archiver_1 = __importDefault(require("archiver"));
class GeneratorAgent {
    constructor() {
        this.azureAIEndpoint = process.env.GENERATOR_AGENT_URL || '';
        this.azureAIKey = process.env.AZURE_AI_FOUNDRY_API_KEY || '';
        this.outputDir = process.env.OUTPUT_DIR || './generated';
    }
    async generateFiles(analysis, complianceReport, costOptimization, userRequirements, traceId) {
        logger_1.logger.info('Starting file generation', {
            traceId,
            resourceCount: analysis.resources.length,
            violationCount: complianceReport.violations.length
        });
        try {
            // Call Azure AI Foundry agent for intelligent file generation
            const generationResult = await this.callAzureAIFoundryAgent({
                analysis,
                complianceReport,
                costOptimization,
                userRequirements
            });
            const files = this.parseGenerationResult(generationResult);
            logger_1.logger.info('File generation completed', {
                traceId,
                bicepSize: files.bicepFile.length,
                pipelineSize: files.pipelineYaml.length
            });
            return files;
        }
        catch (error) {
            logger_1.logger.error('File generation failed', {
                traceId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async packageFiles(files, traceId) {
        logger_1.logger.info('Starting file packaging', { traceId });
        try {
            // Ensure output directory exists
            await fs.mkdir(this.outputDir, { recursive: true });
            const zipFileName = `azure-deployment-${traceId}.zip`;
            const zipFilePath = path.join(this.outputDir, zipFileName);
            // Create ZIP archive
            const output = await fs.open(zipFilePath, 'w');
            const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
            archive.pipe(output.createWriteStream());
            // Add files to archive
            archive.append(files.bicepFile, { name: 'main.bicep' });
            archive.append(files.pipelineYaml, { name: 'azure-pipeline.yml' });
            archive.append(files.parametersFile, { name: 'parameters.json' });
            archive.append(files.readmeFile, { name: 'README.md' });
            await archive.finalize();
            await output.close();
            const downloadUrl = `/download/${zipFileName}`;
            logger_1.logger.info('File packaging completed', {
                traceId,
                zipFile: zipFileName,
                downloadUrl
            });
            return downloadUrl;
        }
        catch (error) {
            logger_1.logger.error('File packaging failed', {
                traceId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async callAzureAIFoundryAgent(payload) {
        logger_1.logger.info('Calling Azure AI Foundry Generator Agent', {
            endpoint: this.azureAIEndpoint,
            resourceCount: payload.analysis.resources.length
        });
        // Simulate AI file generation
        await new Promise(resolve => setTimeout(resolve, 2500));
        // Generate Bicep file content
        const bicepContent = this.generateBicepContent(payload.analysis, payload.complianceReport, payload.costOptimization);
        // Generate Azure Pipeline YAML content
        const pipelineContent = this.generatePipelineContent(payload.analysis);
        // Generate parameters file content
        const parametersContent = this.generateParametersContent(payload.analysis, payload.userRequirements);
        // Generate README content
        const readmeContent = this.generateReadmeContent(payload.analysis, payload.complianceReport, payload.costOptimization);
        return {
            bicepFile: bicepContent,
            pipelineYaml: pipelineContent,
            parametersFile: parametersContent,
            readmeFile: readmeContent
        };
    }
    generateBicepContent(analysis, complianceReport, costOptimization) {
        let bicepContent = `// Azure Bicep Template
// Generated from architecture diagram analysis
// Resources: ${analysis.resources.length}
// Architecture Pattern: ${analysis.architecture.pattern}

targetScope = 'resourceGroup'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Environment name')
param environmentName string = 'dev'

@description('Resource name prefix')
param namePrefix string = 'app'

// Variables
var resourcePrefix = '\${namePrefix}-\${environmentName}'
var tags = {
  environment: environmentName
  'generated-by': 'ai-superman'
  pattern: '${analysis.architecture.pattern}'
}

`;
        // Generate resources based on analysis
        analysis.resources.forEach((resource, index) => {
            bicepContent += this.generateBicepResource(resource, index, complianceReport);
            bicepContent += '\n\n';
        });
        // Add outputs
        bicepContent += `// Outputs
`;
        analysis.resources.forEach((resource, index) => {
            if (resource.type === 'Microsoft.Web/sites') {
                bicepContent += `output webAppUrl string = 'https://\${${this.getBicepResourceName(resource, index)}.properties.defaultHostName}'
`;
            }
        });
        return bicepContent;
    }
    generateBicepResource(resource, index, complianceReport) {
        const resourceName = this.getBicepResourceName(resource, index);
        const violations = complianceReport.violations.filter(v => v.resource === resource.name);
        switch (resource.type) {
            case 'Microsoft.Web/sites':
                return `// Web App: ${resource.name}
resource ${resourceName} 'Microsoft.Web/sites@2023-01-01' = {
  name: '\${resourcePrefix}-${resource.name}'
  location: location
  tags: tags
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true // Compliance: HTTPS enforcement
    siteConfig: {
      ${violations.some(v => v.policy === 'HTTPS_ENFORCEMENT') ? 'httpsOnly: true' : ''}
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
    }
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '\${resourcePrefix}-asp'
  location: location
  tags: tags
  sku: {
    name: 'S1'
    tier: 'Standard'
  }
}`;
            case 'Microsoft.Sql/servers/databases':
                return `// SQL Database: ${resource.name}
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: '\${resourcePrefix}-sql'
  location: location
  tags: tags
  properties: {
    administratorLogin: 'sqladmin'
    administratorLoginPassword: 'P@ssw0rd123!' // Use Key Vault in production
    minimalTlsVersion: '1.2'
  }
}

resource ${resourceName} 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: '${resource.name}'
  location: location
  tags: tags
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 268435456000
    requestedServiceObjectiveName: 'S1'
  }
}`;
            case 'Microsoft.Storage/storageAccounts':
                return `// Storage Account: ${resource.name}
resource ${resourceName} 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: take('\${replace(resourcePrefix, '-', '')}${resource.name}', 24)
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    encryption: {
      services: {
        file: {
          enabled: true
        }
        blob: {
          enabled: true
        }
      }
      keySource: 'Microsoft.Storage'
    }
    supportsHttpsTrafficOnly: true // Compliance: HTTPS enforcement
    minimumTlsVersion: 'TLS1_2'
  }
}`;
            default:
                return `// Resource: ${resource.name} (${resource.type})
// Note: Template for ${resource.type} needs to be customized`;
        }
    }
    getBicepResourceName(resource, index) {
        const cleanName = resource.name.replace(/[^a-zA-Z0-9]/g, '');
        return `${cleanName}Resource${index}`;
    }
    generatePipelineContent(analysis) {
        return `# Azure DevOps Pipeline
# Generated from architecture diagram analysis
# Architecture Pattern: ${analysis.architecture.pattern}

trigger:
  branches:
    include:
    - main
    - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  azureServiceConnection: 'azure-service-connection'
  resourceGroupName: 'rg-$(Build.Repository.Name)-$(Build.SourceBranchName)'
  location: 'East US'
  templateFile: 'main.bicep'
  parametersFile: 'parameters.json'

stages:
- stage: Validate
  displayName: 'Validate Bicep Template'
  jobs:
  - job: ValidateTemplate
    displayName: 'Validate Template'
    steps:
    - task: AzureCLI@2
      displayName: 'Validate Bicep Template'
      inputs:
        azureSubscription: $(azureServiceConnection)
        scriptType: 'bash'
        scriptLocation: 'inlineScript'
        inlineScript: |
          az group create --name $(resourceGroupName) --location "$(location)"
          az deployment group validate \\
            --resource-group $(resourceGroupName) \\
            --template-file $(templateFile) \\
            --parameters @$(parametersFile)

- stage: Deploy
  displayName: 'Deploy Infrastructure'
  dependsOn: Validate
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: DeployInfrastructure
    displayName: 'Deploy Infrastructure'
    environment: 'production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureCLI@2
            displayName: 'Deploy Bicep Template'
            inputs:
              azureSubscription: $(azureServiceConnection)
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az deployment group create \\
                  --resource-group $(resourceGroupName) \\
                  --template-file $(templateFile) \\
                  --parameters @$(parametersFile) \\
                  --verbose

          - task: AzureCLI@2
            displayName: 'Output Deployment Results'
            inputs:
              azureSubscription: $(azureServiceConnection)
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                echo "Deployment completed successfully"
                az resource list --resource-group $(resourceGroupName) --output table

- stage: PostDeployment
  displayName: 'Post-Deployment Validation'
  dependsOn: Deploy
  jobs:
  - job: HealthChecks
    displayName: 'Health Checks'
    steps:
    - task: AzureCLI@2
      displayName: 'Run Health Checks'
      inputs:
        azureSubscription: $(azureServiceConnection)
        scriptType: 'bash'
        scriptLocation: 'inlineScript'
        inlineScript: |
          echo "Running post-deployment health checks..."
          # Add your health check scripts here
          echo "Health checks completed"
`;
    }
    generateParametersContent(analysis, userRequirements) {
        const parameters = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
            "contentVersion": "1.0.0.0",
            "parameters": {
                "location": {
                    "value": userRequirements?.targetRegion || "East US"
                },
                "environmentName": {
                    "value": "dev"
                },
                "namePrefix": {
                    "value": "app"
                }
            }
        };
        return JSON.stringify(parameters, null, 2);
    }
    generateReadmeContent(analysis, complianceReport, costOptimization) {
        return `# Azure Infrastructure Deployment

This package contains the generated Bicep template and Azure Pipeline configuration for deploying your Azure infrastructure.

## Architecture Overview

- **Pattern**: ${analysis.architecture.pattern}
- **Resources**: ${analysis.resources.length} resources
- **Complexity**: ${analysis.architecture.complexity}
- **Scalability**: ${analysis.architecture.scalability}

## Resources

${analysis.resources.map(r => `- **${r.name}** (${r.type})`).join('\n')}

## Cost Estimation

- **Estimated Monthly Cost**: $${costOptimization.estimatedMonthlyCost.toFixed(2)}
- **Potential Savings**: $${costOptimization.potentialSavings.toFixed(2)}

### Cost Optimizations
${costOptimization.optimizations.map(opt => `- **${opt.resource}**: ${opt.suggestion} (Save $${opt.potentialSavings.toFixed(2)}/month)`).join('\n')}

## Compliance Report

- **Overall Compliance**: ${complianceReport.compliant ? '✅ Compliant' : '❌ Non-Compliant'}
- **Violations**: ${complianceReport.violations.length}

${complianceReport.violations.length > 0 ? `
### Policy Violations
${complianceReport.violations.map(v => `- **${v.resource}** - ${v.policy}: ${v.description} (${v.severity})`).join('\n')}
` : ''}

## Deployment Instructions

### Prerequisites

1. Azure CLI installed and configured
2. Azure DevOps project with service connection
3. Appropriate permissions on target subscription

### Local Deployment

\`\`\`bash
# Create resource group
az group create --name rg-myapp-dev --location "East US"

# Deploy template
az deployment group create \\
  --resource-group rg-myapp-dev \\
  --template-file main.bicep \\
  --parameters @parameters.json
\`\`\`

### Pipeline Deployment

1. Upload these files to your Azure DevOps repository
2. Create a new pipeline using \`azure-pipeline.yml\`
3. Configure the required variables and service connections
4. Run the pipeline

## Files Included

- \`main.bicep\` - Main Bicep template
- \`parameters.json\` - Parameter values
- \`azure-pipeline.yml\` - Azure DevOps pipeline
- \`README.md\` - This documentation

## Generated by AI Superman

This deployment package was automatically generated from your architecture diagram using AI Superman's superpowers for analysis and optimization.
`;
    }
    parseGenerationResult(result) {
        return {
            bicepFile: result.bicepFile,
            pipelineYaml: result.pipelineYaml,
            parametersFile: result.parametersFile,
            readmeFile: result.readmeFile
        };
    }
}
exports.GeneratorAgent = GeneratorAgent;
//# sourceMappingURL=generator.js.map