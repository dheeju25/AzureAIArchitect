/**
 * AnalyzerAgent
 *
 * Uses GPT-4o Vision to look at the uploaded diagram image and extract:
 *   • Every Azure resource (type, name, SKU, location, tags)
 *   • All dependencies between resources
 *   • Architecture pattern, scalability, complexity
 *   • Security concerns and key observations
 *
 * Output is Zod-validated so downstream agents always receive
 * well-typed, trustworthy data.
 */
import { z } from 'zod';
import { BaseAgent, ProgressCallback, AgentCallResult } from './base';
import { logger } from '../utils/logger';
import { fileProcessor } from '../utils/fileProcessor';
import { DiagramAnalysis } from '../types';

// ── Output schema ────────────────────────────────────────────────────────────
const ResourceSchema = z.object({
  type:       z.string().describe('Azure resource type, e.g. Microsoft.Web/sites'),
  name:       z.string().describe('Logical resource name in kebab-case'),
  properties: z.record(z.unknown()).default({}),
  location:   z.string().default('West Europe'),
  tags:       z.record(z.string()).default({}),
  sku:        z.string().optional(),
  tier:       z.string().optional(),
  notes:      z.string().optional(),
});

const DependencySchema = z.object({
  source:      z.string(),
  target:      z.string(),
  type:        z.enum(['depends_on', 'references', 'connects_to', 'triggers', 'reads_from', 'writes_to']),
  description: z.string().optional(),
});

const AnalysisOutputSchema = z.object({
  resources:    z.array(ResourceSchema).min(1),
  dependencies: z.array(DependencySchema),
  architecture: z.object({
    pattern:          z.string(),
    components:       z.array(z.string()),
    scalability:      z.enum(['low', 'medium', 'high']),
    complexity:       z.enum(['simple', 'moderate', 'complex']),
    keyObservations:  z.array(z.string()),
    securityConcerns: z.array(z.string()),
    availabilityZones: z.boolean().optional(),
    multiRegion:       z.boolean().optional(),
  }),
});

type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a Senior Azure Solutions Architect with expert-level knowledge of every Azure service.

Your sole job: analyse an Azure architecture diagram image and return a precise, structured JSON representation.

Rules:
- Identify EVERY visible Azure resource — compute, storage, networking, security, AI, data, integration, monitoring.
- Use official Azure resource type format: Microsoft.<Provider>/<resourceType>
- Infer SKU/tier from labels or icons where possible.
- Map ALL arrows, lines, and callouts to typed dependencies.
- Dependency types: depends_on | references | connects_to | triggers | reads_from | writes_to
- Identify the high-level pattern (e.g. "Microservices on AKS", "Serverless event-driven", "Hub-and-spoke network").
- Flag security gaps: missing WAF, no private endpoints, unencrypted links, missing RBAC, etc.
- Honestly assess scalability based on what you see.
- Unknown resources: include them with type "Unknown" and explain in notes.

