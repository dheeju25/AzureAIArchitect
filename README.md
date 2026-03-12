# AI Superman

Your Architecture Assistant that converts Azure architecture diagrams to Bicep files and Azure Pipeline YAMLs using 5 specialized AI agents with end-to-end tracing.

## 🏗️ Architecture

The system consists of 5 specialized AI agents orchestrated with comprehensive tracing:

1. **Orchestrator Agent** - Routes requests and manages the workflow
2. **Analyzer Agent** - Extracts resources and architecture from diagrams
3. **Policy Compliance Agent** - Validates against Azure policies
4. **Cost Optimization Agent** - Optimizes costs using Microsoft Cost Management
5. **Generator Agent** - Generates Bicep files and Azure Pipeline YAMLs

## 🔍 Key Features

- **End-to-End Tracing**: Every request gets a unique trace ID for complete observability
- **Real-time Dashboard**: Query and visualize trace data with filtering capabilities
- **Azure Monitor Integration**: Native integration with Azure Monitor and OpenTelemetry
- **Policy Compliance**: Automated compliance checking against various profiles (HIPAA, PCI, SOX)
- **Cost Optimization**: AI-powered cost analysis and optimization suggestions
- **Automated Generation**: Creates deployment-ready Bicep files and Azure DevOps pipelines

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Azure subscription with AI Foundry access
- Azure Monitor workspace (optional but recommended)

### Installation

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd azure-ai-foundry-agents
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Azure credentials and endpoints
   ```

3. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

   For development:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Main interface: http://localhost:3000
   - Tracing dashboard: http://localhost:3000/dashboard.html

## 📋 Environment Configuration

### Required Variables
```bash
# Azure AI Foundry Configuration
AZURE_AI_FOUNDRY_ENDPOINT=https://your-foundry-endpoint.cognitiveservices.azure.com/
AZURE_AI_FOUNDRY_API_KEY=your-api-key-here

# Agent Endpoints (Configure these with your Azure AI Foundry agent URLs)
ORCHESTRATOR_AGENT_URL=https://your-orchestrator-endpoint.com
ANALYZER_AGENT_URL=https://your-analyzer-endpoint.com
POLICY_COMPLIANCE_AGENT_URL=https://your-policy-endpoint.com
COST_OPTIMIZATION_AGENT_URL=https://your-cost-endpoint.com
GENERATOR_AGENT_URL=https://your-generator-endpoint.com
```

### Optional Variables
```bash
# Azure Monitor (for enhanced tracing)
AZURE_MONITOR_CONNECTION_STRING=InstrumentationKey=...

# Server Configuration
PORT=3000
NODE_ENV=development

# Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads
OUTPUT_DIR=./generated
```

## 🔄 Workflow

1. **Upload**: User uploads an Azure architecture diagram in multiple supported formats
2. **Processing**: File is automatically processed and converted for optimal AI analysis  
3. **Analysis**: Analyzer Agent extracts resources, dependencies, and architecture patterns
4. **Compliance**: Policy Compliance Agent validates against selected compliance profile
5. **Optimization**: Cost Optimization Agent analyzes and suggests optimizations
6. **Generation**: Generator Agent creates Bicep files, Azure Pipeline YAML, and documentation
7. **Download**: Complete deployment package is provided as ZIP file

## 📁 Supported File Formats

### Diagram Formats
- **Draw.io**: `.drawio`, `.xml` files with full structure extraction
- **SVG**: Vector graphics with text and element analysis  
- **PDF**: Multi-page documents with text extraction
- **Visio**: `.vsdx` files (basic support)

### Image Formats  
- **PNG**: Portable Network Graphics
- **JPEG/JPG**: Joint Photographic Experts Group
- **GIF**: Graphics Interchange Format
- **WebP**: Modern image format

### Enhanced Processing
- **Intelligent Format Detection**: Automatic detection by file signature and content
- **Structure Extraction**: Text, shapes, and metadata extraction from structured formats
- **Image Normalization**: All formats converted to optimal resolution for AI analysis
- **Context Preservation**: Original diagram structure used to enhance AI understanding

## 📊 Tracing & Monitoring

### Trace Information
Each request generates:
- Unique trace ID for end-to-end tracking
- Detailed operation timeline with durations
- Input/output logging for each agent
- Error tracking with full context
- Performance metrics and bottleneck identification

### Dashboard Features
- Real-time trace querying with filters
- Trace timeline visualization
- Performance metrics overview
- Error rate monitoring
- Historical analysis capabilities

### API Endpoints
- `GET /api/traces` - Query traces with filtering
- `GET /api/traces/:traceId` - Get detailed trace information
- `GET /api/trace-metrics` - Get aggregated metrics
- `GET /api/status/:traceId` - Get processing status

## 🛡️ Compliance Profiles

### Supported Profiles
- **Default**: Basic Azure best practices
- **HIPAA**: Healthcare compliance requirements
- **PCI DSS**: Payment card industry standards
- **SOX**: Sarbanes-Oxley compliance

### Policy Checks
- HTTPS enforcement
- Encryption at rest and in transit
- Network security configuration
- Access control and monitoring
- Required resource tagging
- Data residency requirements

## 💰 Cost Optimization

### Features
- Real-time cost estimation
- Reserved instance recommendations
- Right-sizing suggestions
- Storage tier optimization
- Regional cost analysis
- Budget constraint validation

### Optimization Types
- **Immediate**: Quick wins with minimal impact
- **Planned**: Optimizations requiring planning
- **Strategic**: Long-term architectural improvements

## 🏗️ Generated Artifacts

### Bicep Template (`main.bicep`)
- Parameterized infrastructure as code
- Compliance-enforced configurations
- Cost-optimized resource specifications
- Dependency management

### Azure Pipeline (`azure-pipeline.yml`)
- Multi-stage deployment pipeline
- Validation and compliance checks
- Environment-specific configurations
- Post-deployment verification

### Supporting Files
- `parameters.json` - Environment-specific parameters
- `README.md` - Deployment instructions and documentation

## 🔧 Development

### Scripts
```bash
npm run build      # Build TypeScript
npm run dev        # Development with hot reload
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking
npm test           # Run tests
```

### Project Structure
```
src/
├── agents/           # AI agent implementations
├── services/         # Core services (tracing, telemetry)
├── middleware/       # Express middleware
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Main application entry point

public/              # Frontend assets
├── index.html       # Main upload interface
└── dashboard.html   # Tracing dashboard
```

## 🔍 API Reference

### Process Diagram
```http
POST /api/process-diagram
Content-Type: multipart/form-data

Form fields:
- diagram: Architecture diagram file
- targetRegion: Azure region (optional)
- budgetConstraint: Budget limit in USD (optional)
- complianceProfile: Compliance requirements (optional)
- scalabilityRequirements: Scaling needs (optional)
```

### Query Traces
```http
GET /api/traces?traceId=...&status=completed&limit=50
```

### Get Trace Details
```http
GET /api/traces/{traceId}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and type checking
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section in this README
2. Review the tracing dashboard for error details
3. Check application logs in the `logs/` directory
4. Open an issue on GitHub with trace ID and error details

## 🔮 Roadmap

- [ ] Support for ARM templates alongside Bicep
- [ ] Terraform template generation
- [ ] Integration with Azure Cost Management APIs
- [ ] Advanced compliance rule customization
- [ ] Multi-cloud architecture support
- [ ] Enhanced AI model fine-tuning
- [ ] Real-time collaboration features