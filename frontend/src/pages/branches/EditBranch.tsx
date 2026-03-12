import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import PricingSlabTable, { validatePricingSlabs } from '../../components/forms/PricingSlabTable';
import api from '../../services/api';

interface BranchManagerOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

interface SalesRepUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
}

export default function EditBranch() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingSalesRep, setIsCreatingSalesRep] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<any[]>([]);
  const [branchManagers, setBranchManagers] = useState<BranchManagerOption[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepUser[]>([]);
  const [showAddManager, setShowAddManager] = useState(false);
  const [newManager, setNewManager] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [pendingManagerData, setPendingManagerData] = useState<any>(null);
  const [slabs, setSlabs] = useState([
    { minCost: 0, maxCost: 500, multiplier: 3.5 },
    { minCost: 500.01, maxCost: 3000, multiplier: 3.0 },
  ]);
  const [salesRepForm, setSalesRepForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    isActive: true,
  });
  const [formData, setFormData] = useState({
    companyId: '',
    name: '',
    code: '',
    streetAddress: '',
    streetAddress2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: '',
    email: '',
    phone: '',
    shipToType: 'BRANCH_ADDRESS',
    shipStreetAddress: '',
    shipCity: '',
    shipStateProvince: '',
    shipPostalCode: '',
    shipCountry: '',
    branchMultiplier: 1,
    enableSlabPricing: false,
    branchManagerId: '',
  });

  const selectedManager = useMemo(
    () => branchManagers.find((manager) => manager.id === formData.branchManagerId),
    [branchManagers, formData.branchManagerId],
  );

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!formData.companyId) {
      setBranchManagers([]);
      return;
    }
    fetchBranchManagers(formData.companyId);
  }, [formData.companyId]);

  const fetchData = async () => {
    if (!id) {
      setErrors({ submit: 'Invalid branch id' });
      setLoading(false);
      return;
    }

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
        streetAddress2: branch.streetAddress2 || '',
        city: branch.city || '',
        stateProvince: branch.stateProvince || '',
        postalCode: branch.postalCode || '',
        country: branch.country || '',
        email: branch.email || '',
        phone: branch.phone || '',
        shipToType: branch.shipToType || 'BRANCH_ADDRESS',
        shipStreetAddress: branch.shipStreetAddress || '',
        shipCity: branch.shipCity || '',
        shipStateProvince: branch.shipStateProvince || '',
        shipPostalCode: branch.shipPostalCode || '',
        shipCountry: branch.shipCountry || '',
        branchMultiplier: parseFloat(branch.branchMultiplier) || 1,
        enableSlabPricing: Boolean(branch.enableSlabPricing),
        branchManagerId: branch.branchManagerId || '',
      });
      setSlabs((branch.pricingSlabs || []).map((slab: any) => ({
        minCost: parseFloat(slab.minCost),
        maxCost: parseFloat(slab.maxCost),
        multiplier: parseFloat(slab.multiplier),
      })));

      await Promise.all([
        fetchBranchManagers(branch.companyId || ''),
        fetchSalesReps(id),
      ]);
    } catch (error) {
      console.error(error);
      setErrors({ submit: 'Failed to load branch details' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchManagers = async (companyId: string) => {
    if (!companyId) {
      setBranchManagers([]);
      return;
    }

    try {
      const response = await api.get('/users', {
        params: { role: 'BRANCH_MANAGER', companyId, status: 'ALL' },
      });
      setBranchManagers(response.data || []);
    } catch (error) {
      console.error(error);
      setBranchManagers([]);
    }
  };

  const fetchSalesReps = async (branchId: string) => {
    try {
      const response = await api.get('/users', {
        params: { role: 'SALES_REP', branchId, status: 'ALL' },
      });
      setSalesReps(response.data || []);
    } catch (error) {
      console.error(error);
      setSalesReps([]);
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
    if (formData.enableSlabPricing && slabs.length === 0) {
      newErrors.pricingSlabs = 'Add at least one pricing slab';
    } else if (formData.enableSlabPricing) {
      const slabError = validatePricingSlabs(slabs);
      if (slabError) {
        newErrors.pricingSlabs = slabError;
      }
    }
    if (formData.shipToType === 'CUSTOM' && !formData.shipStreetAddress.trim()) {
      newErrors.shipStreetAddress = 'Shipping address is required for custom shipping';
    }
    if (pendingManagerData && !pendingManagerData.email) {
      newErrors.branchManagerId = 'Branch manager setup is incomplete';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSalesRepForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!salesRepForm.firstName.trim()) nextErrors.salesFirstName = 'First name is required';
    if (!salesRepForm.lastName.trim()) nextErrors.salesLastName = 'Last name is required';
    if (!salesRepForm.email.trim()) nextErrors.salesEmail = 'Email is required';
    if (salesRepForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(salesRepForm.email)) {
      nextErrors.salesEmail = 'Invalid email format';
    }
    if (!salesRepForm.password.trim()) nextErrors.salesPassword = 'Password is required';
    if (salesRepForm.password.trim().length > 0 && salesRepForm.password.trim().length < 8) {
      nextErrors.salesPassword = 'Password must be at least 8 characters';
    }
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...formData,
        code: formData.code.toUpperCase().replace(/\s+/g, ''),
        branchManagerId: formData.branchManagerId || null,
        pricingSlabs: formData.enableSlabPricing ? slabs : [],
      };

      if (pendingManagerData) {
        payload.newBranchManager = pendingManagerData;
        delete payload.branchManagerId;
      }

      await api.put(`/branches/${id}`, payload);
      navigate('/branches');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message || 'Failed to update branch' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSalesRep = async () => {
    if (!id || !validateSalesRepForm()) {
      return;
    }

    setIsCreatingSalesRep(true);
    try {
      await api.post('/users', {
        firstName: salesRepForm.firstName.trim(),
        lastName: salesRepForm.lastName.trim(),
        email: salesRepForm.email.trim().toLowerCase(),
        password: salesRepForm.password,
        role: 'SALES_REP',
        companyId: formData.companyId,
        branchId: id,
        phone: salesRepForm.phone.trim() || null,
        isActive: salesRepForm.isActive,
      });

      setSalesRepForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        isActive: true,
      });
      await fetchSalesReps(id);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setErrors((prev) => ({
        ...prev,
        salesSubmit: Array.isArray(message) ? message.join(', ') : message || 'Failed to add sales rep',
      }));
    } finally {
      setIsCreatingSalesRep(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
              <select
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                  errors.companyId ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.companyId}
                onChange={(event) => {
                  setPendingManagerData(null);
                  setFormData({ ...formData, companyId: event.target.value, branchManagerId: '' });
                }}
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
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder="Downtown Branch"
              error={errors.name}
              required
            />
            <Input
              label="Branch Code *"
              value={formData.code}
              onChange={(event) => setFormData({ ...formData, code: event.target.value.toUpperCase().replace(/\s+/g, '') })}
              placeholder="DOWNTOWN"
              error={errors.code}
              required
            />
            <Input
              label="Branch Email"
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              placeholder="branch@company.com"
              error={errors.email}
            />
            <Input
              label="Branch Phone"
              value={formData.phone}
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              placeholder="+1-555-0100"
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
                  value="BRANCH_ADDRESS"
                  checked={formData.shipToType === 'BRANCH_ADDRESS'}
                  onChange={(e) => setFormData({ ...formData, shipToType: e.target.value })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm font-medium text-gray-700">Ship to Branch Address</span>
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4 p-4 bg-gray-50 rounded-lg">
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

        <Card title="Branch Address">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <Card title="Branch Manager">
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Existing Branch Manager</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={formData.branchManagerId}
                  disabled={!formData.companyId || !!pendingManagerData}
                  onChange={(event) => setFormData({ ...formData, branchManagerId: event.target.value })}
                >
                  <option value="">None</option>
                  {branchManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName} ({manager.email})
                    </option>
                  ))}
                </select>
              </div>
              <Button type="button" variant="secondary" onClick={() => setShowAddManager((prev) => !prev)}>
                {showAddManager ? 'Cancel' : '+ New Manager'}
              </Button>
            </div>

            {pendingManagerData && (
              <div className="text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
                New manager ready: {pendingManagerData.firstName} {pendingManagerData.lastName} ({pendingManagerData.email})
              </div>
            )}

            {!pendingManagerData && selectedManager && (
              <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Manager details: {selectedManager.firstName} {selectedManager.lastName} | {selectedManager.email}
                {selectedManager.phone ? ` | ${selectedManager.phone}` : ''}
              </div>
            )}

            {showAddManager && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    label="First Name *"
                    value={newManager.firstName}
                    onChange={(event) => setNewManager({ ...newManager, firstName: event.target.value })}
                    placeholder="Ava"
                  />
                  <Input
                    label="Last Name *"
                    value={newManager.lastName}
                    onChange={(event) => setNewManager({ ...newManager, lastName: event.target.value })}
                    placeholder="Patel"
                  />
                  <Input
                    label="Email *"
                    type="email"
                    value={newManager.email}
                    onChange={(event) => setNewManager({ ...newManager, email: event.target.value })}
                    placeholder="ava.patel@company.com"
                  />
                  <Input
                    label="Phone"
                    value={newManager.phone}
                    onChange={(event) => setNewManager({ ...newManager, phone: event.target.value })}
                    placeholder="+1-555-0100"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!newManager.firstName || !newManager.lastName || !newManager.email) {
                        return;
                      }
                      setPendingManagerData(newManager);
                      setFormData({ ...formData, branchManagerId: '' });
                      setShowAddManager(false);
                    }}
                  >
                    Use This Manager
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setPendingManagerData(null);
                      setNewManager({ firstName: '', lastName: '', email: '', phone: '' });
                      setShowAddManager(false);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
            {errors.branchManagerId && <p className="text-sm text-red-600">{errors.branchManagerId}</p>}
          </div>
        </Card>

        <Card title="Branch Pricing">
          <div className="space-y-4">
            <Input
              label="Default Branch Multiplier *"
              type="number"
              min="1"
              max="10"
              step="0.01"
              value={formData.branchMultiplier}
              onChange={(event) => setFormData({ ...formData, branchMultiplier: parseFloat(event.target.value) || 0 })}
              error={errors.branchMultiplier}
              required
            />

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enableSlabPricing}
                onChange={(event) => setFormData({ ...formData, enableSlabPricing: event.target.checked })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm font-medium text-gray-700">Enable branch slab pricing</span>
            </label>

            {formData.enableSlabPricing && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <PricingSlabTable slabs={slabs} setSlabs={setSlabs} />
                {errors.pricingSlabs && <p className="text-sm text-red-600 mt-2">{errors.pricingSlabs}</p>}
              </div>
            )}
          </div>
        </Card>

        <Card title="Sales Rep Users">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="First Name *"
                value={salesRepForm.firstName}
                onChange={(event) => setSalesRepForm({ ...salesRepForm, firstName: event.target.value })}
                error={errors.salesFirstName}
              />
              <Input
                label="Last Name *"
                value={salesRepForm.lastName}
                onChange={(event) => setSalesRepForm({ ...salesRepForm, lastName: event.target.value })}
                error={errors.salesLastName}
              />
              <Input
                label="Email *"
                type="email"
                value={salesRepForm.email}
                onChange={(event) => setSalesRepForm({ ...salesRepForm, email: event.target.value })}
                error={errors.salesEmail}
              />
              <Input
                label="Temporary Password *"
                type="password"
                value={salesRepForm.password}
                onChange={(event) => setSalesRepForm({ ...salesRepForm, password: event.target.value })}
                error={errors.salesPassword}
              />
              <Input
                label="Phone"
                value={salesRepForm.phone}
                onChange={(event) => setSalesRepForm({ ...salesRepForm, phone: event.target.value })}
              />
              <div className="flex items-center gap-2 mt-7">
                <input
                  id="sales-rep-active"
                  type="checkbox"
                  checked={salesRepForm.isActive}
                  onChange={(event) => setSalesRepForm({ ...salesRepForm, isActive: event.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <label htmlFor="sales-rep-active" className="text-sm text-gray-700 font-medium">
                  Active user
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" onClick={handleCreateSalesRep} disabled={isCreatingSalesRep}>
                {isCreatingSalesRep ? 'Adding...' : '+ Add Sales Rep'}
              </Button>
              {errors.salesSubmit && <p className="text-sm text-red-600">{errors.salesSubmit}</p>}
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Name</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Email</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Phone</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        No sales reps assigned to this branch yet.
                      </td>
                    </tr>
                  ) : (
                    salesReps.map((user) => (
                      <tr key={user.id} className="border-t">
                        <td className="px-4 py-2">{user.firstName} {user.lastName}</td>
                        <td className="px-4 py-2">{user.email}</td>
                        <td className="px-4 py-2">{user.phone || '-'}</td>
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

