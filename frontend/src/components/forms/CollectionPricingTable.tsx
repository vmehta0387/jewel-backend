import Button from '../common/Button';

interface CollectionOverride {
  collectionType: string;
  multiplier: number;
}

interface Props {
  overrides: CollectionOverride[];
  setOverrides: (overrides: CollectionOverride[]) => void;
}

const collectionTypes = [
  { value: 'ENGAGEMENT', label: 'Engagement Rings' },
  { value: 'ETERNITY', label: 'Eternity Rings' },
  { value: 'FLORAL', label: 'Floral Collection' },
  { value: 'WEDDING_BANDS', label: 'Wedding Bands' },
];

export default function CollectionPricingTable({ overrides, setOverrides }: Props) {
  const addOverride = () => {
    setOverrides([...overrides, { collectionType: 'ENGAGEMENT', multiplier: 1.0 }]);
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
      <table className="min-w-full border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Collection Type</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Multiplier</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {overrides.map((override, idx) => (
            <tr key={idx} className="border-t">
              <td className="px-4 py-2">
                <select
                  className="w-full px-2 py-1 border rounded"
                  value={override.collectionType}
                  onChange={(e) => updateOverride(idx, 'collectionType', e.target.value)}
                >
                  {collectionTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-2 py-1 border rounded"
                  value={override.multiplier}
                  onChange={(e) => updateOverride(idx, 'multiplier', parseFloat(e.target.value))}
                />
              </td>
              <td className="px-4 py-2">
                <button
                  type="button"
                  onClick={() => removeOverride(idx)}
                  className="text-red-600 hover:text-red-800"
                >
                  X
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button type="button" variant="secondary" size="sm" onClick={addOverride} className="mt-2">
        + Add Collection Override
      </Button>
    </div>
  );
}

