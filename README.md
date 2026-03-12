# AzureAIArchitect

Your Architecture Assistant that converts Azure architecture diagrams into Bicep files and Azure Pipeline YAMLs using an AI-powered processing pipeline with end-to-end tracing.

## 🏗️ Architecture

The system runs a local processing pipeline with four specialized modules orchestrated by a central controller:

1. **OrchestratorAgent** – Routes requests and manages the end-to-end workflow
2. **AnalyzerAgent** – Extracts resources and architecture patterns from uploaded diagrams
3. **PolicyComplianceAgent** – Validates resources against Azure compliance profiles
4. **CostOptimizationAgent** – Analyses costs and suggests optimizations
5. **GeneratorAgent** – Produces Bicep templates, Azure Pipeline YAMLs, and a downloadable ZIP

Progress is streamed in real-time to the frontend via WebSocket (Socket.io).

## 🔍 Key Features

- **End-to-End Tracing**: Every request gets a unique trace ID for complete observability
- **Real-time Progress**: WebSocket updates pushed to the UI as each pipeline step completes
- **Azure Monitor / OpenTelemetry Integration**: Native telemetry for production monitoring
- **Policy Compliance**: Automated compliance checks against HIPAA, PCI DSS, SOX, and default Azure best practices
- **Cost Optimization**: AI-powered cost analysis with right-sizing and reserved instance recommendations
- **Automated Generation**: Deployment-ready Bicep templates and Azure DevOps pipeline YAML

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Azure subscription with Azure OpenAI or AI Foundry access
- Azure Monitor workspace (optional, for enhanced telemetry)

### Installation

1. **Clone and setup**:
   ```bash
   git clone https://github.com/dheeju25/AzureAIArchitect.git
   cd AzureAIArchitect
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Azure credentials
   ```

3. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

   For development with hot reload:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Main interface: http://localhost:3000
   - Tracing dashboard: http://localhost:3000/dashboard.html

## 📋 Environment Configuration

### Required Variables
```bash
# Azure OpenAI / AI Foundry
AZURE_AI_FOUNDRY_ENDPOINT=https://your-foundry-endpoint.cognitiveservices.azure.com/
AZURE_AI_FOUNDRY_API_KEY=your-api-key-here
```

### Optional Variables
```bash
# Azure Monitor (enhanced tracing)
AZURE_MONITOR_CONNECTION_STRING=InstrumentationKey=...

# Server
PORT=3000
NODE_ENV=development

# File handling
MAX_FILE_SIZE=10485760   # 10 MB
UPLOAD_DIR=./uploads
OUTPUT_DIR=./generated
```

## 🔄 Processing Workflow

1. **Upload** – User uploads an Azure architecture diagram (Draw.io, SVG, PDF, PNG, JPEG, WebP, GIF, Visio)
2. **Analyze** – AnalyzerAgent extracts resources, dependencies, and architecture patterns
3. **Compliance** – PolicyComplianceAgent validates against the chosen compliance profile
4. **Optimize** – CostOptimizationAgent suggests cost savings and right-sizing
5. **Generate** – GeneratorAgent creates Bicep template, pipeline YAML, parameters file, and README
6. **Download** – Complete deployment package delivered as a ZIP

## 📁 Supported Input Formats

| Category | Formats |
|----------|---------|
| Diagram | `.drawio`, `.xml`, `.svg`, `.pdf`, `.vsdx` |
| Image | `.png`, `.jpg`/`.jpeg`, `.gif`, `.webp` |

All formats are automatically detected by file signature and normalized for AI analysis.

## 📊 Tracing & Monitoring

Each request generates a unique trace ID. The tracing system records:
- Operation timeline with per-step durations
- Input/output for each pipeline stage
- Error context with full stack traces
- Aggregated performance metrics

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/process-diagram` | Upload diagram and start processing |
| GET | `/api/status/:traceId` | Poll processing status |
| GET | `/api/traces` | Query traces with filters |
| GET | `/api/traces/:traceId` | Detailed trace information |
| GET | `/api/trace-metrics` | Aggregated dashboard metrics |
| GET | `/download/:filename` | Download generated ZIP |

## 🛡️ Compliance Profiles

| Profile | Description |
|---------|-------------|
| Default | Azure best practices |
| HIPAA | Healthcare compliance |
| PCI DSS | Payment card industry |
| SOX | Sarbanes-Oxley |

Checks include HTTPS enforcement, encryption at rest/in transit, network security, access control, resource tagging, and data residency.

## 💰 Cost Optimization

- Real-time cost estimation per resource
- Reserved instance and savings plan recommendations
- Right-sizing suggestions based on architecture patterns
- Storage tier and regional cost comparisons
- Budget constraint validation

Optimizations are categorised as **Immediate**, **Planned**, or **Strategic**.

## 🏗️ Generated Artifacts

| File | Description |
|------|-------------|
| `main.bicep` | Parameterized, compliance-enforced IaC template |
| `azure-pipeline.yml` | Multi-stage Azure DevOps pipeline |
| `parameters.json` | Environment-specific parameter values |
| `README.md` | Deployment instructions |

All files are packaged into a single downloadable ZIP.

## 🔧 Development

```bash
npm run build      # Compile TypeScript
npm run dev        # Start with ts-node (hot reload)
npm run lint       # ESLint
npm run typecheck  # TypeScript type check (no emit)
npm test           # Jest tests
```

### Project Structure

```
src/
├── agents/          # Processing pipeline modules
│   ├── orchestrator.ts
│   ├── analyzer.ts
│   ├── policyCompliance.ts
│   ├── costOptimization.ts
│   └── generator.ts
├── services/        # Tracing, telemetry, WebSocket
├── middleware/      # Express middleware (tracing, upload)
├── types/           # Shared TypeScript interfaces
├── utils/           # Logger and helpers
└── index.ts         # Express app entry point

public/
├── index.html       # Upload UI
└── dashboard.html   # Tracing dashboard
```

## 🔮 Roadmap

- [ ] ARM template generation alongside Bicep
- [ ] Terraform output support
- [ ] Live Azure Cost Management API integration
- [ ] Custom compliance rule editor
- [ ] Multi-cloud architecture support
- [ ] Real-time collaboration features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run `npm run lint && npm run typecheck`
5. Open a pull request

## 📄 License

MIT — see LICENSE for details.
