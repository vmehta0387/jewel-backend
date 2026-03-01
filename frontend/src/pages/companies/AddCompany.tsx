import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import PricingSlabTable from '../../components/forms/PricingSlabTable';
import CollectionPricingTable from '../../components/forms/CollectionPricingTable';
import api from '../../services/api';

export default function AddCompany() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    companyCode: '',
    accountManagerId: '',
    streetAddress: '',
    streetAddress2: '',
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
    createMainBranch: false,
    mainBranchName: '',
    mainBranchCode: 'MAIN',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddManager, setShowAddManager] = useState(false);
  const [newManager, setNewManager] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [pendingManagerData, setPendingManagerData] = useState<any>(null);
  const [accountManagers, setAccountManagers] = useState<any[]>([]);

  const [slabs, setSlabs] = useState([
    { minCost: 0, maxCost: 500, multiplier: 4.0 },
    { minCost: 500, maxCost: 2999, multiplier: 3.0 },
  ]);

  const [collectionOverrides, setCollectionOverrides] = useState([
    { collectionType: 'ENGAGEMENT', multiplier: 3.5 },
    { collectionType: 'ETERNITY', multiplier: 3.0 },
  ]);

  useEffect(() => {
    fetchAccountManagers();
  }, []);

  const fetchAccountManagers = async () => {
    try {
      const response = await api.get('/users', { params: { role: 'INTERNAL_REP' } });
      const data = response.data || [];
      setAccountManagers(data.map((u: any) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })));
    } catch (error) {
      console.error(error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.companyCode.trim()) newErrors.companyCode = 'Company code is required';
    if (formData.companyCode.length < 3) newErrors.companyCode = 'Company code must be at least 3 characters';
    
    if (formData.primaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryEmail)) {
      newErrors.primaryEmail = 'Invalid email format';
    }

    if (formData.defaultMultiplier < 1 || formData.defaultMultiplier > 10) {
      newErrors.defaultMultiplier = 'Multiplier must be between 1 and 10';
    }

    if (formData.shipToType === 'CUSTOM' && !formData.shipStreetAddress.trim()) {
      newErrors.shipStreetAddress = 'Shipping address is required for custom shipping';
    }

    if (formData.enableSlabPricing && slabs.length === 0) {
      newErrors.slabs = 'Add at least one pricing slab';
    }

    if (formData.enableCollectionPricing && collectionOverrides.length === 0) {
      newErrors.collections = 'Add at least one collection override';
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
      const payload: any = {
        ...formData,
        accountManagerId: formData.accountManagerId || null,
        companyCode: formData.companyCode.toUpperCase().replace(/\s+/g, ''),
        mainBranchCode: formData.mainBranchCode.toUpperCase().replace(/\s+/g, ''),
        pricingSlabs: formData.enableSlabPricing ? slabs : null,
        collectionOverrides: formData.enableCollectionPricing ? collectionOverrides : null,
      };

      // If there's pending manager data, send it in the payload
      if (pendingManagerData) {
        payload.newAccountManager = pendingManagerData;
        delete payload.accountManagerId;
      }

      await api.post('/companies', payload);
      navigate('/companies');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message || 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => navigate('/companies')}>Back</Button>
        <h1 className="text-2xl font-bold text-gray-900">Add New Company</h1>
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
              label="Company Code *"
              value={formData.companyCode}
              onChange={(e) => setFormData({ ...formData, companyCode: e.target.value.toUpperCase().replace(/\s+/g, '') })}
              placeholder="BRILLIANTJEW"
              error={errors.companyCode}
              required
            />
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Account Manager</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={formData.accountManagerId}
                  onChange={(e) => setFormData({ ...formData, accountManagerId: e.target.value })}
                >
                  <option value="">Select Account Manager</option>
                  {accountManagers.map(mgr => (
                    <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={() => setShowAddManager(!showAddManager)}>
                  {showAddManager ? 'Cancel' : '+ Add New'}
                </Button>
              </div>
              
              {showAddManager && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="First Name *"
                      value={newManager.firstName}
                      onChange={(e) => setNewManager({ ...newManager, firstName: e.target.value })}
                      placeholder="John"
                    />
                    <Input
                      label="Last Name *"
                      value={newManager.lastName}
                      onChange={(e) => setNewManager({ ...newManager, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                    <Input
                      label="Email *"
                      type="email"
                      value={newManager.email}
                      onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                      placeholder="john.doe@company.com"
                    />
                    <Input
                      label="Phone"
                      value={newManager.phone}
                      onChange={(e) => setNewManager({ ...newManager, phone: e.target.value })}
                      placeholder="+1-555-0100"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!newManager.firstName || !newManager.lastName || !newManager.email) return;
                      const tempId = `temp-${Date.now()}`;
                      const fullName = `${newManager.firstName} ${newManager.lastName}`;
                      setAccountManagers([...accountManagers, { id: tempId, name: fullName }]);
                      setFormData({ ...formData, accountManagerId: tempId });
                      setPendingManagerData({ ...newManager });
                      setNewManager({ firstName: '', lastName: '', email: '', phone: '' });
                      setShowAddManager(false);
                    }}
                  >
                    Add Manager
                  </Button>
                </div>
              )}
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
            <div className="col-span-2">
              <Input
                label="Address Line 2"
                value={formData.streetAddress2}
                onChange={(e) => setFormData({ ...formData, streetAddress2: e.target.value })}
                placeholder="Suite 300"
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

        <Card title="Main Branch Setup">
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.createMainBranch}
                onChange={(e) => setFormData({ ...formData, createMainBranch: e.target.checked })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Also create a Main Branch using the company address
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              If enabled, a branch will be created automatically when the company is created.
            </p>
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
                    error={errors.shipStreetAddress}
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
                {errors.slabs && <p className="text-sm text-red-600 mt-2">{errors.slabs}</p>}
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
                {errors.collections && <p className="text-sm text-red-600 mt-2">{errors.collections}</p>}
              </div>
            )}
          </div>
        </Card>

        <div className="flex gap-3 sticky bottom-0 bg-white py-4 border-t">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Company'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/companies')} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

