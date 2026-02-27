import Button from '../common/Button';

interface Slab {
  minCost: number;
  maxCost: number;
  multiplier: number;
}

interface Props {
  slabs: Slab[];
  setSlabs: (slabs: Slab[]) => void;
}

export default function PricingSlabTable({ slabs, setSlabs }: Props) {
  const addSlab = () => {
    setSlabs([...slabs, { minCost: 0, maxCost: 0, multiplier: 1.0 }]);
  };

  const updateSlab = (index: number, field: keyof Slab, value: number) => {
    const updated = [...slabs];
    updated[index][field] = value;
    setSlabs(updated);
  };

  const removeSlab = (index: number) => {
    setSlabs(slabs.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-4">
      <table className="min-w-full border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Min Cost</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Max Cost</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Multiplier</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {slabs.map((slab, idx) => (
            <tr key={idx} className="border-t">
              <td className="px-4 py-2">
                <input
                  type="number"
                  className="w-full px-2 py-1 border rounded"
                  value={slab.minCost}
                  onChange={(e) => updateSlab(idx, 'minCost', parseFloat(e.target.value))}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  className="w-full px-2 py-1 border rounded"
                  value={slab.maxCost}
                  onChange={(e) => updateSlab(idx, 'maxCost', parseFloat(e.target.value))}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-2 py-1 border rounded"
                  value={slab.multiplier}
                  onChange={(e) => updateSlab(idx, 'multiplier', parseFloat(e.target.value))}
                />
              </td>
              <td className="px-4 py-2">
                <button
                  type="button"
                  onClick={() => removeSlab(idx)}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button type="button" variant="secondary" size="sm" onClick={addSlab} className="mt-2">
        + Add Tier
      </Button>
    </div>
  );
}
