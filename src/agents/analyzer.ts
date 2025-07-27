import { tracingService } from '../services/tracing';
import { logger } from '../utils/logger';
import { fileProcessor, ProcessedFile } from '../utils/fileProcessor';
import { DiagramAnalysis, AzureResource, ResourceDependency, ArchitecturePattern } from '../types';

export class AnalyzerAgent {
  private azureAIEndpoint: string;
  private azureAIKey: string;

  constructor() {
    this.azureAIEndpoint = process.env.ANALYZER_AGENT_URL || '';
    this.azureAIKey = process.env.AZURE_AI_FOUNDRY_API_KEY || '';
  }

  async analyzeDiagram(diagramBuffer: Buffer, fileName: string, traceId: string): Promise<DiagramAnalysis> {
    logger.info('Starting diagram analysis', { traceId, fileName });

    try {
      // First, process the file to handle different formats
      const tempFilePath = `/tmp/${Date.now()}-${fileName}`;
      await require('fs/promises').writeFile(tempFilePath, diagramBuffer);
      
      const processedFile = await fileProcessor.processFile(tempFilePath, fileName);
      
      // Clean up temp file
      try {
        await require('fs/promises').unlink(tempFilePath);
      } catch (cleanupError) {
        logger.warn('Failed to clean up temp file', { tempFilePath, cleanupError });
      }

      logger.info('File processed successfully', {
        traceId,
        originalFormat: processedFile.format,
        hasExtractedData: !!processedFile.extractedData,
        dimensions: processedFile.metadata.dimensions
      });

      // Validate if diagram contains Azure resources before processing (temporarily disabled for testing)
      // await this.validateAzureDiagram(processedFile, traceId);

      // Convert processed image to base64 for AI processing
      const base64Image = processedFile.content.toString('base64');
      const mimeType = 'image/png'; // All files are converted to PNG for consistent processing

      // Prepare enhanced prompt with extracted data context
      let contextPrompt = '';
      if (processedFile.extractedData) {
        contextPrompt = `\n\nAdditional context from file structure:`;
        
        if (processedFile.format === 'drawio') {
          contextPrompt += `\n- Source: Draw.io diagram`;
          if (processedFile.extractedData.elements?.length > 0) {
            contextPrompt += `\n- Contains ${processedFile.extractedData.elements.length} diagram elements`;
          }
        } else if (processedFile.format === 'svg') {
          contextPrompt += `\n- Source: SVG diagram`;
          if (processedFile.extractedData.textContent?.length > 0) {
            contextPrompt += `\n- Text elements: ${processedFile.extractedData.textContent.join(', ')}`;
          }
        } else if (processedFile.format === 'pdf') {
          contextPrompt += `\n- Source: PDF document (${processedFile.metadata.pageCount} pages)`;
          if (processedFile.extractedData.text) {
            contextPrompt += `\n- Extracted text: ${processedFile.extractedData.text.substring(0, 500)}...`;
          }
        }
      }

      // Call Azure AI Foundry agent for diagram analysis
      const analysisResult = await this.callAzureAIFoundryAgent({
        image: base64Image,
        mimeType,
        fileName,
        originalFormat: processedFile.format,
        extractedData: processedFile.extractedData,
        prompt: `Analyze this Azure architecture diagram and extract:
        1. All Azure resources with their types, names, and properties
        2. Dependencies and connections between resources
        3. Overall architecture pattern and complexity
        4. Scalability characteristics
        
        Original file format: ${processedFile.format}
        File dimensions: ${processedFile.metadata.dimensions?.width || 'unknown'}x${processedFile.metadata.dimensions?.height || 'unknown'}
        ${contextPrompt}
        
        Return a structured JSON response with resources, dependencies, and architecture information.`
      });

      // Parse and validate the response
      const analysis = this.parseAnalysisResult(analysisResult, processedFile);

      logger.info('Diagram analysis completed', {
        traceId,
        originalFormat: processedFile.format,
        resourceCount: analysis.resources.length,
        dependencyCount: analysis.dependencies.length,
        pattern: analysis.architecture.pattern
      });

      return analysis;

    } catch (error) {
      logger.error('Diagram analysis failed', {
        traceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async callAzureAIFoundryAgent(payload: any): Promise<any> {
    // Mock implementation - replace with actual Azure AI Foundry API call
    // This would use the Azure AI Foundry SDK to call the configured agent
    
    logger.info('Calling Azure AI Foundry Analyzer Agent', {
      endpoint: this.azureAIEndpoint,
      payloadSize: JSON.stringify(payload).length
    });

    // Simulate AI analysis with mock data
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      resources: [
        {
          type: 'Microsoft.Web/sites',
          name: 'webapp-frontend',
          properties: {
            sku: 'Standard',
            runtime: 'node',
            httpsOnly: true
          },
          location: 'East US',
          tags: {
            environment: 'production',
            tier: 'frontend'
          }
        },
        {
          type: 'Microsoft.Sql/servers/databases',
          name: 'sqldb-main',
          properties: {
            tier: 'Standard',
            maxSizeBytes: '268435456000',
            collation: 'SQL_Latin1_General_CP1_CI_AS'
          },
          location: 'East US',
          tags: {
            environment: 'production',
            tier: 'database'
          }
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          name: 'storage001',
          properties: {
            accountType: 'Standard_LRS',
            accessTier: 'Hot'
          },
          location: 'East US',
          tags: {
            environment: 'production',
            tier: 'storage'
          }
        }
      ],
      dependencies: [
        {
          source: 'webapp-frontend',
          target: 'sqldb-main',
          type: 'depends_on'
        },
        {
          source: 'webapp-frontend',
          target: 'storage001',
          type: 'references'
        }
      ],
      architecture: {
        pattern: 'Three-tier web application',
        components: ['Web Application', 'SQL Database', 'Storage Account'],
        scalability: 'medium',
        complexity: 'moderate'
      }
    };
  }

  private parseAnalysisResult(result: any, processedFile?: ProcessedFile): DiagramAnalysis {
    const resources: AzureResource[] = result.resources.map((resource: any) => ({
      type: resource.type,
      name: resource.name,
      properties: resource.properties,
      location: resource.location,
      tags: resource.tags
    }));

    const dependencies: ResourceDependency[] = result.dependencies.map((dep: any) => ({
      source: dep.source,
      target: dep.target,
      type: dep.type
    }));

    const architecture: ArchitecturePattern = {
      pattern: result.architecture.pattern,
      components: result.architecture.components,
      scalability: result.architecture.scalability,
      complexity: result.architecture.complexity
    };

    return {
      resources,
      dependencies,
      architecture
    };
  }

  private getMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp'
    };
    return mimeTypes[extension || ''] || 'image/png';
  }

  private async validateAzureDiagram(processedFile: ProcessedFile, traceId: string): Promise<void> {
    logger.info('Validating diagram for Azure content', { traceId, format: processedFile.format });

    // Define Azure-related keywords and patterns
    const azureKeywords = [
      // Azure services
      'azure', 'microsoft', 'storage account', 'app service', 'sql database', 'cosmos db',
      'virtual machine', 'vm', 'virtual network', 'vnet', 'resource group', 'subscription',
      'key vault', 'application insights', 'service bus', 'event hub', 'logic app',
      'function app', 'container registry', 'kubernetes', 'aks', 'api management',
      'cognitive services', 'bot service', 'notification hub', 'redis cache',
      
      // Azure resource types
      'microsoft.web', 'microsoft.sql', 'microsoft.storage', 'microsoft.compute',
      'microsoft.network', 'microsoft.keyvault', 'microsoft.insights',
      'microsoft.servicebus', 'microsoft.eventhub', 'microsoft.logic',
      'microsoft.cognitiveservices', 'microsoft.botservice',
      
      // Common Azure terminology
      'bicep', 'arm template', 'resource manager', 'azure portal', 'azure cli',
      'powershell', 'tenant', 'active directory', 'aad', 'rbac'
    ];

    // Define non-Azure keywords that indicate other cloud providers
    const nonAzureKeywords = [
      'aws', 'amazon', 'ec2', 's3', 'lambda', 'rds', 'dynamodb', 'cloudformation',
      'gcp', 'google cloud', 'compute engine', 'cloud storage', 'bigquery',
      'cloud functions', 'firestore', 'pub/sub', 'kubernetes engine', 'gke',
      'docker', 'terraform', 'on-premise', 'on-premises', 'vmware',
      'openstack', 'alibaba cloud', 'oracle cloud'
    ];

    let contentToValidate = '';

    // Extract content based on file format
    if (processedFile.extractedData) {
      if (processedFile.format === 'drawio') {
        // Extract text from Draw.io elements
        const elements = processedFile.extractedData.elements || [];
        contentToValidate = elements
          .map((element: any) => element.text || element.label || element.value || '')
          .join(' ')
          .toLowerCase();
      } else if (processedFile.format === 'vsdx') {
        // Extract text from Visio shapes
        const shapes = processedFile.extractedData.shapes || [];
        contentToValidate = shapes
          .map((shape: any) => shape.text || shape.name || '')
          .join(' ')
          .toLowerCase();
      }
    }

    // If no structured data, analyze filename and any metadata
    if (!contentToValidate.trim()) {
      contentToValidate = `${processedFile.metadata.originalName} ${JSON.stringify(processedFile.metadata)}`.toLowerCase();
    }

    logger.info('Content extracted for validation', {
      traceId,
      contentLength: contentToValidate.length,
      hasContent: contentToValidate.length > 0
    });

    // Check for Azure keywords
    const azureMatches = azureKeywords.filter(keyword => 
      contentToValidate.includes(keyword.toLowerCase())
    );

    // Check for non-Azure keywords
    const nonAzureMatches = nonAzureKeywords.filter(keyword => 
      contentToValidate.includes(keyword.toLowerCase())
    );

    logger.info('Validation results', {
      traceId,
      azureMatches: azureMatches.length,
      nonAzureMatches: nonAzureMatches.length,
      foundAzureKeywords: azureMatches.slice(0, 5), // Log first 5 matches
      foundNonAzureKeywords: nonAzureMatches.slice(0, 3) // Log first 3 matches
    });

    // Determine if diagram is Azure-related
    const isAzureDiagram = azureMatches.length > 0;
    const hasNonAzureContent = nonAzureMatches.length > 0;

    // Throw error if not Azure-related
    if (!isAzureDiagram) {
      const errorMessage = hasNonAzureContent 
        ? `This diagram appears to be for ${nonAzureMatches[0].toUpperCase()} or other non-Azure platforms. AI Superman only processes Azure architecture diagrams. Please upload a diagram containing Azure services and resources.`
        : 'This diagram does not appear to contain Azure services or resources. AI Superman only processes Azure architecture diagrams. Please upload a diagram with Azure services like App Service, SQL Database, Storage Account, Virtual Machines, etc.';
      
      logger.warn('Non-Azure diagram rejected', {
        traceId,
        reason: hasNonAzureContent ? 'contains-non-azure-keywords' : 'no-azure-keywords-found',
        fileName: processedFile.metadata.originalName
      });
      
      throw new Error(errorMessage);
    }

    // Warn if diagram contains mixed content but proceed since it has Azure content
    if (hasNonAzureContent && isAzureDiagram) {
      logger.warn('Mixed content diagram detected', {
        traceId,
        azureMatches: azureMatches.length,
        nonAzureMatches: nonAzureMatches.length,
        message: 'Diagram contains both Azure and non-Azure content, proceeding with Azure analysis'
      });
    }

    logger.info('Azure diagram validation passed', {
      traceId,
      azureKeywordsFound: azureMatches.length,
      validationResult: 'accepted'
    });
  }
}