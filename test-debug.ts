import { AzureServicesDatabase } from './src/utils/azureServicesDatabase';

const testText = 'Database server with web application and file storage';
console.log('Testing:', testText);

const results = AzureServicesDatabase.detectService(testText);
console.log('Results:', results.map(r => ({
  service: r.service.id,
  confidence: r.confidence,
  matchType: r.matchType,
  matchedText: r.matchedText
})));