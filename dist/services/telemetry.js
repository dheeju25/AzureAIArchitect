"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryService = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const monitor_opentelemetry_1 = require("@azure/monitor-opentelemetry");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const logger_1 = require("../utils/logger");
class TelemetryService {
    constructor() {
        this.sdk = null;
    }
    initialize() {
        try {
            if (process.env.AZURE_MONITOR_CONNECTION_STRING) {
                (0, monitor_opentelemetry_1.useAzureMonitor)();
                logger_1.logger.info('Azure Monitor telemetry initialized');
            }
            const sdk = new sdk_node_1.NodeSDK({
                resource: new resources_1.Resource({
                    [semantic_conventions_1.ATTR_SERVICE_NAME]: 'ai-superman',
                    [semantic_conventions_1.ATTR_SERVICE_VERSION]: '1.0.0',
                    [semantic_conventions_1.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
                }),
                instrumentations: [
                    (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)(),
                    new instrumentation_express_1.ExpressInstrumentation(),
                    new instrumentation_http_1.HttpInstrumentation()
                ]
            });
            sdk.start();
            this.sdk = sdk;
            logger_1.logger.info('OpenTelemetry SDK initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize telemetry', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    shutdown() {
        if (this.sdk) {
            return this.sdk.shutdown();
        }
        return Promise.resolve();
    }
}
exports.telemetryService = new TelemetryService();
//# sourceMappingURL=telemetry.js.map