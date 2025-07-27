import { NodeSDK } from '@opentelemetry/sdk-node';
import { useAzureMonitor } from '@azure/monitor-opentelemetry';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { logger } from '../utils/logger';

class TelemetryService {
  private sdk: NodeSDK | null = null;

  initialize(): void {
    try {
      if (process.env.AZURE_MONITOR_CONNECTION_STRING) {
        useAzureMonitor();
        logger.info('Azure Monitor telemetry initialized');
      }

      const sdk = new NodeSDK({
        resource: new Resource({
          [ATTR_SERVICE_NAME]: 'ai-superman',
          [ATTR_SERVICE_VERSION]: '1.0.0',
          [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
        }),
        instrumentations: [
          getNodeAutoInstrumentations(),
          new ExpressInstrumentation(),
          new HttpInstrumentation()
        ]
      });

      sdk.start();
      this.sdk = sdk;
      logger.info('OpenTelemetry SDK initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize telemetry', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  shutdown(): Promise<void> {
    if (this.sdk) {
      return this.sdk.shutdown();
    }
    return Promise.resolve();
  }
}

export const telemetryService = new TelemetryService();