Respond ONLY with valid JSON matching this exact structure (no markdown, no explanation):
{
  "resources": [
    {
      "type": "Microsoft.Web/sites",
      "name": "app-frontend",
      "properties": { "httpsOnly": true },
      "location": "West Europe",
      "tags": { "environment": "production" },
      "sku": "S1",
      "tier": "Standard",
      "notes": "Internet-facing; add Front Door + WAF."
    }
  ],
  "dependencies": [
    { "source": "app-frontend", "target": "sql-db", "type": "depends_on", "description": "Reads/writes app data" }
  ],
  "architecture": {
    "pattern": "Three-tier web application",
    "components": ["App Service", "SQL Database", "Storage Account"],
    "scalability": "medium",
    "complexity": "moderate",
    "keyObservations": ["No CDN", "Single-region"],
    "securityConcerns": ["No WAF on public endpoint", "SQL not behind private endpoint"],
    "availabilityZones": false,
    "multiRegion": false
  }
}`;

// ── Agent ────────────────────────────────────────────────────────────────────
export class AnalyzerAgent extends BaseAgent {
  constructor() {
    super({ name: 'AnalyzerAgent', role: 'Vision-based Azure resource extractor' });
  }

  async analyzeDiagram(
    diagramBuffer: Buffer,
    fileName:      string,
    traceId:       string,
    onProgress?:   ProgressCallback,
  ): Promise<DiagramAnalysis> {
    logger.info('AnalyzerAgent: starting diagram analysis', { traceId, fileName });
    onProgress?.('preprocessing', 5, 'Processing diagram file...');

    // ── 1. Convert the uploaded file to a PNG buffer ──────────────────────
    const tempPath = `/tmp/${Date.now()}-${fileName}`;
    await require('fs/promises').writeFile(tempPath, diagramBuffer);

    let processedFile: any;
    try {
      processedFile = await fileProcessor.processFile(tempPath, fileName);
    } finally {
      await require('fs/promises').unlink(tempPath).catch(() => {});
    }

    onProgress?.('vision-analysis', 20, 'Sending diagram to GPT-4o Vision...');

    // ── 2. Build context string from extracted structured data ────────────
    const contextLines: string[] = [];
    if (processedFile.extractedData) {
      const ed = processedFile.extractedData;
      if (ed.elements?.length)    contextLines.push(`Draw.io elements found: ${ed.elements.length}`);
      if (ed.textContent?.length) contextLines.push(`SVG text labels: ${ed.textContent.join(', ')}`);
      if (ed.text)                contextLines.push(`Extracted text (first 600 chars): ${ed.text.substring(0, 600)}`);
      if (ed.shapes?.length)      contextLines.push(`Visio shapes: ${ed.shapes.map((s: any) => s.name).join(', ')}`);
    }
    const contextBlock = contextLines.length
      ? `\n\nAdditional context extracted from file structure:\n${contextLines.join('\n')}`
      : '';

    const userPrompt =
      `Analyse this Azure architecture diagram.\n` +
      `Original file format: ${processedFile.format}\n` +
      `File name: ${fileName}${contextBlock}\n\n` +
      `Return the JSON as specified.`;

    // ── 3. Call GPT-4o Vision ─────────────────────────────────────────────
    const base64Png = processedFile.content.toString('base64');
    const visionContent = this.buildVisionContent(base64Png, userPrompt);

    const result: AgentCallResult<AnalysisOutput> = await this.callLLM(
      SYSTEM_PROMPT,
      visionContent,
      AnalysisOutputSchema,
      traceId,
      onProgress,
    );

    onProgress?.('complete', 100, 'Analysis complete');

    logger.info('AnalyzerAgent: analysis complete', {
      traceId,
      resourceCount:    result.data.resources.length,
      dependencyCount:  result.data.dependencies.length,
      pattern:          result.data.architecture.pattern,
      durationMs:       result.durationMs,
      promptTokens:     result.promptTokens,
      completionTokens: result.completionTokens,
    });

    // ── 4. Map to canonical DiagramAnalysis type ──────────────────────────
    return {
      resources: result.data.resources.map(r => ({
        type:       r.type,
        name:       r.name,
        properties: {
          ...r.properties as Record<string, unknown>,
          ...(r.sku    ? { sku:    r.sku    } : {}),
          ...(r.tier   ? { tier:   r.tier   } : {}),
          ...(r.notes  ? { notes:  r.notes  } : {}),
        },
        location: r.location,
        tags:     r.tags,
      })),
      dependencies: result.data.dependencies.map(d => ({
        source: d.source,
        target: d.target,
        type:   d.type as any,
      })),
      architecture: {
        pattern:      result.data.architecture.pattern,
        components:   result.data.architecture.components,
        scalability:  result.data.architecture.scalability,
        complexity:   result.data.architecture.complexity,
      },
    };
  }
}
