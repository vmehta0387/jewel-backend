import { FormEvent, useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import api from '../../services/api';

type PriceCategory = 'METAL' | 'DIAMOND';
type PriceUnit = 'GRAM' | 'CARAT';

interface BasePriceRow {
  id: string;
  category: PriceCategory;
  referenceValue: string;
  subValue: string | null;
  pricePerUnit: number;
  unit: PriceUnit;
  currency: string;
  effectiveFrom: string;
  notes: string | null;
  isActive: boolean;
  updatedAt: string;
}

interface ReferenceOptionResponse {
  data?: string[];
}

const defaultForm = {
  category: 'METAL' as PriceCategory,
  referenceValue: '',
  subValue: '',
  pricePerUnit: '',
  currency: 'USD',
  notes: '',
};

export default function PricingPage() {
  const [rows, setRows] = useState<BasePriceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<'ALL' | PriceCategory>('ALL');
  const [form, setForm] = useState(defaultForm);
  const [referenceOptions, setReferenceOptions] = useState<string[]>([]);
  const [referenceOptionsLoading, setReferenceOptionsLoading] = useState(false);

  const filteredRows = useMemo(() => {
    if (filterCategory === 'ALL') return rows;
    return rows.filter((row) => row.category === filterCategory);
  }, [rows, filterCategory]);

  const loadRows = async () => {
    setLoading(true);
    try {
      const response = await api.get('/pricing/base-prices', {
        params: { includeInactive: true, limit: 200 },
      });
      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      setRows(data);
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to load global base prices.');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceOptions = async (
    category: PriceCategory,
    excludeId?: string | null,
  ) => {
    setReferenceOptionsLoading(true);
    try {
      const response = await api.get<ReferenceOptionResponse>(
        '/pricing/base-prices/reference-options',
        {
          params: {
            category,
            excludeId: excludeId || undefined,
          },
        },
      );

      const options = Array.isArray(response.data?.data)
        ? response.data.data.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
      setReferenceOptions(options);
      setForm((prev) => {
        if (!prev.referenceValue) return prev;
        const normalizedReference = prev.referenceValue.trim().toLowerCase();
        const exists = options.some((option) => option.trim().toLowerCase() === normalizedReference);
        if (exists) return prev;
        return { ...prev, referenceValue: '' };
      });
    } catch (error: any) {
      setReferenceOptions([]);
      window.alert(error?.response?.data?.message || 'Unable to load reference values.');
    } finally {
      setReferenceOptionsLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    loadReferenceOptions(form.category, editingId);
  }, [form.category, editingId]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.referenceValue.trim()) {
      window.alert('Reference Value is required.');
      return;
    }

    if (!form.pricePerUnit.trim()) {
      window.alert('Price/Unit is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category: form.category,
        referenceValue: form.referenceValue.trim(),
        subValue: form.subValue.trim() || undefined,
        pricePerUnit: Number(form.pricePerUnit),
        unit: form.category === 'METAL' ? 'GRAM' : 'CARAT',
        currency: form.currency.trim().toUpperCase() || 'USD',
        notes: form.notes.trim() || undefined,
      };

      const response = editingId
        ? await api.put(`/pricing/base-prices/${editingId}`, payload)
        : await api.post('/pricing/base-prices', payload);

      const updatedRate = response.data?.rate || response.data;
      if (updatedRate?.id) {
        setRows((prev) => {
          const exists = prev.some((row) => row.id === updatedRate.id);
          if (!exists) return [updatedRate, ...prev];
          return prev.map((row) => (row.id === updatedRate.id ? updatedRate : row));
        });
      } else {
        await loadRows();
      }

      const recalculation = response.data?.recalculation;
      if (recalculation) {
        window.alert(
          `Base price saved. Updated ${recalculation.updatedDesigns} design(s) out of ${recalculation.totalDesigns}.`,
        );
      } else {
        window.alert('Base price saved.');
      }

      resetForm();
      await loadReferenceOptions(defaultForm.category, null);
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to save base price.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: BasePriceRow) => {
    setEditingId(row.id);
    setForm({
      category: row.category,
      referenceValue: row.referenceValue,
      subValue: row.subValue || '',
      pricePerUnit: String(row.pricePerUnit),
      currency: row.currency || 'USD',
      notes: row.notes || '',
    });
  };

  const toggleStatus = async (row: BasePriceRow) => {
    try {
      const response = await api.patch(`/pricing/base-prices/${row.id}/status`, {
        isActive: !row.isActive,
      });
      const updatedRate = response.data?.rate || response.data;
      if (updatedRate?.id) {
        setRows((prev) => prev.map((item) => (item.id === updatedRate.id ? updatedRate : item)));
      } else {
        await loadRows();
      }
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to update status.');
    }
  };

  const recalculateAll = async () => {
    setRecalculating(true);
    try {
      const response = await api.post('/pricing/base-prices/recalculate-designs');
      const result = response.data || {};
      window.alert(
        `Recalculation completed. Updated ${result.updatedDesigns || 0} design(s) out of ${result.totalDesigns || 0}.`,
      );
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to recalculate design prices.');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Global Base Pricing</h1>
        <Button type="button" onClick={recalculateAll} disabled={recalculating}>
          {recalculating ? 'Recalculating...' : 'Recalculate Existing Designs'}
        </Button>
      </div>

      <Card title={editingId ? 'Edit Base Price' : 'Add Base Price'}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category*</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    category: event.target.value as PriceCategory,
                    referenceValue: prev.category !== event.target.value ? '' : prev.referenceValue,
                    subValue: prev.category !== event.target.value ? '' : prev.subValue,
                  }))
                }
                disabled={!!editingId}
              >
                <option value="METAL">METAL</option>
                <option value="DIAMOND">DIAMOND</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reference Value*</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={form.referenceValue}
                onChange={(event) => setForm((prev) => ({ ...prev, referenceValue: event.target.value }))}
                disabled={referenceOptionsLoading}
              >
                <option value="">
                  {referenceOptionsLoading ? 'Loading...' : 'Select Reference Value'}
                </option>
                {referenceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {!referenceOptionsLoading && referenceOptions.length === 0 ? (
                <p className="mt-1 text-xs text-gray-500">
                  No values available. Add more in masters or remove an existing base price entry first.
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Sub Value {form.category === 'DIAMOND' ? '(Optional Size Bucket)' : '(Optional)'}
              </label>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder={form.category === 'DIAMOND' ? '1.0MM' : 'Optional'}
                value={form.subValue}
                onChange={(event) => setForm((prev) => ({ ...prev, subValue: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Price / Unit*</label>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
                value={form.pricePerUnit}
                onChange={(event) => setForm((prev) => ({ ...prev, pricePerUnit: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Unit</label>
              <input
                className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                value={form.category === 'METAL' ? 'GRAM' : 'CARAT'}
                readOnly
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={form.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                maxLength={10}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Base Price' : 'Add Base Price'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>
              Clear
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Configured Base Prices">
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter</label>
          <select
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value as 'ALL' | PriceCategory)}
          >
            <option value="ALL">ALL</option>
            <option value="METAL">METAL</option>
            <option value="DIAMOND">DIAMOND</option>
          </select>
        </div>

        {loading ? (
          <div className="py-6 text-sm text-gray-600">Loading base prices...</div>
        ) : (
          <div className="overflow-x-auto scrollbar-top">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Sub Value</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-200">
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2">{row.referenceValue}</td>
                    <td className="px-3 py-2">{row.subValue || '-'}</td>
                    <td className="px-3 py-2">{row.pricePerUnit} {row.currency}</td>
                    <td className="px-3 py-2">{row.unit}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                          row.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{new Date(row.updatedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" onClick={() => startEdit(row)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => toggleStatus(row)}
                        >
                          {row.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={8}>
                      No base prices found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
