/**
 * Comprehensive Test Suite for Azure Service Detection Accuracy
 * Tests edge cases, variations, and accuracy scenarios
 */

import { AzureServicesDatabase } from '../utils/azureServicesDatabase';
import { AdvancedPatternRecognition } from '../utils/advancedPatternRecognition';
import { ProcessedFile } from '../utils/fileProcessor';

interface TestCase {
  name: string;
  input: string;
  expectedServices: string[];
  expectedConfidence: number;
  category: 'basic' | 'edge_case' | 'complex' | 'negative';
}

export class AnalyzerAccuracyTests {
  private static testCases: TestCase[] = [
    // Basic Detection Tests
    {
      name: 'Simple App Service Detection',
      input: 'App Service webapp frontend',
      expectedServices: ['app-service'],
      expectedConfidence: 0.9,
      category: 'basic'
    },
    {
      name: 'SQL Database Detection',
      input: 'Azure SQL Database for user data',
      expectedServices: ['sql-database'],
      expectedConfidence: 0.9,
      category: 'basic'
    },
    {
      name: 'Virtual Machine Detection',
      input: 'VM Windows Server 2019',
      expectedServices: ['virtual-machines'],
      expectedConfidence: 0.9,
      category: 'basic'
    },
    {
      name: 'Storage Account Detection',
      input: 'Blob Storage for images',
      expectedServices: ['storage-account'],
      expectedConfidence: 0.9,
      category: 'basic'
    },

    // Edge Cases - Variations and Abbreviations
    {
      name: 'AKS Abbreviation',
      input: 'AKS cluster for microservices',
      expectedServices: ['kubernetes-service'],
      expectedConfidence: 0.85,
      category: 'edge_case'
    },
    {
      name: 'Mixed Case Service Names',
      input: 'CoSMoS DB for NoSQL data',
      expectedServices: ['cosmos-db'],
      expectedConfidence: 0.85,
      category: 'edge_case'
    },
    {
      name: 'Alternative Resource Type',
      input: 'Microsoft.Web/sites configuration',
      expectedServices: ['app-service'],
      expectedConfidence: 1.0,
      category: 'edge_case'
    },
    {
      name: 'Service with Typos',
      input: 'Applicaton Insigths monitoring',
      expectedServices: [], // Should not match due to typos
      expectedConfidence: 0.0,
      category: 'edge_case'
    },
    {
      name: 'Service Aliases',
      input: 'ACR for Docker images',
      expectedServices: ['container-registry'],
      expectedConfidence: 0.85,
      category: 'edge_case'
    },

    // Complex Scenarios
    {
      name: 'Three-Tier Architecture',
      input: 'Web App connecting to SQL Database with Blob Storage for files',
      expectedServices: ['app-service', 'sql-database', 'storage-account'],
      expectedConfidence: 0.9,
      category: 'complex'
    },
    {
      name: 'Microservices Architecture',
      input: 'AKS cluster with Container Registry and Application Insights monitoring',
      expectedServices: ['kubernetes-service', 'container-registry', 'application-insights'],
      expectedConfidence: 0.88,
      category: 'complex'
    },
    {
      name: 'Serverless Architecture',
      input: 'Azure Functions triggered by Cosmos DB changes with Key Vault secrets',
      expectedServices: ['azure-functions', 'cosmos-db', 'key-vault'],
      expectedConfidence: 0.9,
      category: 'complex'
    },
    {
      name: 'Network-Heavy Architecture',
      input: 'VMs behind Load Balancer in Virtual Network with VPN Gateway',
      expectedServices: ['virtual-machines', 'load-balancer', 'virtual-network'],
      expectedConfidence: 0.85,
      category: 'complex'
    },

    // Negative Test Cases
    {
      name: 'AWS Services Only',
      input: 'EC2 instance with RDS database and S3 bucket',
      expectedServices: [],
      expectedConfidence: 0.0,
      category: 'negative'
    },
    {
      name: 'GCP Services Only',
      input: 'Compute Engine with Cloud Storage and BigQuery',
      expectedServices: [],
      expectedConfidence: 0.0,
      category: 'negative'
    },
    {
      name: 'Generic Terms Only',
      input: 'Database server with web application and file storage',
      expectedServices: [],
      expectedConfidence: 0.0,
      category: 'negative'
    },
    {
      name: 'Non-Cloud Infrastructure',
      input: 'On-premise VMware vSphere with Oracle database',
      expectedServices: [],
      expectedConfidence: 0.0,
      category: 'negative'
    },

    // Tricky Cases
    {
      name: 'Azure in Company Name',
      input: 'Azure Corporation uses AWS services',
      expectedServices: [],
      expectedConfidence: 0.0,
      category: 'edge_case'
    },
    {
      name: 'Service Names in Different Context',
      input: 'The function app should not use cosmos as a variable name',
      expectedServices: ['azure-functions'], // Should detect function app but not cosmos
      expectedConfidence: 0.8,
      category: 'edge_case'
    },
    {
      name: 'Resource Types with Namespaces',
      input: 'Microsoft.Compute/virtualMachines/extensions configuration',
      expectedServices: ['virtual-machines'],
      expectedConfidence: 1.0,
      category: 'edge_case'
    },

    // Real-world Diagram Text Examples
    {
      name: 'Draw.io Web App Diagram',
      input: `
        Frontend: React App hosted on App Service
        Backend: .NET Core API on App Service
        Database: Azure SQL Database (Standard tier)
        Storage: Blob Storage for user uploads
        Cache: Redis Cache for session data
        Monitoring: Application Insights
      `,
      expectedServices: ['app-service', 'sql-database', 'storage-account', 'application-insights'],
      expectedConfidence: 0.92,
      category: 'complex'
    },
    {
      name: 'Visio Enterprise Diagram',
      input: `
        Load Balancer (Azure LB)
        Web Tier: 3x VMs (Standard_D2s_v3)
        App Tier: Function Apps
        Data Tier: Cosmos DB (MongoDB API)
        Network: VNet with 3 subnets
        Security: Key Vault for secrets
      `,
      expectedServices: ['load-balancer', 'virtual-machines', 'azure-functions', 'cosmos-db', 'virtual-network', 'key-vault'],
      expectedConfidence: 0.9,
      category: 'complex'
    }
  ];

