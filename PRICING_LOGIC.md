# Pricing System Logic

## Hierarchy (Priority Order)

1. **Default Multiplier** (Always Applied)
   - Base multiplier for all products
   - Example: 1.5x

2. **Cost-Based Slab Pricing** (Optional Override)
   - If enabled, overrides default multiplier based on cost range
   - Example: 
     - $0-500: 4.0x
     - $500-2999: 3.0x
     - $3000+: 2.5x

3. **Collection-Based Pricing** (Highest Priority Override)
   - If enabled, overrides both default and slab pricing for specific collections
   - Example:
     - Engagement: 3.5x
     - Eternity: 3.0x

## Calculation Flow

```
IF enable_collection_pricing AND collection has override:
    multiplier = collection_override_multiplier
ELSE IF enable_slab_pricing AND cost matches slab:
    multiplier = slab_multiplier
ELSE:
    multiplier = default_multiplier

final_price = base_cost × multiplier
```

## Example

Company: Diamond Dynasty
- Default Multiplier: 2.0x
- Slab Pricing: Enabled
  - $0-500: 4.0x
  - $500-2999: 3.0x
- Collection Pricing: Enabled
  - Engagement: 3.5x

**Scenario 1:** Engagement Ring, Base Cost $800
- Result: $800 × 3.5 = $2,800 (Collection override)

**Scenario 2:** Wedding Band, Base Cost $400
- Result: $400 × 4.0 = $1,600 (Slab pricing)

**Scenario 3:** Wedding Band, Base Cost $1,500
- Result: $1,500 × 3.0 = $4,500 (Slab pricing)

**Scenario 4:** Custom Ring (no collection), Base Cost $5,000
- Result: $5,000 × 2.0 = $10,000 (Default multiplier)
