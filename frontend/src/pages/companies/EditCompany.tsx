import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import PricingSlabTable from '../../components/forms/PricingSlabTable';
import CollectionPricingTable from '../../components/forms/CollectionPricingTable';
import api from '../../services/api';

export default function EditCompany() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    companyName: '',
    companyCode: '',
    accountManagerId: '',
    streetAddress: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: '',
    primaryEmail: '',
    primaryPhone: '',
    website: '',
    shipToType: 'MAIN_ADDRESS',
    shipStreetAddress: '',
    shipCity: '',
    shipStateProvince: '',
    shipPostalCode: '',
    shipCountry: '',
    defaultMultiplier: 1.5,
    enableSlabPricing: false,
    enableCollectionPricing: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountManagers, setAccountManagers] = useState<any[]>([]);

  const [slabs, setSlabs] = useState<any[]>([]);
  const [collectionOverrides, setCollectionOverrides] = useState<any[]>([]);

  useEffect(() => {
    fetchCompany();
    fetchAccountManagers();
  }, [id]);

  const fetchAccountManagers = async () => {
    try {
      const response = await api.get('/users', { params: { role: 'INTERNAL_REP' } });
      const data = response.data || [];
      setAccountManagers(data.map((u: any) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCompany = async () => {
    try {
      const response = await api.get(`/companies/${id}`);
      const data = response.data;
      setFormData({
        companyName: data.companyName || '',
        companyCode: data.companyCode || '',
        accountManagerId: data.accountManagerId || '',
        streetAddress: data.streetAddress || '',
        city: data.city || '',
        stateProvince: data.stateProvince || '',
        postalCode: data.postalCode || '',
        country: data.country || '',
        primaryEmail: data.primaryEmail || '',
        primaryPhone: data.primaryPhone || '',
        website: data.website || '',
        shipToType: data.shipToType || 'MAIN_ADDRESS',
        shipStreetAddress: data.shipStreetAddress || '',
        shipCity: data.shipCity || '',
        shipStateProvince: data.shipStateProvince || '',
        shipPostalCode: data.shipPostalCode || '',
        shipCountry: data.shipCountry || '',
        defaultMultiplier: parseFloat(data.defaultMultiplier) || 1.5,
        enableSlabPricing: data.enableSlabPricing || false,
        enableCollectionPricing: data.enableCollectionPricing || false,
      });
      setSlabs((data.pricingSlabs || []).map((s: any) => ({
        minCost: parseFloat(s.minCost),
        maxCost: parseFloat(s.maxCost),
        multiplier: parseFloat(s.multiplier)
      })));
      setCollectionOverrides((data.collectionPricingOverrides || []).map((c: any) => ({
        collectionType: c.collectionType,
        multiplier: parseFloat(c.multiplier)
      })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    
    if (formData.primaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryEmail)) {
      newErrors.primaryEmail = 'Invalid email format';
    }

    if (formData.defaultMultiplier < 1 || formData.defaultMultiplier > 10) {
      newErrors.defaultMultiplier = 'Multiplier must be between 1 and 10';
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
      const payload = {
        companyName: formData.companyName,
        accountManagerId: formData.accountManagerId,
        streetAddress: formData.streetAddress,
        city: formData.city,
        stateProvince: formData.stateProvince,
        postalCode: formData.postalCode,
        country: formData.country,
        primaryEmail: formData.primaryEmail,
        primaryPhone: formData.primaryPhone,
        website: formData.website,
        shipToType: formData.shipToType,
        shipStreetAddress: formData.shipStreetAddress,
        shipCity: formData.shipCity,
        shipStateProvince: formData.shipStateProvince,
        shipPostalCode: formData.shipPostalCode,
        shipCountry: formData.shipCountry,
        defaultMultiplier: formData.defaultMultiplier,
        enableSlabPricing: formData.enableSlabPricing,
        enableCollectionPricing: formData.enableCollectionPricing,
        pricingSlabs: formData.enableSlabPricing ? slabs : null,
        collectionOverrides: formData.enableCollectionPricing ? collectionOverrides : null,
      };

      await api.put(`/companies/${id}`, payload);
      navigate('/companies');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message || 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => navigate('/companies')}>Back</Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Company</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {errors.submit}
          </div>
        )}

        <Card title="Company Information">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Brilliant Jewelers Inc."
              error={errors.companyName}
              required
            />
            <Input
              label="Company Code"
              value={formData.companyCode}
              disabled
              className="bg-gray-100"
            />
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Account Manager</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.accountManagerId}
                onChange={(e) => setFormData({ ...formData, accountManagerId: e.target.value })}
              >
                <option value="">Select Account Manager</option>
                {accountManagers.map(mgr => (
                  <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card title="Contact Information">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Primary Email"
              type="email"
              value={formData.primaryEmail}
              onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
              placeholder="contact@company.com"
              error={errors.primaryEmail}
            />
            <Input
              label="Primary Phone"
              value={formData.primaryPhone}
              onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
              placeholder="+1-555-0100"
            />
            <div className="col-span-2">
              <Input
                label="Website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="www.company.com"
              />
            </div>
          </div>
        </Card>

        <Card title="Company Address">
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

        <Card title="Shipping Configuration">
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shipToType"
                  value="MAIN_ADDRESS"
                  checked={formData.shipToType === 'MAIN_ADDRESS'}
                  onChange={(e) => setFormData({ ...formData, shipToType: e.target.value })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm font-medium text-gray-700">Same as Company Address</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shipToType"
                  value="MAIN_BRANCH"
                  checked={formData.shipToType === 'MAIN_BRANCH'}
                  onChange={(e) => setFormData({ ...formData, shipToType: e.target.value })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm font-medium text-gray-700">Ship to Main Branch</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shipToType"
                  value="CUSTOM"
                  checked={formData.shipToType === 'CUSTOM'}
                  onChange={(e) => setFormData({ ...formData, shipToType: e.target.value })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm font-medium text-gray-700">Custom Shipping Address</span>
              </label>
            </div>
            
            {formData.shipToType === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="col-span-2">
                  <Input
                    label="Street Address"
                    value={formData.shipStreetAddress}
                    onChange={(e) => setFormData({ ...formData, shipStreetAddress: e.target.value })}
                    placeholder="456 Shipping Lane"
                  />
                </div>
                <Input
                  label="City"
                  value={formData.shipCity}
                  onChange={(e) => setFormData({ ...formData, shipCity: e.target.value })}
                  placeholder="Los Angeles"
                />
                <Input
                  label="State/Province"
                  value={formData.shipStateProvince}
                  onChange={(e) => setFormData({ ...formData, shipStateProvince: e.target.value })}
                  placeholder="CA"
                />
                <Input
                  label="Postal Code"
                  value={formData.shipPostalCode}
                  onChange={(e) => setFormData({ ...formData, shipPostalCode: e.target.value })}
                  placeholder="90001"
                />
                <Input
                  label="Country"
                  value={formData.shipCountry}
                  onChange={(e) => setFormData({ ...formData, shipCountry: e.target.value })}
                  placeholder="USA"
                />
              </div>
            )}
          </div>
        </Card>

        <Card title="Pricing Configuration">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Multiplier *</label>
              <Input
                type="number"
                step="0.01"
                min="1"
                max="10"
                value={formData.defaultMultiplier}
                onChange={(e) => setFormData({ ...formData, defaultMultiplier: parseFloat(e.target.value) || 0 })}
                placeholder="1.5"
                className="max-w-xs"
                error={errors.defaultMultiplier}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Base multiplier applied to all products (1.0 - 10.0)</p>
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableSlabPricing}
                  onChange={(e) => setFormData({ ...formData, enableSlabPricing: e.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm font-medium text-gray-700">Enable Cost-Based Slab Pricing</span>
              </label>
              <p className="text-xs text-gray-500 ml-6 mt-1">Override default multiplier based on cost ranges</p>
            </div>
            
            {formData.enableSlabPricing && (
              <div className="ml-6 p-4 bg-gray-50 rounded-lg">
                <PricingSlabTable slabs={slabs} setSlabs={setSlabs} />
              </div>
            )}

            <div className="border-t pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableCollectionPricing}
                  onChange={(e) => setFormData({ ...formData, enableCollectionPricing: e.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm font-medium text-gray-700">Enable Collection-Based Pricing</span>
              </label>
              <p className="text-xs text-gray-500 ml-6 mt-1">Override pricing for specific collections (highest priority)</p>
            </div>

            {formData.enableCollectionPricing && (
              <div className="ml-6 p-4 bg-gray-50 rounded-lg">
                <CollectionPricingTable overrides={collectionOverrides} setOverrides={setCollectionOverrides} />
              </div>
            )}
          </div>
        </Card>

        <div className="flex gap-3 sticky bottom-0 bg-white py-4 border-t">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Company'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/companies')} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

