import Button from '../common/Button';

export interface Slab {
  minCost: number | '';
  maxCost: number | '';
  multiplier: number | '';
}

interface Props {
  slabs: Slab[];
  setSlabs: (slabs: Slab[]) => void;
}

export const validatePricingSlabs = (slabs: Slab[]): string | null => {
  if (!slabs || slabs.length === 0) {
    return null;
  }

  const sorted = [...slabs].sort((a, b) => Number(a.minCost) - Number(b.minCost));
  for (let index = 0; index < sorted.length; index += 1) {
    const slab = sorted[index];
    const rowLabel = `Row ${index + 1}`;

    if (slab.minCost === '' || Number.isNaN(slab.minCost) || !Number.isFinite(slab.minCost)) {
      return `${rowLabel}: Min Cost is required and must be a valid number, 0 or greater`;
    }
    if (slab.maxCost === '' || Number.isNaN(slab.maxCost) || !Number.isFinite(slab.maxCost)) {
      return `${rowLabel}: Max Cost is required and must be a valid number, 0 or greater`;
    }
    if (slab.multiplier === '' || Number.isNaN(slab.multiplier) || !Number.isFinite(slab.multiplier)) {
      return `${rowLabel}: Mark-up is required and must be a valid number between 1 and 10`;
    }

    const minCost = Number(slab.minCost);
    const maxCost = Number(slab.maxCost);
    const multiplier = Number(slab.multiplier);

    if (minCost < 0) {
      return `${rowLabel}: Min Cost cannot be negative`;
    }
    if (maxCost < 0) {
      return `${rowLabel}: Max Cost cannot be negative`;
    }
    if (maxCost < minCost) {
      return `${rowLabel}: Max Cost must be greater than or equal to Min Cost`;
    }
    if (multiplier < 1 || multiplier > 10) {
      return `${rowLabel}: Mark-up must be between 1 and 10`;
    }
    if (index > 0 && minCost <= Number(sorted[index - 1].maxCost)) {
      return `${rowLabel}: Min Cost overlaps with the previous range`;
    }
  }

  return null;
};

export default function PricingSlabTable({ slabs, setSlabs }: Props) {
  const addSlab = () => {
    setSlabs([...slabs, { minCost: '', maxCost: '', multiplier: '' }]);
  };

  const updateSlab = (index: number, field: keyof Slab, value: number | '') => {
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
                      min="0"
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      value={slab.minCost}
                      onChange={(e) => {
                        if (e.target.value.startsWith('-')) return;
                        updateSlab(idx, 'minCost', e.target.value === '' ? '' : parseFloat(e.target.value));
                      }}
                    />
                  </td>
                  <td className="app-table-cell">
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      value={slab.maxCost}
                      onChange={(e) => {
                        if (e.target.value.startsWith('-')) return;
                        updateSlab(idx, 'maxCost', e.target.value === '' ? '' : parseFloat(e.target.value));
                      }}
                    />
                  </td>
                  <td className="app-table-cell">
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      value={slab.multiplier}
                      onChange={(e) => {
                        if (e.target.value.startsWith('-')) return;
                        updateSlab(idx, 'multiplier', e.target.value === '' ? '' : parseFloat(e.target.value));
                      }}
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


