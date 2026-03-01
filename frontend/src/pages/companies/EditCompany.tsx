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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountManagers, setAccountManagers] = useState<any[]>([]);
  const [companyBranches, setCompanyBranches] = useState<any[]>([]);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
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
      setAccountManagers(data.map((user: any) => ({ id: user.id, name: `${user.firstName} ${user.lastName}` })));
    } catch (error) {
      console.error(error);
      setAccountManagers([]);
    }
  };

  const fetchCompanyResources = async (companyId: string) => {
    try {
      const [branchesResponse, usersResponse] = await Promise.all([
        api.get('/branches', { params: { companyId, limit: 200, status: 'ALL' } }),
        api.get('/users', { params: { companyId, status: 'ALL' } }),
      ]);

      setCompanyBranches(branchesResponse.data.data || []);
      setCompanyUsers(usersResponse.data || []);
    } catch (error) {
      console.error(error);
      setCompanyBranches([]);
      setCompanyUsers([]);
    }
  };

  const fetchCompany = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/companies/${id}`);
      const data = response.data;
      setFormData({
        companyName: data.companyName || '',
        companyCode: data.companyCode || '',
        accountManagerId: data.accountManagerId || '',
        streetAddress: data.streetAddress || '',
        streetAddress2: data.streetAddress2 || '',
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
      setSlabs((data.pricingSlabs || []).map((slab: any) => ({
        minCost: parseFloat(slab.minCost),
        maxCost: parseFloat(slab.maxCost),
        multiplier: parseFloat(slab.multiplier),
      })));
      setCollectionOverrides((data.collectionPricingOverrides || []).map((override: any) => ({
        collectionType: override.collectionType,
        multiplier: parseFloat(override.multiplier),
      })));

      await fetchCompanyResources(data.id);
    } catch (error) {
      console.error(error);
      setErrors({ submit: 'Failed to load company details' });
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        companyName: formData.companyName,
        accountManagerId: formData.accountManagerId,
        streetAddress: formData.streetAddress,
        streetAddress2: formData.streetAddress2,
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
    <div className="max-w-6xl mx-auto">
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
              onChange={(event) => setFormData({ ...formData, companyName: event.target.value })}
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
                onChange={(event) => setFormData({ ...formData, accountManagerId: event.target.value })}
              >
                <option value="">Select Account Manager</option>
                {accountManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>{manager.name}</option>
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
              onChange={(event) => setFormData({ ...formData, primaryEmail: event.target.value })}
              placeholder="contact@company.com"
              error={errors.primaryEmail}
            />
            <Input
              label="Primary Phone"
              value={formData.primaryPhone}
              onChange={(event) => setFormData({ ...formData, primaryPhone: event.target.value })}
              placeholder="+1-555-0100"
            />
            <div className="col-span-2">
              <Input
                label="Website"
                value={formData.website}
                onChange={(event) => setFormData({ ...formData, website: event.target.value })}
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
                onChange={(event) => setFormData({ ...formData, streetAddress: event.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Address Line 2"
                value={formData.streetAddress2}
                onChange={(event) => setFormData({ ...formData, streetAddress2: event.target.value })}
                placeholder="Suite 300"
              />
            </div>
            <Input
              label="City"
              value={formData.city}
              onChange={(event) => setFormData({ ...formData, city: event.target.value })}
              placeholder="New York"
            />
            <Input
              label="State/Province"
              value={formData.stateProvince}
              onChange={(event) => setFormData({ ...formData, stateProvince: event.target.value })}
              placeholder="NY"
            />
            <Input
              label="Postal Code"
              value={formData.postalCode}
              onChange={(event) => setFormData({ ...formData, postalCode: event.target.value })}
              placeholder="10001"
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(event) => setFormData({ ...formData, country: event.target.value })}
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
                  onChange={(event) => setFormData({ ...formData, shipToType: event.target.value })}
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
                  onChange={(event) => setFormData({ ...formData, shipToType: event.target.value })}
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
                  onChange={(event) => setFormData({ ...formData, shipToType: event.target.value })}
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
                    onChange={(event) => setFormData({ ...formData, shipStreetAddress: event.target.value })}
                    placeholder="456 Shipping Lane"
                  />
                </div>
                <Input
                  label="City"
                  value={formData.shipCity}
                  onChange={(event) => setFormData({ ...formData, shipCity: event.target.value })}
                  placeholder="Los Angeles"
                />
                <Input
                  label="State/Province"
                  value={formData.shipStateProvince}
                  onChange={(event) => setFormData({ ...formData, shipStateProvince: event.target.value })}
                  placeholder="CA"
                />
                <Input
                  label="Postal Code"
                  value={formData.shipPostalCode}
                  onChange={(event) => setFormData({ ...formData, shipPostalCode: event.target.value })}
                  placeholder="90001"
                />
                <Input
                  label="Country"
                  value={formData.shipCountry}
                  onChange={(event) => setFormData({ ...formData, shipCountry: event.target.value })}
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
                onChange={(event) => setFormData({ ...formData, defaultMultiplier: parseFloat(event.target.value) || 0 })}
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
                  onChange={(event) => setFormData({ ...formData, enableSlabPricing: event.target.checked })}
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
                  onChange={(event) => setFormData({ ...formData, enableCollectionPricing: event.target.checked })}
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

        <Card title="Branches & Pricing">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Create and manage branches from this company context.</p>
              <Button type="button" onClick={() => navigate(`/branches/add?companyId=${id}`)}>
                + Add Branch
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Branch</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Manager</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Pricing</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companyBranches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        No branches created for this company yet.
                      </td>
                    </tr>
                  ) : (
                    companyBranches.map((branch) => (
                      <tr key={branch.id} className="border-t">
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{branch.name}</div>
                          <div className="text-xs text-gray-500">{branch.code}</div>
                        </td>
                        <td className="px-4 py-2">
                          {branch.branchManager ? `${branch.branchManager.firstName} ${branch.branchManager.lastName}` : '-'}
                        </td>
                        <td className="px-4 py-2">
                          {branch.enableSlabPricing
                            ? `${branch.pricingSlabCount || 0} slab tier${branch.pricingSlabCount === 1 ? '' : 's'}`
                            : `${parseFloat(branch.branchMultiplier || 1).toFixed(2)}x default`}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${branch.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {branch.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/branches/edit/${branch.id}`)}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                          >
                            Manage Branch
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card title="Company Users">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Manage users mapped to this company.</p>
              <Button type="button" onClick={() => navigate(`/users/add?companyId=${id}`)}>
                + Add User
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Name</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Role</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Branch</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companyUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        No users mapped to this company.
                      </td>
                    </tr>
                  ) : (
                    companyUsers.map((user) => (
                      <tr key={user.id} className="border-t">
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-4 py-2">{user.role}</td>
                        <td className="px-4 py-2">{user.branch ? `${user.branch.name} (${user.branch.code})` : '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/users/edit/${user.id}`)}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