  /**
   * Run all accuracy tests
   */
  public static async runAllTests(): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    accuracy: number;
    results: TestResult[];
  }> {
    const results: TestResult[] = [];
    let passedTests = 0;

    console.log('🚀 Starting comprehensive Azure service detection accuracy tests...\n');

    for (const testCase of this.testCases) {
      const result = await this.runSingleTest(testCase);
      results.push(result);
      
      if (result.passed) {
        passedTests++;
        console.log(`✅ ${testCase.name}: PASSED (Confidence: ${result.actualConfidence.toFixed(3)})`);
      } else {
        console.log(`❌ ${testCase.name}: FAILED`);
        console.log(`   Expected: ${testCase.expectedServices.join(', ')}`);
        console.log(`   Actual: ${result.detectedServices.join(', ')}`);
        console.log(`   Expected Confidence: ${testCase.expectedConfidence}`);
        console.log(`   Actual Confidence: ${result.actualConfidence.toFixed(3)}`);
      }
    }

    const accuracy = (passedTests / this.testCases.length) * 100;

    console.log(`\n📊 Test Results Summary:`);
    console.log(`Total Tests: ${this.testCases.length}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${this.testCases.length - passedTests}`);
    console.log(`Accuracy: ${accuracy.toFixed(2)}%`);

    // Category breakdown
    this.printCategoryBreakdown(results);

    return {
      totalTests: this.testCases.length,
      passedTests,
      failedTests: this.testCases.length - passedTests,
      accuracy: accuracy / 100,
      results
    };
  }

  /**
   * Run a single test case
   */
  private static async runSingleTest(testCase: TestCase): Promise<TestResult> {
    const detections = AzureServicesDatabase.detectService(testCase.input);
    const detectedServices = detections.map(d => d.service.id);
    const actualConfidence = detections.length > 0 
      ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length 
      : 0;

    // Check if detected services match expected services
    const expectedSet = new Set(testCase.expectedServices);
    const detectedSet = new Set(detectedServices);
    
    const correctDetections = [...expectedSet].filter(service => detectedSet.has(service));
    const missedDetections = [...expectedSet].filter(service => !detectedSet.has(service));
    const falsePositives = [...detectedSet].filter(service => !expectedSet.has(service));

    // Calculate precision, recall, and F1 score
    const precision = detectedServices.length > 0 ? correctDetections.length / detectedServices.length : 0;
    const recall = testCase.expectedServices.length > 0 ? correctDetections.length / testCase.expectedServices.length : 1;
    const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    // Test passes if:
    // 1. All expected services are detected (perfect recall)
    // 2. No false positives for negative test cases
    // 3. Confidence meets minimum threshold
    const passed = (
      missedDetections.length === 0 &&
      (testCase.category === 'negative' ? falsePositives.length === 0 : true) &&
      actualConfidence >= (testCase.expectedConfidence - 0.1) // Allow 10% confidence tolerance
    );

    return {
      testCase,
      detectedServices,
      actualConfidence,
      passed,
      precision,
      recall,
      f1Score,
      correctDetections,
      missedDetections,
      falsePositives
    };
  }

  /**
   * Print breakdown by test category
   */
  private static printCategoryBreakdown(results: TestResult[]) {
    const categories = ['basic', 'edge_case', 'complex', 'negative'];
    
    console.log(`\n📋 Results by Category:`);
    
    for (const category of categories) {
      const categoryResults = results.filter(r => r.testCase.category === category);
      const passed = categoryResults.filter(r => r.passed).length;
      const total = categoryResults.length;
      const accuracy = total > 0 ? (passed / total) * 100 : 0;
      
      console.log(`${category.toUpperCase()}: ${passed}/${total} (${accuracy.toFixed(1)}%)`);
    }
  }

  /**
   * Run stress tests with variations
   */
  public static async runStressTests(): Promise<void> {
    console.log('\n🔥 Running stress tests with variations...\n');

    const baseService = 'Azure App Service web application';
    const variations = [
      'app service',
      'App Service',
      'APP SERVICE',
      'azure app service',
      'Azure App Service',
      'AZURE APP SERVICE',
      'web app',
      'Web App',
      'WEB APP',
      'webapp',
      'WebApp',
      'WEBAPP',
      'Microsoft.Web/sites',
      'microsoft.web/sites',
      'MICROSOFT.WEB/SITES'
    ];

    let successCount = 0;

    for (const variation of variations) {
      const detections = AzureServicesDatabase.detectService(variation);
      const hasAppService = detections.some(d => d.service.id === 'app-service');
      
      if (hasAppService) {
        successCount++;
        console.log(`✅ "${variation}" -> Detected App Service (${detections[0].confidence.toFixed(3)})`);
      } else {
        console.log(`❌ "${variation}" -> NOT detected`);
      }
    }

    const stressAccuracy = (successCount / variations.length) * 100;
    console.log(`\nStress Test Accuracy: ${stressAccuracy.toFixed(1)}% (${successCount}/${variations.length})`);
  }

  /**
   * Test architectural pattern recognition
   */
  public static async testArchitecturalPatterns(): Promise<void> {
    console.log('\n🏗️  Testing architectural pattern recognition...\n');

    const patterns = [
      {
        name: 'Three-tier Web App',
        input: 'Frontend App Service, Backend SQL Database, File Storage Account',
        expectedPattern: 'Three-tier Architecture'
      },
      {
        name: 'Microservices',
        input: 'AKS cluster with Container Registry and Application Insights',
        expectedPattern: 'Microservices with Kubernetes'
      },
      {
        name: 'Serverless',
        input: 'Azure Functions with Cosmos DB and Application Insights',
        expectedPattern: 'Serverless Architecture'
      },
      {
        name: 'VM-based',
        input: 'Virtual Machines with Load Balancer and Virtual Network',
        expectedPattern: 'Traditional VM-based'
      }
    ];

    for (const pattern of patterns) {
      const mockProcessedFile: ProcessedFile = {
        content: Buffer.from(''),
        format: 'drawio',
        metadata: {
          originalName: pattern.input,
          size: 1000,
          mimeType: 'application/xml'
        },
        extractedData: {
          elements: [{ text: pattern.input }]
        }
      };

      const detections = await AdvancedPatternRecognition.analyzeServices(mockProcessedFile);
      const metrics = AdvancedPatternRecognition.calculateAccuracyMetrics(detections);
      
      console.log(`${pattern.name}:`);
      console.log(`  Services detected: ${detections.length}`);
      console.log(`  Accuracy score: ${metrics.accuracyScore.toFixed(3)}`);
      console.log(`  High confidence: ${metrics.highConfidenceCount}`);
    }
  }
}

interface TestResult {
  testCase: TestCase;
  detectedServices: string[];
  actualConfidence: number;
  passed: boolean;
  precision: number;
  recall: number;
  f1Score: number;
  correctDetections: string[];
  missedDetections: string[];
  falsePositives: string[];
}

// Export test runner for CLI usage
export async function runAccuracyTests() {
  const results = await AnalyzerAccuracyTests.runAllTests();
  await AnalyzerAccuracyTests.runStressTests();
  await AnalyzerAccuracyTests.testArchitecturalPatterns();
  
  return results;
}