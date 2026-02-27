import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import api from '../../services/api';

export default function EditBranch() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    companyId: '',
    name: '',
    code: '',
    streetAddress: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: '',
    email: '',
    phone: '',
    branchMultiplier: 1,
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [companyResponse, branchResponse] = await Promise.all([
        api.get('/companies', { params: { limit: 100 } }),
        api.get(`/branches/${id}`),
      ]);

      setCompanies(companyResponse.data.data || []);
      const branch = branchResponse.data;
      setFormData({
        companyId: branch.companyId || '',
        name: branch.name || '',
        code: branch.code || '',
        streetAddress: branch.streetAddress || '',
        city: branch.city || '',
        stateProvince: branch.stateProvince || '',
        postalCode: branch.postalCode || '',
        country: branch.country || '',
        email: branch.email || '',
        phone: branch.phone || '',
        branchMultiplier: parseFloat(branch.branchMultiplier) || 1,
      });
    } catch (error) {
      console.error(error);
      setErrors({ submit: 'Failed to load branch details' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyId) newErrors.companyId = 'Company is required';
    if (!formData.name.trim()) newErrors.name = 'Branch name is required';
    if (!formData.code.trim()) newErrors.code = 'Branch code is required';
    if (formData.branchMultiplier < 1 || formData.branchMultiplier > 10) {
      newErrors.branchMultiplier = 'Multiplier must be between 1 and 10';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/branches/${id}`, {
        ...formData,
        code: formData.code.toUpperCase().replace(/\s+/g, ''),
      });
      navigate('/branches');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message || 'Failed to update branch' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => navigate('/branches')}>
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Branch</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{errors.submit}</div>
        )}

        <Card title="Branch Information">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
              <select
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                  errors.companyId ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.companyName} ({company.companyCode})
                  </option>
                ))}
              </select>
              {errors.companyId && <p className="mt-1 text-sm text-red-600">{errors.companyId}</p>}
            </div>

            <Input
              label="Branch Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Downtown Branch"
              error={errors.name}
              required
            />
            <Input
              label="Branch Code *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
              placeholder="DOWNTOWN"
              error={errors.code}
              required
            />
            <Input
              label="Branch Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="branch@company.com"
              error={errors.email}
            />
            <Input
              label="Branch Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1-555-0100"
            />
            <Input
              label="Branch Multiplier *"
              type="number"
              min="1"
              max="10"
              step="0.01"
              value={formData.branchMultiplier}
              onChange={(e) => setFormData({ ...formData, branchMultiplier: parseFloat(e.target.value) || 0 })}
              error={errors.branchMultiplier}
              required
            />
          </div>
        </Card>

        <Card title="Branch Address">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Street Address"
                value={formData.streetAddress}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="New York"
            />
            <Input
              label="State/Province"
              value={formData.stateProvince}
              onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
              placeholder="NY"
            />
            <Input
              label="Postal Code"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              placeholder="10001"
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="USA"
            />
          </div>
        </Card>

        <div className="flex gap-3 sticky bottom-0 bg-white py-4 border-t">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Branch'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/branches')} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
