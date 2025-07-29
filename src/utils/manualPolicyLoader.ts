/**
 * Manual Policy Loader - Loads and validates JSON policies from the policies directory
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ManualPolicy, PolicyLoader } from '../types/policies';
import { logger } from './logger';

export class ManualPolicyLoader implements PolicyLoader {
  private readonly policiesDir: string;
  private cachedPolicies: ManualPolicy[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(policiesDir: string = 'policies') {
    this.policiesDir = path.resolve(policiesDir);
  }

  /**
   * Load all policies from the policies directory
   */
  async loadPolicies(): Promise<ManualPolicy[]> {
    const now = Date.now();
    
    // Return cached policies if still valid
    if (this.cachedPolicies && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedPolicies;
    }

    try {
      const policies: ManualPolicy[] = [];
      const categories = ['security', 'cost', 'performance', 'compliance', 'custom'];

      for (const category of categories) {
        const categoryPolicies = await this.loadPoliciesByCategory(category);
        policies.push(...categoryPolicies);
      }

      // Validate all policies
      const validPolicies = policies.filter(policy => this.validatePolicy(policy));

      logger.info('Manual policies loaded successfully', {
        totalPolicies: validPolicies.length,
        invalidPolicies: policies.length - validPolicies.length,
        categories: categories.length
      });

      // Update cache
      this.cachedPolicies = validPolicies;
      this.cacheTimestamp = now;

      return validPolicies;
    } catch (error) {
      logger.error('Failed to load manual policies', {
        error: error instanceof Error ? error.message : 'Unknown error',
        policiesDir: this.policiesDir
      });
      return [];
    }
  }

  /**
   * Load policies from a specific category
   */
  async loadPoliciesByCategory(category: string): Promise<ManualPolicy[]> {
    const categoryDir = path.join(this.policiesDir, category);
    const policies: ManualPolicy[] = [];

    try {
      // Check if category directory exists
      const stats = await fs.stat(categoryDir);
      if (!stats.isDirectory()) {
        logger.warn('Policy category directory not found or not a directory', { category, categoryDir });
        return [];
      }

      // Read all JSON files in the category directory
      const files = await fs.readdir(categoryDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(categoryDir, file);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const policy: ManualPolicy = JSON.parse(fileContent);

          // Ensure category matches directory
          policy.category = category as any;

          policies.push(policy);
        } catch (error) {
          logger.error('Failed to load policy file', {
            file,
            category,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.debug('Loaded policies for category', {
        category,
        count: policies.length,
        files: jsonFiles.length
      });

    } catch (error) {
      logger.error('Failed to read category directory', {
        category,
        categoryDir,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return policies;
  }

  /**
   * Validate a policy object
   */
  validatePolicy(policy: ManualPolicy): boolean {
    const requiredFields = ['id', 'name', 'category', 'description', 'severity', 'resourceTypes', 'conditions', 'fix'];
    
    try {
      // Check required fields
      for (const field of requiredFields) {
        if (!(field in policy) || policy[field as keyof ManualPolicy] === undefined) {
          logger.error('Policy validation failed: missing required field', {
            policyId: policy.id || 'unknown',
            missingField: field
          });
          return false;
        }
      }

      // Validate severity
      if (!['critical', 'high', 'medium', 'low'].includes(policy.severity)) {
        logger.error('Policy validation failed: invalid severity', {
          policyId: policy.id,
          severity: policy.severity
        });
        return false;
      }

      // Validate category
      if (!['security', 'cost', 'performance', 'compliance', 'custom'].includes(policy.category)) {
        logger.error('Policy validation failed: invalid category', {
          policyId: policy.id,
          category: policy.category
        });
        return false;
      }

      // Validate conditions
      if (!policy.conditions.property || !policy.conditions.operator) {
        logger.error('Policy validation failed: invalid conditions', {
          policyId: policy.id,
          conditions: policy.conditions
        });
        return false;
      }

      // Validate fix
      if (!policy.fix.action || !policy.fix.property) {
        logger.error('Policy validation failed: invalid fix', {
          policyId: policy.id,
          fix: policy.fix
        });
        return false;
      }

      // Validate resource types
      if (!Array.isArray(policy.resourceTypes) || policy.resourceTypes.length === 0) {
        logger.error('Policy validation failed: invalid resourceTypes', {
          policyId: policy.id,
          resourceTypes: policy.resourceTypes
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Policy validation failed with exception', {
        policyId: policy.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get policies by severity
   */
  async getPoliciesBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): Promise<ManualPolicy[]> {
    const allPolicies = await this.loadPolicies();
    return allPolicies.filter(policy => policy.severity === severity);
  }

  /**
   * Get policies that apply to a specific resource type
   */
  async getPoliciesForResourceType(resourceType: string): Promise<ManualPolicy[]> {
    const allPolicies = await this.loadPolicies();
    return allPolicies.filter(policy => 
      policy.resourceTypes.includes('*') || 
      policy.resourceTypes.includes(resourceType) ||
      policy.resourceTypes.some(type => resourceType.startsWith(type))
    );
  }

  /**
   * Clear policy cache (useful for testing or when policies are updated)
   */
  clearCache(): void {
    this.cachedPolicies = null;
    this.cacheTimestamp = 0;
    logger.debug('Manual policy cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cached: boolean; age: number; policies: number } {
    const now = Date.now();
    return {
      cached: this.cachedPolicies !== null,
      age: now - this.cacheTimestamp,
      policies: this.cachedPolicies?.length || 0
    };
  }
}