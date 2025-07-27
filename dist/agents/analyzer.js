"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyzerAgent = void 0;
const logger_1 = require("../utils/logger");
const fileProcessor_1 = require("../utils/fileProcessor");
class AnalyzerAgent {
    constructor() {
        this.azureAIEndpoint = process.env.ANALYZER_AGENT_URL || '';
        this.azureAIKey = process.env.AZURE_AI_FOUNDRY_API_KEY || '';
    }
    async analyzeDiagram(diagramBuffer, fileName, traceId) {
        logger_1.logger.info('Starting diagram analysis', { traceId, fileName });
        try {
            // First, process the file to handle different formats
            const tempFilePath = `/tmp/${Date.now()}-${fileName}`;
            await require('fs/promises').writeFile(tempFilePath, diagramBuffer);
            const processedFile = await fileProcessor_1.fileProcessor.processFile(tempFilePath, fileName);
            // Clean up temp file
            try {
                await require('fs/promises').unlink(tempFilePath);
            }
            catch (cleanupError) {
                logger_1.logger.warn('Failed to clean up temp file', { tempFilePath, cleanupError });
            }
            logger_1.logger.info('File processed successfully', {
                traceId,
                originalFormat: processedFile.format,
                hasExtractedData: !!processedFile.extractedData,
                dimensions: processedFile.metadata.dimensions
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
                }
                else if (processedFile.format === 'svg') {
                    contextPrompt += `\n- Source: SVG diagram`;
                    if (processedFile.extractedData.textContent?.length > 0) {
                        contextPrompt += `\n- Text elements: ${processedFile.extractedData.textContent.join(', ')}`;
                    }
                }
                else if (processedFile.format === 'pdf') {
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
            logger_1.logger.info('Diagram analysis completed', {
                traceId,
                originalFormat: processedFile.format,
                resourceCount: analysis.resources.length,
                dependencyCount: analysis.dependencies.length,
                pattern: analysis.architecture.pattern
            });
            return analysis;
        }
        catch (error) {
            logger_1.logger.error('Diagram analysis failed', {
                traceId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async callAzureAIFoundryAgent(payload) {
        // Mock implementation - replace with actual Azure AI Foundry API call
        // This would use the Azure AI Foundry SDK to call the configured agent
        logger_1.logger.info('Calling Azure AI Foundry Analyzer Agent', {
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
    parseAnalysisResult(result, processedFile) {
        const resources = result.resources.map((resource) => ({
            type: resource.type,
            name: resource.name,
            properties: resource.properties,
            location: resource.location,
            tags: resource.tags
        }));
        const dependencies = result.dependencies.map((dep) => ({
            source: dep.source,
            target: dep.target,
            type: dep.type
        }));
        const architecture = {
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
    getMimeType(fileName) {
        const extension = fileName.toLowerCase().split('.').pop();
        const mimeTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'webp': 'image/webp'
        };
        return mimeTypes[extension || ''] || 'image/png';
    }
}
exports.AnalyzerAgent = AnalyzerAgent;
//# sourceMappingURL=analyzer.js.map