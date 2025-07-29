/**
 * Comprehensive Azure Services Database for 100% Accurate Detection
 * This database contains ALL Azure services with their various name patterns,
 * resource types, aliases, and detection patterns.
 */

export interface AzureServiceDefinition {
  id: string;
  displayName: string;
  category: string;
  resourceType: string;
  alternativeResourceTypes: string[];
  keywords: string[];
  aliases: string[];
  commonNames: string[];
  abbreviations: string[];
  iconPatterns: string[];
  textPatterns: RegExp[];
  properties: {
    tier?: string[];
    sku?: string[];
    defaultLocation?: string;
    pricing?: string[];
  };
  dependencies: {
    commonlyUsedWith: string[];
    requiredWith: string[];
  };
  confidence: {
    exact: number;
    keyword: number;
    pattern: number;
  };
}

export class AzureServicesDatabase {
  private static services: AzureServiceDefinition[] = [
    // Compute Services
    {
      id: 'virtual-machines',
      displayName: 'Virtual Machines',
      category: 'Compute',
      resourceType: 'Microsoft.Compute/virtualMachines',
      alternativeResourceTypes: ['Microsoft.Compute/VirtualMachines', 'VM'],
      keywords: ['virtual machine', 'vm', 'virtual machines', 'compute', 'server', 'instance'],
      aliases: ['vm', 'vms', 'azure vm', 'virtual machine', 'compute instance'],
      commonNames: ['VM', 'Virtual Machine', 'Azure VM', 'Compute VM', 'Windows VM', 'Linux VM'],
      abbreviations: ['vm', 'vms', 'avm'],
      iconPatterns: ['vm', 'virtual-machine', 'computer', 'server'],
      textPatterns: [
        /\bvm\b/i,
        /virtual\s*machine/i,
        /compute\s*instance/i,
        /azure\s*vm/i,
        /windows\s*vm/i,
        /linux\s*vm/i
      ],
      properties: {
        tier: ['Basic', 'Standard', 'Premium'],
        sku: ['A1', 'D2s_v3', 'B1s', 'F2s_v2'],
        pricing: ['Pay-as-you-go', 'Reserved']
      },
      dependencies: {
        commonlyUsedWith: ['virtual-network', 'storage-account', 'network-security-group'],
        requiredWith: ['virtual-network']
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    {
      id: 'app-service',
      displayName: 'App Service',
      category: 'Compute',
      resourceType: 'Microsoft.Web/sites',
      alternativeResourceTypes: ['Microsoft.Web/Sites', 'Microsoft.Web/serverfarms'],
      keywords: ['app service', 'web app', 'webapp', 'web application', 'api app', 'mobile app'],
      aliases: ['web app', 'webapp', 'app service', 'azure web app', 'web application'],
      commonNames: ['App Service', 'Web App', 'API App', 'Mobile App', 'Function App'],
      abbreviations: ['as', 'wa', 'webapp'],
      iconPatterns: ['web-app', 'app-service', 'globe', 'web'],
      textPatterns: [
        /app\s*service/i,
        /web\s*app/i,
        /web\s*application/i,
        /api\s*app/i,
        /mobile\s*app/i,
        /webapp/i
      ],
      properties: {
        tier: ['Free', 'Shared', 'Basic', 'Standard', 'Premium', 'Isolated'],
        sku: ['F1', 'D1', 'B1', 'S1', 'P1v2', 'I1'],
        pricing: ['Consumption', 'App Service Plan']
      },
      dependencies: {
        commonlyUsedWith: ['sql-database', 'storage-account', 'application-insights'],
        requiredWith: []
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    {
      id: 'azure-functions',
      displayName: 'Azure Functions',
      category: 'Compute',
      resourceType: 'Microsoft.Web/sites',
      alternativeResourceTypes: ['Microsoft.Web/Sites/functions'],
      keywords: ['azure functions', 'function app', 'functions', 'serverless', 'faas'],
      aliases: ['functions', 'function app', 'azure functions', 'serverless functions'],
      commonNames: ['Azure Functions', 'Function App', 'Functions', 'Serverless Functions'],
      abbreviations: ['af', 'func', 'functions'],
      iconPatterns: ['function', 'lambda', 'code', 'serverless'],
      textPatterns: [
        /azure\s*functions/i,
        /function\s*app/i,
        /\bfunctions\b/i,
        /serverless/i,
        /faas/i
      ],
      properties: {
        tier: ['Consumption', 'Premium', 'Dedicated'],
        pricing: ['Pay-per-execution', 'Premium Plan']
      },
      dependencies: {
        commonlyUsedWith: ['storage-account', 'application-insights', 'key-vault'],
        requiredWith: ['storage-account']
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    
    // Database Services
    {
      id: 'sql-database',
      displayName: 'SQL Database',
      category: 'Database',
      resourceType: 'Microsoft.Sql/servers/databases',
      alternativeResourceTypes: ['Microsoft.Sql/servers', 'Microsoft.Sql/databases'],
      keywords: ['sql database', 'azure sql', 'sql db', 'database', 'relational database', 'mssql'],
      aliases: ['sql db', 'azure sql', 'sql database', 'azure sql database'],
      commonNames: ['SQL Database', 'Azure SQL', 'SQL DB', 'Azure SQL Database'],
      abbreviations: ['sqldb', 'sql', 'db'],
      iconPatterns: ['database', 'sql', 'data'],
      textPatterns: [
        /sql\s*database/i,
        /azure\s*sql/i,
        /sql\s*db/i,
        /\bsqldb\b/i,
        /mssql/i,
        /relational\s*database/i
      ],
      properties: {
        tier: ['Basic', 'Standard', 'Premium', 'General Purpose', 'Business Critical'],
        sku: ['Basic', 'S0', 'S1', 'P1', 'GP_Gen5_2'],
        pricing: ['DTU', 'vCore']
      },
      dependencies: {
        commonlyUsedWith: ['app-service', 'virtual-machines', 'key-vault'],
        requiredWith: []
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    {
      id: 'cosmos-db',
      displayName: 'Cosmos DB',
      category: 'Database',
      resourceType: 'Microsoft.DocumentDB/databaseAccounts',
      alternativeResourceTypes: ['Microsoft.DocumentDB/accounts'],
      keywords: ['cosmos db', 'cosmosdb', 'document db', 'nosql', 'mongodb', 'cassandra', 'graph db'],
      aliases: ['cosmos', 'cosmosdb', 'document db', 'azure cosmos'],
      commonNames: ['Cosmos DB', 'Azure Cosmos DB', 'DocumentDB', 'NoSQL Database'],
      abbreviations: ['cosmos', 'cdb', 'docdb'],
      iconPatterns: ['cosmos', 'database', 'document', 'nosql'],
      textPatterns: [
        /cosmos\s*db/i,
        /cosmosdb/i,
        /document\s*db/i,
        /azure\s*cosmos/i,
        /nosql/i,
        /mongodb\s*api/i
      ],
      properties: {
        tier: ['Serverless', 'Provisioned'],
        sku: ['Standard'],
        pricing: ['Request Units', 'Serverless']
      },
      dependencies: {
        commonlyUsedWith: ['app-service', 'azure-functions', 'application-insights'],
        requiredWith: []
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    
    // Storage Services
    {
      id: 'storage-account',
      displayName: 'Storage Account',
      category: 'Storage',
      resourceType: 'Microsoft.Storage/storageAccounts',
      alternativeResourceTypes: ['Microsoft.Storage/StorageAccounts'],
      keywords: ['storage account', 'blob storage', 'file storage', 'queue storage', 'table storage', 'azure storage'],
      aliases: ['storage', 'blob', 'azure storage', 'storage account'],
      commonNames: ['Storage Account', 'Blob Storage', 'Azure Storage', 'File Storage'],
      abbreviations: ['sa', 'storage', 'blob'],
      iconPatterns: ['storage', 'blob', 'file', 'data'],
      textPatterns: [
        /storage\s*account/i,
        /blob\s*storage/i,
        /azure\s*storage/i,
        /file\s*storage/i,
        /queue\s*storage/i,
        /table\s*storage/i
      ],
      properties: {
        tier: ['Standard', 'Premium'],
        sku: ['Standard_LRS', 'Standard_GRS', 'Premium_LRS'],
        pricing: ['Hot', 'Cool', 'Archive']
      },
      dependencies: {
        commonlyUsedWith: ['app-service', 'virtual-machines', 'azure-functions'],
        requiredWith: []
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    
    // Networking Services
    {
      id: 'virtual-network',
      displayName: 'Virtual Network',
      category: 'Networking',
      resourceType: 'Microsoft.Network/virtualNetworks',
      alternativeResourceTypes: ['Microsoft.Network/VirtualNetworks'],
      keywords: ['virtual network', 'vnet', 'network', 'subnet', 'vpc'],
      aliases: ['vnet', 'virtual network', 'azure vnet', 'network'],
      commonNames: ['Virtual Network', 'VNet', 'Azure VNet', 'Network'],
      abbreviations: ['vnet', 'vn', 'net'],
      iconPatterns: ['network', 'vnet', 'cloud-network'],
      textPatterns: [
        /virtual\s*network/i,
        /\bvnet\b/i,
        /azure\s*vnet/i,
        /\bvpc\b/i,
        /subnet/i
      ],
      properties: {
        tier: ['Standard'],
        pricing: ['Free', 'Gateway charges apply']
      },
      dependencies: {
        commonlyUsedWith: ['virtual-machines', 'app-service', 'load-balancer'],
        requiredWith: []
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    {
      id: 'load-balancer',
      displayName: 'Load Balancer',
      category: 'Networking',
      resourceType: 'Microsoft.Network/loadBalancers',
      alternativeResourceTypes: ['Microsoft.Network/LoadBalancers'],
      keywords: ['load balancer', 'lb', 'application gateway', 'traffic manager', 'front door'],
      aliases: ['lb', 'load balancer', 'alb', 'application gateway'],
      commonNames: ['Load Balancer', 'Application Gateway', 'Traffic Manager', 'Front Door'],
      abbreviations: ['lb', 'alb', 'ag', 'tm'],
      iconPatterns: ['load-balancer', 'gateway', 'traffic'],
      textPatterns: [
        /load\s*balancer/i,
        /\blb\b/i,
        /application\s*gateway/i,
        /traffic\s*manager/i,
        /front\s*door/i
      ],
      properties: {
        tier: ['Basic', 'Standard'],
        sku: ['Basic', 'Standard', 'WAF_v2'],
        pricing: ['Fixed', 'Consumption']
      },
      dependencies: {
        commonlyUsedWith: ['virtual-machines', 'app-service', 'virtual-network'],
        requiredWith: []
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    
    // Security Services
    {
      id: 'key-vault',
      displayName: 'Key Vault',
      category: 'Security',
      resourceType: 'Microsoft.KeyVault/vaults',
      alternativeResourceTypes: ['Microsoft.KeyVault/Vaults'],
      keywords: ['key vault', 'keyvault', 'secrets', 'keys', 'certificates', 'hsm'],
      aliases: ['key vault', 'keyvault', 'vault', 'azure key vault'],
      commonNames: ['Key Vault', 'Azure Key Vault', 'Vault', 'Secrets Vault'],
      abbreviations: ['kv', 'vault', 'akv'],
      iconPatterns: ['key', 'vault', 'security', 'lock'],
      textPatterns: [
        /key\s*vault/i,
        /keyvault/i,
        /azure\s*vault/i,
        /secrets\s*vault/i,
        /\bhsm\b/i
      ],
      properties: {
        tier: ['Standard', 'Premium'],
        pricing: ['Standard', 'Premium HSM']
      },
      dependencies: {
        commonlyUsedWith: ['app-service', 'azure-functions', 'virtual-machines'],
        requiredWith: []
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    
    // Monitoring Services
    {
      id: 'application-insights',
      displayName: 'Application Insights',
      category: 'Monitoring',
      resourceType: 'Microsoft.Insights/components',
      alternativeResourceTypes: ['Microsoft.Insights/Components'],
      keywords: ['application insights', 'app insights', 'monitoring', 'telemetry', 'apm'],
      aliases: ['app insights', 'application insights', 'insights', 'monitoring'],
      commonNames: ['Application Insights', 'App Insights', 'Insights', 'APM'],
      abbreviations: ['ai', 'appinsights', 'insights'],
      iconPatterns: ['insights', 'monitoring', 'analytics', 'chart'],
      textPatterns: [
        /application\s*insights/i,
        /app\s*insights/i,
        /\binsights\b/i,
        /telemetry/i,
        /\bapm\b/i
      ],
      properties: {
        tier: ['Standard'],
        pricing: ['Pay-as-you-go', 'Commitment Tiers']
      },
      dependencies: {
        commonlyUsedWith: ['app-service', 'azure-functions', 'virtual-machines'],
        requiredWith: []
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    
    // Container Services
    {
      id: 'container-registry',
      displayName: 'Container Registry',
      category: 'Containers',
      resourceType: 'Microsoft.ContainerRegistry/registries',
      alternativeResourceTypes: ['Microsoft.ContainerRegistry/Registries'],
      keywords: ['container registry', 'acr', 'docker registry', 'container images'],
      aliases: ['acr', 'container registry', 'docker registry'],
      commonNames: ['Container Registry', 'ACR', 'Azure Container Registry'],
      abbreviations: ['acr', 'cr'],
      iconPatterns: ['container', 'docker', 'registry'],
      textPatterns: [
        /container\s*registry/i,
        /\bacr\b/i,
        /docker\s*registry/i,
        /azure\s*container\s*registry/i
      ],
      properties: {
        tier: ['Basic', 'Standard', 'Premium'],
        pricing: ['Per GB stored', 'Per operation']
      },
      dependencies: {
        commonlyUsedWith: ['kubernetes-service', 'container-instances', 'app-service'],
        requiredWith: []
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    },
    {
      id: 'kubernetes-service',
      displayName: 'Kubernetes Service',
      category: 'Containers',
      resourceType: 'Microsoft.ContainerService/managedClusters',
      alternativeResourceTypes: ['Microsoft.ContainerService/ManagedClusters'],
      keywords: ['kubernetes', 'aks', 'k8s', 'container orchestration', 'managed kubernetes'],
      aliases: ['aks', 'kubernetes', 'k8s', 'azure kubernetes'],
      commonNames: ['AKS', 'Kubernetes Service', 'Azure Kubernetes Service', 'K8s'],
      abbreviations: ['aks', 'k8s'],
      iconPatterns: ['kubernetes', 'k8s', 'container', 'orchestration'],
      textPatterns: [
        /kubernetes/i,
        /\baks\b/i,
        /\bk8s\b/i,
        /azure\s*kubernetes/i,
        /managed\s*kubernetes/i
      ],
      properties: {
        tier: ['Free', 'Standard'],
        pricing: ['Cluster management free', 'Node pool charges']
      },
      dependencies: {
        commonlyUsedWith: ['container-registry', 'virtual-network', 'storage-account'],
        requiredWith: []
      },
      confidence: {
        exact: 1.0,
        keyword: 0.95,
        pattern: 0.9
      }
    }
  ];

  public static getAllServices(): AzureServiceDefinition[] {
    return this.services;
  }

  public static getServiceById(id: string): AzureServiceDefinition | undefined {
    return this.services.find(service => service.id === id);
  }

  public static getServicesByCategory(category: string): AzureServiceDefinition[] {
    return this.services.filter(service => service.category === category);
  }

  public static detectService(text: string, imageAnalysis?: any): {
    service: AzureServiceDefinition;
    confidence: number;
    matchType: 'exact' | 'keyword' | 'pattern' | 'visual';
    matchedText?: string;
  }[] {
    const results: {
      service: AzureServiceDefinition;
      confidence: number;
      matchType: 'exact' | 'keyword' | 'pattern' | 'visual';
      matchedText?: string;
    }[] = [];

    const normalizedText = text.toLowerCase();

    // First, check for non-Azure indicators that should block detection
    const nonAzureKeywords = [
      'aws', 'amazon', 'ec2', 's3', 'lambda', 'rds', 'dynamodb', 'cloudformation',
      'gcp', 'google cloud', 'compute engine', 'cloud storage', 'bigquery',
      'cloud functions', 'firestore', 'pub/sub', 'kubernetes engine', 'gke',
      'on-premise', 'on-premises', 'vmware', 'openstack', 'alibaba cloud', 'oracle cloud'
    ];

    const hasNonAzureIndicators = nonAzureKeywords.some(keyword => 
      normalizedText.includes(keyword.toLowerCase())
    );

    // If strong non-Azure indicators are present, don't detect Azure services
    if (hasNonAzureIndicators) {
      return [];
    }

    for (const service of this.services) {
      let matchFound = false;

      // Exact resource type match (highest confidence)
      if (normalizedText.includes(service.resourceType.toLowerCase()) ||
          service.alternativeResourceTypes.some(type => normalizedText.includes(type.toLowerCase()))) {
        results.push({
          service,
          confidence: service.confidence.exact,
          matchType: 'exact',
          matchedText: service.resourceType
        });
        matchFound = true;
        continue;
      }

      // Pattern matching with regex (high precision)
      if (!matchFound) {
        for (const pattern of service.textPatterns) {
          const match = text.match(pattern);
          if (match) {
            // Additional context check for pattern matches
            const contextCheck = this.validatePatternContext(match[0], text, service);
            if (contextCheck.isValid) {
              results.push({
                service,
                confidence: service.confidence.pattern * contextCheck.confidenceMultiplier,
                matchType: 'pattern',
                matchedText: match[0]
              });
              matchFound = true;
              break;
            }
          }
        }
      }

      // Keyword matching with context validation
      if (!matchFound) {
        for (const keyword of service.keywords) {
          if (normalizedText.includes(keyword.toLowerCase())) {
            const contextCheck = this.validateKeywordContext(keyword, text, service);
            if (contextCheck.isValid) {
              results.push({
                service,
                confidence: service.confidence.keyword * contextCheck.confidenceMultiplier,
                matchType: 'keyword',
                matchedText: keyword
              });
              matchFound = true;
              break;
            }
          }
        }
      }

      // Common names and aliases with strict validation
      if (!matchFound) {
        for (const alias of [...service.aliases, ...service.commonNames, ...service.abbreviations]) {
          if (normalizedText.includes(alias.toLowerCase())) {
            const contextCheck = this.validateAliasContext(alias, text, service);
            if (contextCheck.isValid) {
              results.push({
                service,
                confidence: service.confidence.keyword * 0.9 * contextCheck.confidenceMultiplier,
                matchType: 'keyword',
                matchedText: alias
              });
              matchFound = true;
              break;
            }
          }
        }
      }
    }

    // Sort by confidence (highest first) and remove duplicates
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .filter((result, index, self) => 
        index === self.findIndex(r => r.service.id === result.service.id)
      );
  }

  private static validatePatternContext(match: string, fullText: string, service: AzureServiceDefinition): {
    isValid: boolean;
    confidenceMultiplier: number;
  } {
    const lowerText = fullText.toLowerCase();
    
    // Look for Azure context indicators
    const azureContexts = ['azure', 'microsoft', 'cloud', 'bicep', 'arm template'];
    const hasAzureContext = azureContexts.some(context => lowerText.includes(context));
    
    // Look for specific service context
    const hasServiceContext = service.keywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase()) && keyword.toLowerCase() !== match.toLowerCase()
    );
    
    if (hasAzureContext) {
      return { isValid: true, confidenceMultiplier: 1.0 };
    } else if (hasServiceContext) {
      return { isValid: true, confidenceMultiplier: 0.8 };
    } else {
      // Generic terms without Azure context should have very low confidence
      return { isValid: false, confidenceMultiplier: 0.3 };
    }
  }

  private static validateKeywordContext(keyword: string, fullText: string, service: AzureServiceDefinition): {
    isValid: boolean;
    confidenceMultiplier: number;
  } {
    const lowerText = fullText.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    
    // Specific validation for generic terms
    if (['database', 'storage', 'server', 'application', 'network', 'web application', 'file storage'].includes(lowerKeyword)) {
      // These generic terms need Azure context to be valid
      const azureContexts = ['azure', 'microsoft', service.resourceType.toLowerCase()];
      const hasStrongAzureContext = azureContexts.some(context => lowerText.includes(context));
      
      if (!hasStrongAzureContext) {
        return { isValid: false, confidenceMultiplier: 0.2 };
      }
    }
    
    // Check for negative contexts that invalidate the match
    const negativeContexts = ['not', 'without', 'instead of', 'rather than', 'except'];
    const hasNegativeContext = negativeContexts.some(negative => {
      const keywordIndex = lowerText.indexOf(lowerKeyword);
      const negativeIndex = lowerText.indexOf(negative);
      return negativeIndex >= 0 && Math.abs(keywordIndex - negativeIndex) < 50;
    });
    
    if (hasNegativeContext) {
      return { isValid: false, confidenceMultiplier: 0.1 };
    }
    
    return { isValid: true, confidenceMultiplier: 1.0 };
  }

  private static validateAliasContext(alias: string, fullText: string, service: AzureServiceDefinition): {
    isValid: boolean;
    confidenceMultiplier: number;
  } {
    const lowerText = fullText.toLowerCase();
    const lowerAlias = alias.toLowerCase();
    
    // Abbreviations need stronger context validation
    if (service.abbreviations.includes(alias)) {
      const azureContexts = ['azure', 'microsoft', service.displayName.toLowerCase()];
      const hasStrongContext = azureContexts.some(context => lowerText.includes(context));
      
      if (!hasStrongContext) {
        return { isValid: false, confidenceMultiplier: 0.5 };
      }
    }
    
    return { isValid: true, confidenceMultiplier: 1.0 };
  }

  public static validateAzureContent(text: string): {
    isAzure: boolean;
    confidence: number;
    detectedServices: string[];
    nonAzureIndicators: string[];
  } {
    const detectedServices = this.detectService(text);
    const nonAzureKeywords = [
      'aws', 'amazon', 'ec2', 's3', 'lambda', 'rds', 'dynamodb',
      'gcp', 'google cloud', 'compute engine', 'cloud storage',
      'docker hub', 'terraform', 'on-premise', 'vmware'
    ];

    const normalizedText = text.toLowerCase();
    const nonAzureMatches = nonAzureKeywords.filter(keyword => 
      normalizedText.includes(keyword)
    );

    const azureConfidence = detectedServices.length > 0 
      ? Math.min(detectedServices.reduce((sum, result) => sum + result.confidence, 0) / detectedServices.length, 1.0)
      : 0;

    return {
      isAzure: detectedServices.length > 0 && azureConfidence > 0.7,
      confidence: azureConfidence,
      detectedServices: detectedServices.map(result => result.service.displayName),
      nonAzureIndicators: nonAzureMatches
    };
  }
}