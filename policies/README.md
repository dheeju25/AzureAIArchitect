# Manual Policies Directory

This directory contains custom JSON policies that will be automatically checked by the Policy Compliance Agent and applied during Bicep generation.

## Policy Structure

Each policy is a JSON file with the following schema:

```json
{
  "id": "unique-policy-id",
  "name": "Human Readable Policy Name",
  "category": "security|cost|performance|compliance|custom",
  "description": "Detailed description of what this policy enforces",
  "severity": "critical|high|medium|low",
  "resourceTypes": ["Microsoft.Compute/virtualMachines", "Microsoft.Web/sites"],
  "conditions": {
    "property": "path.to.property",
    "operator": "equals|notEquals|contains|notContains|greaterThan|lessThan|exists|notExists",
    "value": "expected-value"
  },
  "fix": {
    "action": "set|remove|add",
    "property": "path.to.property",
    "value": "corrected-value"
  },
  "bicepModification": {
    "template": "bicep template modification",
    "parameters": ["param1", "param2"]
  },
  "enabled": true,
  "tags": ["tag1", "tag2"]
}
```

## Directory Structure

- `security/` - Security-related policies
- `cost/` - Cost optimization policies  
- `performance/` - Performance optimization policies
- `compliance/` - Regulatory compliance policies
- `custom/` - Custom organization-specific policies

## Usage

1. Add JSON policy files to appropriate category folders
2. The Policy Compliance Agent will automatically scan all policies
3. Violations will be reported in a separate "Manual Policies" section
4. Fixes will be automatically applied in generated Bicep templates
5. A detailed compliance report will be generated showing all results

## Policy Examples

See the example policies in each category folder for reference implementations.