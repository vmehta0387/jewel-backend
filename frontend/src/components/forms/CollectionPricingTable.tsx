import { useMemo } from 'react';
import Button from '../common/Button';
import SmartDropdown, { type SmartDropdownOption } from '../common/SmartDropdown';

export interface CollectionOverride {
  collectionType: string;
  multiplier: number | '';
}

interface Props {
  overrides: CollectionOverride[];
  setOverrides: (overrides: CollectionOverride[]) => void;
}

const fallbackCollectionTypes: SmartDropdownOption[] = [
  { value: 'ENGAGEMENT', label: 'ENGAGEMENT' },
  { value: 'ETERNITY', label: 'ETERNITY' },
  { value: 'FLORAL', label: 'FLORAL' },
  { value: 'WEDDING_BANDS', label: 'WEDDING_BANDS' },
];

export function validateCollectionOverrides(overrides: CollectionOverride[]): string | null {
  const seen = new Map<string, number>();

  for (let index = 0; index < overrides.length; index += 1) {
    const override = overrides[index];
    const rowLabel = `Row ${index + 1}`;

    if (!override.collectionType) {
      return `${rowLabel}: Select a collection type`;
    }

    if (override.multiplier === '' || Number.isNaN(override.multiplier)) {
      return `${rowLabel}: Markup is required and must be a valid number between 1 and 10`;
    }

    if (override.multiplier < 1 || override.multiplier > 10) {
      return `${rowLabel}: Markup must be between 1 and 10`;
    }

    const key = override.collectionType.trim();
    const duplicateRow = seen.get(key);
    if (duplicateRow !== undefined) {
      return `${rowLabel}: Collection Type already exists in Row ${duplicateRow + 1}`;
    }
    seen.set(key, index);
  }

  return null;
}

export default function CollectionPricingTable({ overrides, setOverrides }: Props) {
  const selectedCollectionTypes = useMemo(
    () => new Set(overrides.map((override) => override.collectionType).filter(Boolean)),
    [overrides],
  );

  const addOverride = () => {
    setOverrides([...overrides, { collectionType: '', multiplier: '' }]);
  };

  const updateOverride = <K extends keyof CollectionOverride>(
    index: number,
    field: K,
    value: CollectionOverride[K]
  ) => {
    const updated = [...overrides];
    updated[index] = { ...updated[index], [field]: value };
    setOverrides(updated);
  };

  const removeOverride = (index: number) => {
    setOverrides(overrides.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-4">
      <div className="app-table-shell">
        <div className="app-table-scroll scrollbar-top">
          <table className="app-table app-table-compact">
            <thead>
              <tr>
                <th className="app-table-head-cell">Collection Type</th>
                <th className="app-table-head-cell">Markup</th>
                <th className="app-table-head-cell text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((override, idx) => (
                <tr key={idx} className="app-table-row">
                  <td className="app-table-cell min-w-[14rem]">
                    <SmartDropdown
                      value={override.collectionType}
                      onChange={(value) => updateOverride(idx, 'collectionType', value)}
                      config={{
                        apiSubPath: '/products/master-tables/COLLECTION/dropdown',
                        extraParams: { status: 'ACTIVE' },
                        options: fallbackCollectionTypes,
                        placeholder: 'Select Collection Type',
                        clearLabel: 'Clear Collection Type',
                        valueKey: 'value',
                        labelKey: 'value',
                        getOptionDisabled: (option) => {
                          const optionValue = String(option.value ?? '');
                          return selectedCollectionTypes.has(optionValue) && override.collectionType !== optionValue;
                        },
                      }}
                    />
                  </td>
                  <td className="app-table-cell">
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      value={override.multiplier}
                      onChange={(e) => {
                        if (e.target.value.startsWith('-')) return;
                        updateOverride(idx, 'multiplier', e.target.value === '' ? '' : parseFloat(e.target.value));
                      }}
                    />
                  </td>
                  <td className="app-table-cell text-right">
                    <button
                      type="button"
                      onClick={() => removeOverride(idx)}
                      className="app-table-icon-action text-rose-600 hover:text-rose-700"
                      aria-label="Remove override"
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={addOverride} className="mt-2">
        + Add Collection Override
      </Button>
    </div>
  );
}

