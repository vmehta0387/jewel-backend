import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import PricingSlabTable, { validatePricingSlabs } from '../../components/forms/PricingSlabTable';
import CollectionPricingTable from '../../components/forms/CollectionPricingTable';
import api from '../../services/api';

type QuickUserRole = 'COMPANY_ADMIN' | 'BRANCH_MANAGER' | 'SALES_REP';

const QUICK_USER_ROLE_OPTIONS: { value: QuickUserRole; label: string }[] = [
  { value: 'COMPANY_ADMIN', label: 'Company Admin' },
  { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
  { value: 'SALES_REP', label: 'Sales Rep' },
];

function quickRoleNeedsBranch(role: QuickUserRole): boolean {
  return role === 'BRANCH_MANAGER' || role === 'SALES_REP';
}

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
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showCreateBranchForm, setShowCreateBranchForm] = useState(false);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [accountManagers, setAccountManagers] = useState<any[]>([]);
  const [companyBranches, setCompanyBranches] = useState<any[]>([]);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [slabs, setSlabs] = useState<any[]>([]);
  const [collectionOverrides, setCollectionOverrides] = useState<any[]>([]);
  const [newBranchData, setNewBranchData] = useState({
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
    branchMultiplier: 1,
  });
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'COMPANY_ADMIN' as QuickUserRole,
    branchId: '',
    isActive: true,
  });

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
      newErrors.defaultMultiplier = 'Mark-up must be between 1 and 10';
    }
    if (formData.enableSlabPricing) {
      if (slabs.length === 0) {
        newErrors.slabs = 'Add at least one pricing slab';
      } else {
        const slabError = validatePricingSlabs(slabs);
        if (slabError) {
          newErrors.slabs = slabError;
        }
      }
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

  const validateBranchCreation = () => {
    const nextErrors: Record<string, string> = {};

    if (!newBranchData.name.trim()) nextErrors.newBranchName = 'Branch name is required';
    if (!newBranchData.code.trim()) nextErrors.newBranchCode = 'Branch code is required';
    if (newBranchData.branchMultiplier < 1 || newBranchData.branchMultiplier > 10) {
      nextErrors.newBranchMultiplier = 'Mark-up must be between 1 and 10';
    }
    if (newBranchData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBranchData.email)) {
      nextErrors.newBranchEmail = 'Invalid email format';
    }

    setErrors((prev) => {
      const next = { ...prev };
      ['newBranchName', 'newBranchCode', 'newBranchMultiplier', 'newBranchEmail', 'newBranchSubmit'].forEach((key) => {
        delete next[key];
      });
      return { ...next, ...nextErrors };
    });
    return Object.keys(nextErrors).length === 0;
  };

  const validateUserCreation = () => {
    const nextErrors: Record<string, string> = {};

    if (!newUserData.firstName.trim()) nextErrors.newUserFirstName = 'First name is required';
    if (!newUserData.lastName.trim()) nextErrors.newUserLastName = 'Last name is required';
    if (!newUserData.email.trim()) nextErrors.newUserEmail = 'Email is required';
    if (newUserData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserData.email)) {
      nextErrors.newUserEmail = 'Invalid email format';
    }
    if (!newUserData.password.trim()) {
      nextErrors.newUserPassword = 'Password is required';
    } else if (newUserData.password.trim().length < 8) {
      nextErrors.newUserPassword = 'Password must be at least 8 characters';
    }
    if (quickRoleNeedsBranch(newUserData.role) && !newUserData.branchId) {
      nextErrors.newUserBranch = 'Branch is required for this role';
    }

    setErrors((prev) => {
      const next = { ...prev };
      ['newUserFirstName', 'newUserLastName', 'newUserEmail', 'newUserPassword', 'newUserBranch', 'newUserSubmit'].forEach((key) => {
        delete next[key];
      });
      return { ...next, ...nextErrors };
    });
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateBranch = async () => {
    if (!id || !validateBranchCreation()) {
      return;
    }

    setIsCreatingBranch(true);
    try {
      await api.post('/branches', {
        companyId: id,
        name: newBranchData.name.trim(),
        code: newBranchData.code.toUpperCase().replace(/\s+/g, ''),
        streetAddress: newBranchData.streetAddress.trim() || null,
        streetAddress2: newBranchData.streetAddress2.trim() || null,
        city: newBranchData.city.trim() || null,
        stateProvince: newBranchData.stateProvince.trim() || null,
        postalCode: newBranchData.postalCode.trim() || null,
        country: newBranchData.country.trim() || null,
        email: newBranchData.email.trim() || null,
        phone: newBranchData.phone.trim() || null,
        branchMultiplier: newBranchData.branchMultiplier,
      });

      setNewBranchData({
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
        branchMultiplier: 1,
      });
      await fetchCompanyResources(id);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.newBranchSubmit;
        return next;
      });
      setShowCreateBranchForm(false);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setErrors((prev) => ({
        ...prev,
        newBranchSubmit: Array.isArray(message) ? message.join(', ') : message || 'Failed to create branch',
      }));
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleCreateUser = async () => {
    if (!id || !validateUserCreation()) {
      return;
    }

    setIsCreatingUser(true);
    try {
      await api.post('/users', {
        firstName: newUserData.firstName.trim(),
        lastName: newUserData.lastName.trim(),
        email: newUserData.email.trim().toLowerCase(),
        password: newUserData.password,
        role: newUserData.role,
        companyId: id,
        branchId: quickRoleNeedsBranch(newUserData.role) ? newUserData.branchId : null,
        phone: newUserData.phone.trim() || null,
        isActive: newUserData.isActive,
      });

      setNewUserData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        role: 'COMPANY_ADMIN',
        branchId: '',
        isActive: true,
      });
      await fetchCompanyResources(id);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.newUserSubmit;
        return next;
      });
      setShowCreateUserForm(false);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setErrors((prev) => ({
        ...prev,
        newUserSubmit: Array.isArray(message) ? message.join(', ') : message || 'Failed to create user',
      }));
    } finally {
      setIsCreatingUser(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4 p-4 bg-gray-50 rounded-lg">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Mark-up *</label>
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
              <p className="text-xs text-gray-500 mt-1">Base mark-up applied to all products (1.0 - 10.0)</p>
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
              <p className="text-xs text-gray-500 ml-6 mt-1">Override default mark-up based on cost ranges</p>
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
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => setShowCreateBranchForm((prev) => !prev)}>
                  {showCreateBranchForm ? 'Cancel' : '+ Quick Add Branch'}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => navigate(`/branches/add?companyId=${id}`)}>
                  Open Full Branch Form
                </Button>
              </div>
            </div>

            {showCreateBranchForm && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    label="Branch Name *"
                    value={newBranchData.name}
                    onChange={(event) => setNewBranchData({ ...newBranchData, name: event.target.value })}
                    error={errors.newBranchName}
                    placeholder="Downtown Branch"
                  />
                  <Input
                    label="Branch Code *"
                    value={newBranchData.code}
                    onChange={(event) => setNewBranchData({ ...newBranchData, code: event.target.value.toUpperCase().replace(/\s+/g, '') })}
                    error={errors.newBranchCode}
                    placeholder="DOWNTOWN"
                  />
                  <Input
                    label="Branch Email"
                    type="email"
                    value={newBranchData.email}
                    onChange={(event) => setNewBranchData({ ...newBranchData, email: event.target.value })}
                    error={errors.newBranchEmail}
                    placeholder="branch@company.com"
                  />
                  <Input
                    label="Branch Phone"
                    value={newBranchData.phone}
                    onChange={(event) => setNewBranchData({ ...newBranchData, phone: event.target.value })}
                    placeholder="+1-555-0100"
                  />
                  <Input
                    label="Branch Mark-up *"
                    type="number"
                    min="1"
                    max="10"
                    step="0.01"
                    value={newBranchData.branchMultiplier}
                    onChange={(event) => setNewBranchData({ ...newBranchData, branchMultiplier: parseFloat(event.target.value) || 0 })}
                    error={errors.newBranchMultiplier}
                  />
                  <Input
                    label="City"
                    value={newBranchData.city}
                    onChange={(event) => setNewBranchData({ ...newBranchData, city: event.target.value })}
                    placeholder="New York"
                  />
                  <div className="col-span-2">
                    <Input
                      label="Street Address"
                      value={newBranchData.streetAddress}
                      onChange={(event) => setNewBranchData({ ...newBranchData, streetAddress: event.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Address Line 2"
                      value={newBranchData.streetAddress2}
                      onChange={(event) => setNewBranchData({ ...newBranchData, streetAddress2: event.target.value })}
                      placeholder="Suite 300"
                    />
                  </div>
                </div>
                {errors.newBranchSubmit && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{errors.newBranchSubmit}</div>
                )}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleCreateBranch} disabled={isCreatingBranch}>
                    {isCreatingBranch ? 'Creating...' : 'Create Branch'}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreateBranchForm(false)} disabled={isCreatingBranch}>
                    Close
                  </Button>
                </div>
              </div>
            )}

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
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => setShowCreateUserForm((prev) => !prev)}>
                  {showCreateUserForm ? 'Cancel' : '+ Quick Add User'}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => navigate(`/users/add?companyId=${id}`)}>
                  Open Full User Form
                </Button>
              </div>
            </div>

            {showCreateUserForm && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    label="First Name *"
                    value={newUserData.firstName}
                    onChange={(event) => setNewUserData({ ...newUserData, firstName: event.target.value })}
                    error={errors.newUserFirstName}
                    placeholder="John"
                  />
                  <Input
                    label="Last Name *"
                    value={newUserData.lastName}
                    onChange={(event) => setNewUserData({ ...newUserData, lastName: event.target.value })}
                    error={errors.newUserLastName}
                    placeholder="Doe"
                  />
                  <Input
                    label="Email *"
                    type="email"
                    value={newUserData.email}
                    onChange={(event) => setNewUserData({ ...newUserData, email: event.target.value })}
                    error={errors.newUserEmail}
                    placeholder="john@company.com"
                  />
                  <Input
                    label="Temporary Password *"
                    type="password"
                    value={newUserData.password}
                    onChange={(event) => setNewUserData({ ...newUserData, password: event.target.value })}
                    error={errors.newUserPassword}
                    placeholder="Minimum 8 characters"
                  />
                  <Input
                    label="Phone"
                    value={newUserData.phone}
                    onChange={(event) => setNewUserData({ ...newUserData, phone: event.target.value })}
                    placeholder="+1-555-0100"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      value={newUserData.role}
                      onChange={(event) => {
                        const nextRole = event.target.value as QuickUserRole;
                        setNewUserData({
                          ...newUserData,
                          role: nextRole,
                          branchId: quickRoleNeedsBranch(nextRole) ? newUserData.branchId : '',
                        });
                      }}
                    >
                      {QUICK_USER_ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {quickRoleNeedsBranch(newUserData.role) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                      <select
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                          errors.newUserBranch ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={newUserData.branchId}
                        onChange={(event) => setNewUserData({ ...newUserData, branchId: event.target.value })}
                      >
                        <option value="">Select Branch</option>
                        {companyBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name} ({branch.code})
                          </option>
                        ))}
                      </select>
                      {errors.newUserBranch && <p className="mt-1 text-sm text-red-600">{errors.newUserBranch}</p>}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-7">
                    <input
                      id="quick-user-active"
                      type="checkbox"
                      checked={newUserData.isActive}
                      onChange={(event) => setNewUserData({ ...newUserData, isActive: event.target.checked })}
                      className="w-4 h-4 text-primary-600"
                    />
                    <label htmlFor="quick-user-active" className="text-sm text-gray-700 font-medium">
                      Active user
                    </label>
                  </div>
                </div>

                {errors.newUserSubmit && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{errors.newUserSubmit}</div>
                )}

                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleCreateUser} disabled={isCreatingUser}>
                    {isCreatingUser ? 'Creating...' : 'Create User'}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreateUserForm(false)} disabled={isCreatingUser}>
                    Close
                  </Button>
                </div>
              </div>
            )}

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


