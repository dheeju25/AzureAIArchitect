/**
 * GeneratorAgent
 *
 * Receives the combined output from Analyzer + PolicyCompliance + CostOptimization
 * and uses GPT-4o to generate:
 *   • A parameterised Bicep template (main.bicep)
 *   • An Azure DevOps multi-stage pipeline (azure-pipeline.yml)
 *   • A parameters file (parameters.json)
 *   • A deployment README (README.md)
 *
 * The agent is given the full context from all upstream agents so it
 * can bake in compliance fixes and cost optimisations automatically.
 */
import { z } from 'zod';
import path from 'path';
import * as fs from 'fs/promises';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { BaseAgent, ProgressCallback, AgentCallResult } from './base';
import { logger } from '../utils/logger';
import { DiagramAnalysis, PolicyComplianceResult, CostOptimization, GeneratedFiles } from '../types';

// ── Output schema ────────────────────────────────────────────────────────────
const GeneratedOutputSchema = z.object({
  bicepFile:      z.string().min(10).describe('Full content of main.bicep'),
  pipelineYaml:   z.string().min(10).describe('Full content of azure-pipeline.yml'),
  parametersFile: z.string().min(2).describe('Full content of parameters.json'),
  readmeFile:     z.string().min(10).describe('Full content of deployment README.md'),
  summary: z.object({
    resourceCount:      z.number(),
    complianceFixes:    z.array(z.string()),
    costOptimizations:  z.array(z.string()),
    deploymentSteps:    z.array(z.string()),
  }),
});

type GeneratedOutput = z.infer<typeof GeneratedOutputSchema>;

// ── Agent ────────────────────────────────────────────────────────────────────
export class GeneratorAgent extends BaseAgent {
  private readonly outputDir: string;

  constructor() {
    super({ name: 'GeneratorAgent', role: 'Bicep template and Azure DevOps pipeline generator' });
    this.outputDir = process.env.OUTPUT_DIR || './generated';
  }

  async generateFiles(
    analysis:          DiagramAnalysis,
    complianceReport:  PolicyComplianceResult,
    costOptimization:  CostOptimization,
    userRequirements?: {
      targetRegion?:            string;
      budgetConstraint?:        number;
      complianceProfile?:       string;
      scalabilityRequirements?: string;
    },
    traceId:           string = '',
    onProgress?:       ProgressCallback,
  ): Promise<GeneratedFiles> {
    logger.info('GeneratorAgent: starting file generation', {
      traceId, resourceCount: analysis.resources.length,
    });
    onProgress?.('generating', 10, 'Generating Bicep + pipeline from analysis...');

    const systemPrompt = `You are an expert Azure Infrastructure-as-Code engineer.

Generate production-quality deployment artifacts for the Azure architecture described below.

Generation rules:
- Bicep: use resource symbolic names, modules where beneficial, @description decorators, and secure parameters for secrets.
- Apply ALL compliance fixes from the violations list automatically in the Bicep.
- Apply ALL auto-fixable cost optimisations in the Bicep.
- Pipeline: multi-stage (validate → deploy-dev → deploy-prod) with approval gates on prod.
- Include What-If step before every deployment stage.
- parameters.json: use tokenised values (__RESOURCE_GROUP__, __ENVIRONMENT__, etc.).
- README: include prerequisites, deployment steps, and post-deployment verification.

Respond ONLY with valid JSON (no markdown outside JSON string values):
{
  "bicepFile": "// main.bicep\ntargetScope = ...",
  "pipelineYaml": "trigger:\n  ...",
  "parametersFile": "{ \"$schema\": ... }",
  "readmeFile": "# Deployment Guide\n...",
  "summary": {
    "resourceCount": 5,
    "complianceFixes": ["Enabled HTTPS-only on App Service"],
    "costOptimizations": ["Downgraded SQL to Standard S2"],
    "deploymentSteps": ["Run az login", "Run pipeline"]
  }
}`;

    const userContent = JSON.stringify({
      targetRegion:             userRequirements?.targetRegion     ?? 'West Europe',
      complianceProfile:        userRequirements?.complianceProfile ?? 'Default',
      scalabilityRequirements:  userRequirements?.scalabilityRequirements,
      budgetConstraintUSD:      userRequirements?.budgetConstraint,
      analysis: {
        resources:    analysis.resources,
        dependencies: analysis.dependencies,
        architecture: analysis.architecture,
      },
      complianceReport: {
        compliant:       complianceReport.compliant,
        violations:      complianceReport.violations,
        recommendations: complianceReport.recommendations,
      },
      costOptimization: {
        estimatedMonthlyCost: costOptimization.estimatedMonthlyCost,
        potentialSavings:     costOptimization.potentialSavings,
        optimizations:        costOptimization.optimizations,
      },
      instruction: 'Generate the deployment artifacts. Return JSON as specified.',
    }, null, 2);

    const result: AgentCallResult<GeneratedOutput> = await this.callLLM(
      systemPrompt,
      userContent,
      GeneratedOutputSchema,
      traceId,
      onProgress,
    );

    onProgress?.('writing-files', 90, 'Writing generated files...');

    logger.info('GeneratorAgent: generation complete', {
      traceId,
      complianceFixes:   result.data.summary.complianceFixes.length,
      costOptimizations: result.data.summary.costOptimizations.length,
      durationMs:        result.durationMs,
    });

    return {
      bicepFile:      result.data.bicepFile,
      pipelineYaml:   result.data.pipelineYaml,
      parametersFile: result.data.parametersFile,
      readmeFile:     result.data.readmeFile,
    };
  }

  async packageFiles(
    files:            GeneratedFiles,
    traceId:          string,
    complianceReport: PolicyComplianceResult,
    costOptimization: CostOptimization,
  ): Promise<string> {
    const zipFileName = `azure-deployment-${traceId.substring(0, 8)}.zip`;
    const zipPath     = path.join(this.outputDir, zipFileName);

    await fs.mkdir(this.outputDir, { recursive: true });

    await new Promise<void>((resolve, reject) => {
      const output  = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);

      archive.append(files.bicepFile,      { name: 'main.bicep' });
      archive.append(files.pipelineYaml,   { name: 'azure-pipeline.yml' });
      archive.append(files.parametersFile, { name: 'parameters.json' });
      archive.append(files.readmeFile,     { name: 'README.md' });

      // Include compliance & cost JSON reports for reference
      archive.append(
        JSON.stringify(complianceReport, null, 2),
        { name: 'reports/compliance-report.json' },
      );
      archive.append(
        JSON.stringify(costOptimization, null, 2),
        { name: 'reports/cost-optimization.json' },
      );

      archive.finalize();
    });

    logger.info('GeneratorAgent: ZIP package created', { traceId, zipPath });
    return `/download/${zipFileName}`;
  }
}
