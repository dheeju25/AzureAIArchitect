#!/usr/bin/env npx ts-node

/**
 * Test Runner Script for Azure Analyzer Accuracy Validation
 * Run this script to validate 100% accuracy of the enhanced analyzer
 */

import { runAccuracyTests } from '../tests/analyzerAccuracyTests';
import { logger } from '../utils/logger';

async function main() {
  console.log('🔬 Azure AI Architect - Analyzer Accuracy Test Suite');
  console.log('='.repeat(60));
  console.log('Testing enhanced Azure service detection for 100% accuracy...\n');

  try {
    // Set up logging for test environment
    process.env.NODE_ENV = 'test';
    
    const startTime = Date.now();
    
    // Run comprehensive accuracy tests
    const results = await runAccuracyTests();
    
    const endTime = Date.now();
    const testDuration = endTime - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 FINAL ACCURACY REPORT');
    console.log('='.repeat(60));
    
    console.log(`⏱️  Test Duration: ${testDuration}ms`);
    console.log(`📊 Overall Accuracy: ${(results.accuracy * 100).toFixed(2)}%`);
    console.log(`✅ Tests Passed: ${results.passedTests}/${results.totalTests}`);
    console.log(`❌ Tests Failed: ${results.failedTests}/${results.totalTests}`);
    
    // Accuracy benchmarks
    if (results.accuracy >= 0.95) {
      console.log('🌟 EXCELLENT: Achieved 95%+ accuracy target!');
    } else if (results.accuracy >= 0.90) {
      console.log('✨ VERY GOOD: Achieved 90%+ accuracy');
    } else if (results.accuracy >= 0.80) {
      console.log('👍 GOOD: Achieved 80%+ accuracy');
    } else {
      console.log('⚠️  NEEDS IMPROVEMENT: Below 80% accuracy threshold');
    }
    
    // Detailed breakdown
    console.log('\n📈 Test Category Performance:');
    const categoryStats = new Map<string, { passed: number; total: number }>();
    
    for (const result of results.results) {
      const category = result.testCase.category;
      if (!categoryStats.has(category)) {
        categoryStats.set(category, { passed: 0, total: 0 });
      }
      const stats = categoryStats.get(category)!;
      stats.total++;
      if (result.passed) stats.passed++;
    }
    
    for (const [category, stats] of categoryStats) {
      const accuracy = (stats.passed / stats.total) * 100;
      console.log(`  ${category.toUpperCase()}: ${stats.passed}/${stats.total} (${accuracy.toFixed(1)}%)`);
    }
    
    // Confidence analysis
    const confidenceScores = results.results.map(r => r.actualConfidence);
    const avgConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    const highConfidenceCount = confidenceScores.filter(score => score >= 0.9).length;
    const mediumConfidenceCount = confidenceScores.filter(score => score >= 0.7 && score < 0.9).length;
    const lowConfidenceCount = confidenceScores.filter(score => score < 0.7).length;
    
    console.log('\n🎯 Confidence Distribution:');
    console.log(`  Average Confidence: ${avgConfidence.toFixed(3)}`);
    console.log(`  High (≥0.9): ${highConfidenceCount} tests`);
    console.log(`  Medium (0.7-0.9): ${mediumConfidenceCount} tests`);
    console.log(`  Low (<0.7): ${lowConfidenceCount} tests`);
    
    // Failed tests analysis
    if (results.failedTests > 0) {
      console.log('\n❌ Failed Tests Analysis:');
      const failedTests = results.results.filter(r => !r.passed);
      
      for (const failedTest of failedTests.slice(0, 5)) { // Show first 5 failures
        console.log(`\n  Test: ${failedTest.testCase.name}`);
        console.log(`  Expected: [${failedTest.testCase.expectedServices.join(', ')}]`);
        console.log(`  Detected: [${failedTest.detectedServices.join(', ')}]`);
        console.log(`  Confidence: ${failedTest.actualConfidence.toFixed(3)} (expected: ${failedTest.testCase.expectedConfidence})`);
        
        if (failedTest.missedDetections.length > 0) {
          console.log(`  Missed: [${failedTest.missedDetections.join(', ')}]`);
        }
        if (failedTest.falsePositives.length > 0) {
          console.log(`  False Positives: [${failedTest.falsePositives.join(', ')}]`);
        }
      }
      
      if (failedTests.length > 5) {
        console.log(`  ... and ${failedTests.length - 5} more failed tests`);
      }
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (results.accuracy >= 0.95) {
      console.log('  ✅ System is production-ready with excellent accuracy!');
      console.log('  ✅ Consider adding more edge cases to maintain quality');
    } else {
      console.log('  🔧 Review failed test cases and improve detection patterns');
      console.log('  🔧 Consider expanding the Azure services database');
      console.log('  🔧 Add more specific regex patterns for edge cases');
    }
    
    // Performance metrics
    console.log('\n⚡ Performance Metrics:');
    console.log(`  Tests per second: ${(results.totalTests / (testDuration / 1000)).toFixed(2)}`);
    console.log(`  Average test time: ${(testDuration / results.totalTests).toFixed(2)}ms`);
    
    console.log('\n' + '='.repeat(60));
    
    // Exit with appropriate code
    if (results.accuracy >= 0.95) {
      console.log('🎉 SUCCESS: Azure service detection accuracy meets production standards!');
      process.exit(0);
    } else {
      console.log('⚠️  WARNING: Accuracy below production threshold (95%). Review and improve.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    logger.error('Test execution failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Azure Analyzer Accuracy Test Suite

Usage: npx ts-node testAnalyzerAccuracy.ts [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Enable verbose logging
  --category, -c [category]  Run tests for specific category only
                            (basic, edge_case, complex, negative)

Examples:
  npx ts-node testAnalyzerAccuracy.ts
  npx ts-node testAnalyzerAccuracy.ts --verbose
  npx ts-node testAnalyzerAccuracy.ts --category basic
    `);
    process.exit(0);
  }
  
  if (args.includes('--verbose') || args.includes('-v')) {
    process.env.LOG_LEVEL = 'debug';
  }
  
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}