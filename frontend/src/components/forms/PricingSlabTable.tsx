import Button from '../common/Button';

export interface Slab {
  minCost: number;
  maxCost: number;
  multiplier: number;
}

interface Props {
  slabs: Slab[];
  setSlabs: (slabs: Slab[]) => void;
}

export const validatePricingSlabs = (slabs: Slab[]): string | null => {
  if (!slabs || slabs.length === 0) {
    return null;
  }

  const sorted = [...slabs].sort((a, b) => a.minCost - b.minCost);
  for (let index = 0; index < sorted.length; index += 1) {
    const slab = sorted[index];
    const values = [slab.minCost, slab.maxCost, slab.multiplier];
    if (values.some((value) => Number.isNaN(value) || !Number.isFinite(value))) {
      return 'Pricing slab values must be valid numbers';
    }
    if (slab.minCost < 0 || slab.maxCost < 0) {
      return 'Pricing slab costs cannot be negative';
    }
    if (slab.maxCost < slab.minCost) {
      return 'Max Cost must be greater than or equal to Min Cost';
    }
    if (slab.multiplier < 1 || slab.multiplier > 10) {
      return 'Mark-up must be between 1 and 10';
    }
    if (index > 0 && slab.minCost <= sorted[index - 1].maxCost) {
      return 'Pricing slab ranges cannot overlap';
    }
  }

  return null;
};

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
      <div className="app-table-shell">
        <div className="app-table-scroll scrollbar-top">
          <table className="app-table app-table-compact">
            <thead>
              <tr>
                <th className="app-table-head-cell">Min Cost</th>
                <th className="app-table-head-cell">Max Cost</th>
                <th className="app-table-head-cell">Mark-up</th>
                <th className="app-table-head-cell text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {slabs.map((slab, idx) => (
                <tr key={idx} className="app-table-row">
                  <td className="app-table-cell">
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      value={slab.minCost}
                      onChange={(e) => updateSlab(idx, 'minCost', parseFloat(e.target.value))}
                    />
                  </td>
                  <td className="app-table-cell">
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      value={slab.maxCost}
                      onChange={(e) => updateSlab(idx, 'maxCost', parseFloat(e.target.value))}
                    />
                  </td>
                  <td className="app-table-cell">
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      value={slab.multiplier}
                      onChange={(e) => updateSlab(idx, 'multiplier', parseFloat(e.target.value))}
                    />
                  </td>
                  <td className="app-table-cell text-right">
                    <button
                      type="button"
                      onClick={() => removeSlab(idx)}
                      className="app-table-icon-action text-rose-600 hover:text-rose-700"
                      aria-label="Remove tier"
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
      <Button type="button" variant="secondary" size="sm" onClick={addSlab} className="mt-2">
        + Add Tier
      </Button>
    </div>
  );
}


