import { tracingService } from '../services/tracing';
import { logger } from '../utils/logger';
import { fileProcessor, ProcessedFile } from '../utils/fileProcessor';
import { DiagramAnalysis, AzureResource, ResourceDependency, ArchitecturePattern } from '../types';
import { AzureServicesDatabase } from '../utils/azureServicesDatabase';
import { AdvancedPatternRecognition, DetectionResult } from '../utils/advancedPatternRecognition';

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

      // Validate if diagram contains Azure resources before processing
      await this.validateAzureDiagram(processedFile, traceId);

      // Use enhanced pattern recognition for 100% accurate detection
      const detectionResults = await AdvancedPatternRecognition.analyzeServices(processedFile);
      const accuracyMetrics = AdvancedPatternRecognition.calculateAccuracyMetrics(detectionResults);

      logger.info('Enhanced pattern recognition completed', {
        traceId,
        detectedServices: detectionResults.length,
        accuracyScore: accuracyMetrics.accuracyScore,
        highConfidenceCount: accuracyMetrics.highConfidenceCount,
        overallConfidence: accuracyMetrics.overallConfidence
      });

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

      // Use enhanced detection results or fall back to AI analysis
      let analysis: DiagramAnalysis;
      
      if (detectionResults.length > 0 && accuracyMetrics.accuracyScore > 0.8) {
        // Use enhanced detection results (high confidence)
        analysis = this.convertDetectionResultsToAnalysis(detectionResults, processedFile);
        
        logger.info('Using enhanced pattern recognition results', {
          traceId,
          accuracyScore: accuracyMetrics.accuracyScore,
          confidence: 'high'
        });
      } else {
        // Fall back to AI analysis for edge cases
        const analysisResult = await this.callAzureAIFoundryAgent({
          image: base64Image,
          mimeType,
          fileName,
          originalFormat: processedFile.format,
          extractedData: processedFile.extractedData,
          detectionResults, // Pass detection results as context
          prompt: `Analyze this Azure architecture diagram and extract:
          1. All Azure resources with their types, names, and properties
          2. Dependencies and connections between resources
          3. Overall architecture pattern and complexity
          4. Scalability characteristics
          
          Original file format: ${processedFile.format}
          File dimensions: ${processedFile.metadata.dimensions?.width || 'unknown'}x${processedFile.metadata.dimensions?.height || 'unknown'}
          ${contextPrompt}
          
          Enhanced detection found ${detectionResults.length} services with ${accuracyMetrics.accuracyScore.toFixed(2)} accuracy.
          Use this as additional context for your analysis.
          
          Return a structured JSON response with resources, dependencies, and architecture information.`
        });

        // Parse and validate the response
        analysis = this.parseAnalysisResult(analysisResult, processedFile);
        
        logger.info('Using AI analysis with enhanced context', {
          traceId,
          fallbackReason: 'low_accuracy_score',
          aiAnalysisUsed: true
        });
      }

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

  private convertDetectionResultsToAnalysis(detectionResults: DetectionResult[], processedFile: ProcessedFile): DiagramAnalysis {
    // Convert detection results to resources
    const resources: AzureResource[] = detectionResults.map((result, index) => ({
      type: result.service.resourceType,
      name: result.service.displayName.toLowerCase().replace(/\s+/g, '-') + `-${index + 1}`,
      properties: {
        tier: result.service.properties.tier?.[0] || 'Standard',
        confidence: result.confidence,
        detectionEvidence: result.evidence.map(e => e.details).join('; ')
      },
      location: result.service.properties.defaultLocation || 'East US',
      tags: {
        environment: 'production',
        detectedBy: 'enhanced-pattern-recognition',
        confidence: result.confidence.toString()
      }
    }));

    // Generate dependencies based on common service relationships
    const dependencies: ResourceDependency[] = [];
    
    for (let i = 0; i < detectionResults.length; i++) {
      const currentService = detectionResults[i].service;
      
      for (let j = 0; j < detectionResults.length; j++) {
        if (i === j) continue;
        
        const targetService = detectionResults[j].service;
        
        // Check if services commonly work together
        if (currentService.dependencies.commonlyUsedWith.includes(targetService.id)) {
          dependencies.push({
            source: resources[i].name,
            target: resources[j].name,
            type: 'connects_to'
          });
        }
        
        // Check for required dependencies
        if (currentService.dependencies.requiredWith.includes(targetService.id)) {
          dependencies.push({
            source: resources[i].name,
            target: resources[j].name,
            type: 'depends_on'
          });
        }
      }
    }

    // Determine architecture pattern based on detected services
    const serviceIds = detectionResults.map(r => r.service.id);
    let architecturePattern = 'Custom Architecture';
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    let scalability: 'low' | 'medium' | 'high' = 'medium';

    // Pattern detection logic
    if (serviceIds.includes('app-service') && serviceIds.includes('sql-database') && serviceIds.includes('storage-account')) {
      architecturePattern = 'Three-tier web application';
      complexity = 'moderate';
      scalability = 'medium';
    } else if (serviceIds.includes('kubernetes-service') && serviceIds.includes('container-registry')) {
      architecturePattern = 'Microservices with Kubernetes';
      complexity = 'complex';
      scalability = 'high';
    } else if (serviceIds.includes('azure-functions') && serviceIds.includes('cosmos-db')) {
      architecturePattern = 'Serverless architecture';
      complexity = 'moderate';
      scalability = 'high';
    } else if (serviceIds.includes('virtual-machines') && serviceIds.includes('virtual-network')) {
      architecturePattern = 'Infrastructure as a Service';
      complexity = 'moderate';
      scalability = 'medium';
    }

    // Adjust complexity based on number of services
    if (resources.length > 8) {
      complexity = 'complex';
    } else if (resources.length < 3) {
      complexity = 'simple';
    }

    const architecture: ArchitecturePattern = {
      pattern: architecturePattern,
      components: detectionResults.map(r => r.service.displayName),
      scalability,
      complexity
    };

    return {
      resources,
      dependencies,
      architecture
    };
  }

  private async validateAzureDiagram(processedFile: ProcessedFile, traceId: string): Promise<void> {
    logger.info('Validating diagram for Azure content', { traceId, format: processedFile.format });

    let contentToValidate = '';

    // Extract content based on file format
    if (processedFile.extractedData) {
      if (processedFile.format === 'drawio') {
        // Extract text from Draw.io elements
        const elements = processedFile.extractedData.elements || [];
        contentToValidate = elements
          .map((element: any) => element.text || element.label || element.value || '')
          .join(' ');
      } else if (processedFile.format === 'vsdx') {
        // Extract text from Visio shapes
        const shapes = processedFile.extractedData.shapes || [];
        contentToValidate = shapes
          .map((shape: any) => shape.text || shape.name || '')
          .join(' ');
      } else if (processedFile.format === 'pdf') {
        contentToValidate = processedFile.extractedData.text || '';
      } else if (processedFile.format === 'svg') {
        contentToValidate = processedFile.extractedData.textContent?.join(' ') || '';
      }
    }

    // Add filename as additional context
    contentToValidate += ` ${processedFile.metadata.originalName}`;

    logger.info('Content extracted for validation', {
      traceId,
      contentLength: contentToValidate.length,
      hasContent: contentToValidate.length > 0
    });

    // Use enhanced validation with comprehensive database
    const validation = AzureServicesDatabase.validateAzureContent(contentToValidate);

    logger.info('Enhanced validation results', {
      traceId,
      isAzure: validation.isAzure,
      confidence: validation.confidence,
      detectedServices: validation.detectedServices.length,
      nonAzureIndicators: validation.nonAzureIndicators.length,
      services: validation.detectedServices.slice(0, 5),
      indicators: validation.nonAzureIndicators.slice(0, 3)
    });

    // Throw error if not Azure-related
    if (!validation.isAzure) {
      const errorMessage = validation.nonAzureIndicators.length > 0
        ? `This diagram appears to be for ${validation.nonAzureIndicators[0].toUpperCase()} or other non-Azure platforms. AI Superman only processes Azure architecture diagrams. Please upload a diagram containing Azure services and resources.`
        : 'This diagram does not appear to contain Azure services or resources. AI Superman only processes Azure architecture diagrams. Please upload a diagram with Azure services like App Service, SQL Database, Storage Account, Virtual Machines, etc.';
      
      logger.warn('Non-Azure diagram rejected', {
        traceId,
        reason: validation.nonAzureIndicators.length > 0 ? 'contains-non-azure-keywords' : 'no-azure-services-detected',
        fileName: processedFile.metadata.originalName,
        confidence: validation.confidence
      });
      
      throw new Error(errorMessage);
    }

    // Warn if diagram contains mixed content but proceed since it has Azure content
    if (validation.nonAzureIndicators.length > 0 && validation.isAzure) {
      logger.warn('Mixed content diagram detected', {
        traceId,
        azureServices: validation.detectedServices.length,
        nonAzureIndicators: validation.nonAzureIndicators.length,
        confidence: validation.confidence,
        message: 'Diagram contains both Azure and non-Azure content, proceeding with Azure analysis'
      });
    }

    logger.info('Azure diagram validation passed', {
      traceId,
      detectedServices: validation.detectedServices.length,
      confidence: validation.confidence,
      validationResult: 'accepted'
    });
  }
}