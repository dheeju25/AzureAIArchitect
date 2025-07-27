import { DiagramAnalysis } from '../types';
export declare class AnalyzerAgent {
    private azureAIEndpoint;
    private azureAIKey;
    constructor();
    analyzeDiagram(diagramBuffer: Buffer, fileName: string, traceId: string): Promise<DiagramAnalysis>;
    private callAzureAIFoundryAgent;
    private parseAnalysisResult;
    private getMimeType;
}
//# sourceMappingURL=analyzer.d.ts.map