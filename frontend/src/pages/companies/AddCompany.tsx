import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import PricingSlabTable from '../../components/forms/PricingSlabTable';
import CollectionPricingTable from '../../components/forms/CollectionPricingTable';
import api from '../../services/api';

type QuickUserRole = 'COMPANY_ADMIN' | 'BRANCH_MANAGER' | 'SALES_REP';

interface DraftBranchPricingSlab {
  minCost: number;
  maxCost: number;
  multiplier: number;
}

interface DraftBranch {
  tempId: string;
  name: string;
  code: string;
  streetAddress?: string;
  streetAddress2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  email?: string;
  phone?: string;
  branchMultiplier: number;
  enableSlabPricing: boolean;
  pricingSlabs: DraftBranchPricingSlab[];
}

interface DraftUser {
  tempId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: QuickUserRole;
  branchRef: string;
  isActive: boolean;
}

function quickRoleNeedsBranch(role: QuickUserRole): boolean {
  return role === 'BRANCH_MANAGER' || role === 'SALES_REP';
}

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
  const [showCreateBranchForm, setShowCreateBranchForm] = useState(false);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [draftBranches, setDraftBranches] = useState<DraftBranch[]>([]);
  const [draftUsers, setDraftUsers] = useState<DraftUser[]>([]);
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
    enableSlabPricing: false,
  });
  const [newBranchSlabs, setNewBranchSlabs] = useState<DraftBranchPricingSlab[]>([
    { minCost: 0, maxCost: 500, multiplier: 3.5 },
    { minCost: 500.01, maxCost: 3000, multiplier: 3.0 },
  ]);
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'COMPANY_ADMIN' as QuickUserRole,
    branchRef: '',
    isActive: true,
  });

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

  const validateDraftBranch = () => {
    const nextErrors: Record<string, string> = {};

    if (!newBranchData.name.trim()) nextErrors.newBranchName = 'Branch name is required';
    if (!newBranchData.code.trim()) nextErrors.newBranchCode = 'Branch code is required';
    if (newBranchData.branchMultiplier < 1 || newBranchData.branchMultiplier > 10) {
      nextErrors.newBranchMultiplier = 'Multiplier must be between 1 and 10';
    }
    if (newBranchData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBranchData.email)) {
      nextErrors.newBranchEmail = 'Invalid email format';
    }
    if (newBranchData.enableSlabPricing && newBranchSlabs.length === 0) {
      nextErrors.newBranchPricingSlabs = 'Add at least one branch pricing slab';
    }

    setErrors((prev) => {
      const updated = { ...prev };
      ['newBranchName', 'newBranchCode', 'newBranchMultiplier', 'newBranchEmail', 'newBranchPricingSlabs'].forEach((key) => delete updated[key]);
      return { ...updated, ...nextErrors };
    });

    return Object.keys(nextErrors).length === 0;
  };

  const validateDraftUser = () => {
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
    if (quickRoleNeedsBranch(newUserData.role) && !newUserData.branchRef) {
      nextErrors.newUserBranch = 'Branch is required for this role';
    }

    setErrors((prev) => {
      const updated = { ...prev };
      ['newUserFirstName', 'newUserLastName', 'newUserEmail', 'newUserPassword', 'newUserBranch'].forEach((key) => delete updated[key]);
      return { ...updated, ...nextErrors };
    });

    return Object.keys(nextErrors).length === 0;
  };

  const addDraftBranch = () => {
    if (!validateDraftBranch()) {
      return;
    }

    const tempId = `branch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setDraftBranches((prev) => [
      ...prev,
      {
        tempId,
        name: newBranchData.name.trim(),
        code: newBranchData.code.toUpperCase().replace(/\s+/g, ''),
        streetAddress: newBranchData.streetAddress.trim() || undefined,
        streetAddress2: newBranchData.streetAddress2.trim() || undefined,
        city: newBranchData.city.trim() || undefined,
        stateProvince: newBranchData.stateProvince.trim() || undefined,
        postalCode: newBranchData.postalCode.trim() || undefined,
        country: newBranchData.country.trim() || undefined,
        email: newBranchData.email.trim() || undefined,
        phone: newBranchData.phone.trim() || undefined,
        branchMultiplier: newBranchData.branchMultiplier,
        enableSlabPricing: newBranchData.enableSlabPricing,
        pricingSlabs: newBranchData.enableSlabPricing ? newBranchSlabs.map((slab) => ({ ...slab })) : [],
      },
    ]);

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
      enableSlabPricing: false,
    });
    setNewBranchSlabs([
      { minCost: 0, maxCost: 500, multiplier: 3.5 },
      { minCost: 500.01, maxCost: 3000, multiplier: 3.0 },
    ]);
    setShowCreateBranchForm(false);
  };

  const addDraftUser = () => {
    if (!validateDraftUser()) {
      return;
    }

    const tempId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setDraftUsers((prev) => [
      ...prev,
      {
        tempId,
        firstName: newUserData.firstName.trim(),
        lastName: newUserData.lastName.trim(),
        email: newUserData.email.trim().toLowerCase(),
        password: newUserData.password,
        phone: newUserData.phone.trim() || undefined,
        role: newUserData.role,
        branchRef: quickRoleNeedsBranch(newUserData.role) ? newUserData.branchRef : '',
        isActive: newUserData.isActive,
      },
    ]);

    setNewUserData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      role: 'COMPANY_ADMIN',
      branchRef: '',
      isActive: true,
    });
    setShowCreateUserForm(false);
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

      const companyResponse = await api.post('/companies', payload);
      const companyId = companyResponse.data?.id;

      if (!companyId) {
        throw new Error('Company created but ID not returned');
      }

      let mainBranchId: string | null = null;
      if (formData.createMainBranch) {
        const expectedMainCode = (formData.mainBranchCode || 'MAIN').toUpperCase().replace(/\s+/g, '');
        const branchLookup = await api.get('/branches', { params: { companyId, limit: 200 } });
        const existingBranches = branchLookup.data?.data || [];
        const mainBranch = existingBranches.find((branch: any) => branch.code === expectedMainCode);
        mainBranchId = mainBranch?.id || null;
      }

      const createdBranchIds = new Map<string, string>();
      for (const draftBranch of draftBranches) {
        const branchResponse = await api.post('/branches', {
          companyId,
          name: draftBranch.name,
          code: draftBranch.code,
          streetAddress: draftBranch.streetAddress || null,
          streetAddress2: draftBranch.streetAddress2 || null,
          city: draftBranch.city || null,
          stateProvince: draftBranch.stateProvince || null,
          postalCode: draftBranch.postalCode || null,
          country: draftBranch.country || null,
          email: draftBranch.email || null,
          phone: draftBranch.phone || null,
          branchMultiplier: draftBranch.branchMultiplier,
          enableSlabPricing: draftBranch.enableSlabPricing,
          pricingSlabs: draftBranch.enableSlabPricing ? draftBranch.pricingSlabs : [],
        });
        createdBranchIds.set(draftBranch.tempId, branchResponse.data.id);
      }

      for (const draftUser of draftUsers) {
        let branchId: string | null = null;
        if (quickRoleNeedsBranch(draftUser.role)) {
          if (draftUser.branchRef === '__MAIN__') {
            branchId = mainBranchId;
          } else {
            branchId = createdBranchIds.get(draftUser.branchRef) || null;
          }
        }

        if (quickRoleNeedsBranch(draftUser.role) && !branchId) {
          throw new Error(`Could not resolve branch assignment for user ${draftUser.email}`);
        }

        const userResponse = await api.post('/users', {
          firstName: draftUser.firstName,
          lastName: draftUser.lastName,
          email: draftUser.email,
          password: draftUser.password,
          role: draftUser.role,
          companyId,
          branchId,
          phone: draftUser.phone || null,
          isActive: draftUser.isActive,
        });

        if (draftUser.role === 'BRANCH_MANAGER' && branchId) {
          await api.put(`/branches/${branchId}`, { branchManagerId: userResponse.data.id });
        }
      }

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

        <Card title="Branches To Create With Company">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Add branch records now; they will be created after company save.</p>
              <Button type="button" size="sm" onClick={() => setShowCreateBranchForm((prev) => !prev)}>
                {showCreateBranchForm ? 'Cancel' : '+ Add Branch'}
              </Button>
            </div>

            {showCreateBranchForm && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Branch Name *"
                    value={newBranchData.name}
                    onChange={(e) => setNewBranchData({ ...newBranchData, name: e.target.value })}
                    error={errors.newBranchName}
                    placeholder="Downtown Branch"
                  />
                  <Input
                    label="Branch Code *"
                    value={newBranchData.code}
                    onChange={(e) => setNewBranchData({ ...newBranchData, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    error={errors.newBranchCode}
                    placeholder="DOWNTOWN"
                  />
                  <Input
                    label="Branch Email"
                    type="email"
                    value={newBranchData.email}
                    onChange={(e) => setNewBranchData({ ...newBranchData, email: e.target.value })}
                    error={errors.newBranchEmail}
                    placeholder="branch@company.com"
                  />
                  <Input
                    label="Branch Phone"
                    value={newBranchData.phone}
                    onChange={(e) => setNewBranchData({ ...newBranchData, phone: e.target.value })}
                    placeholder="+1-555-0100"
                  />
                  <div className="col-span-2">
                    <Input
                      label="Street Address"
                      value={newBranchData.streetAddress}
                      onChange={(e) => setNewBranchData({ ...newBranchData, streetAddress: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Address Line 2"
                      value={newBranchData.streetAddress2}
                      onChange={(e) => setNewBranchData({ ...newBranchData, streetAddress2: e.target.value })}
                      placeholder="Suite 300"
                    />
                  </div>
                  <Input
                    label="City"
                    value={newBranchData.city}
                    onChange={(e) => setNewBranchData({ ...newBranchData, city: e.target.value })}
                    placeholder="New York"
                  />
                  <Input
                    label="State/Province"
                    value={newBranchData.stateProvince}
                    onChange={(e) => setNewBranchData({ ...newBranchData, stateProvince: e.target.value })}
                    placeholder="NY"
                  />
                  <Input
                    label="Postal Code"
                    value={newBranchData.postalCode}
                    onChange={(e) => setNewBranchData({ ...newBranchData, postalCode: e.target.value })}
                    placeholder="10001"
                  />
                  <Input
                    label="Country"
                    value={newBranchData.country}
                    onChange={(e) => setNewBranchData({ ...newBranchData, country: e.target.value })}
                    placeholder="USA"
                  />
                  <div className="col-span-2">
                    <Input
                      label="Branch Multiplier *"
                      type="number"
                      min="1"
                      max="10"
                      step="0.01"
                      value={newBranchData.branchMultiplier}
                      onChange={(e) => setNewBranchData({ ...newBranchData, branchMultiplier: parseFloat(e.target.value) || 0 })}
                      error={errors.newBranchMultiplier}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBranchData.enableSlabPricing}
                    onChange={(e) => setNewBranchData({ ...newBranchData, enableSlabPricing: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable branch slab pricing</span>
                </label>

                {newBranchData.enableSlabPricing && (
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <PricingSlabTable slabs={newBranchSlabs} setSlabs={setNewBranchSlabs} />
                    {errors.newBranchPricingSlabs && (
                      <p className="text-sm text-red-600 mt-2">{errors.newBranchPricingSlabs}</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={addDraftBranch}>Add To List</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreateBranchForm(false)}>Close</Button>
                </div>
              </div>
            )}

            {draftBranches.length === 0 ? (
              <div className="text-sm text-gray-500">No extra branches added yet.</div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Branch</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Code</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Location</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Multiplier</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Pricing Mode</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftBranches.map((branch) => (
                      <tr key={branch.tempId} className="border-t">
                        <td className="px-4 py-2">{branch.name}</td>
                        <td className="px-4 py-2">{branch.code}</td>
                        <td className="px-4 py-2">{branch.city ? `${branch.city}${branch.country ? `, ${branch.country}` : ''}` : '-'}</td>
                        <td className="px-4 py-2">{branch.branchMultiplier.toFixed(2)}x</td>
                        <td className="px-4 py-2">
                          {branch.enableSlabPricing
                            ? `${branch.pricingSlabs.length} slab tier${branch.pricingSlabs.length === 1 ? '' : 's'}`
                            : 'Default only'}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDraftBranches((prev) => prev.filter((item) => item.tempId !== branch.tempId));
                              setDraftUsers((prev) => prev.filter((user) => user.branchRef !== branch.tempId));
                            }}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        <Card title="Users To Create With Company">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Add company users now; they will be created after company save.</p>
              <Button type="button" size="sm" onClick={() => setShowCreateUserForm((prev) => !prev)}>
                {showCreateUserForm ? 'Cancel' : '+ Add User'}
              </Button>
            </div>

            {showCreateUserForm && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Name *"
                    value={newUserData.firstName}
                    onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                    error={errors.newUserFirstName}
                    placeholder="John"
                  />
                  <Input
                    label="Last Name *"
                    value={newUserData.lastName}
                    onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                    error={errors.newUserLastName}
                    placeholder="Doe"
                  />
                  <Input
                    label="Email *"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    error={errors.newUserEmail}
                    placeholder="john@company.com"
                  />
                  <Input
                    label="Password *"
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    error={errors.newUserPassword}
                    placeholder="Minimum 8 characters"
                  />
                  <Input
                    label="Phone"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    placeholder="+1-555-0100"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      value={newUserData.role}
                      onChange={(e) => {
                        const nextRole = e.target.value as QuickUserRole;
                        setNewUserData({
                          ...newUserData,
                          role: nextRole,
                          branchRef: quickRoleNeedsBranch(nextRole) ? newUserData.branchRef : '',
                        });
                      }}
                    >
                      <option value="COMPANY_ADMIN">Company Admin</option>
                      <option value="BRANCH_MANAGER">Branch Manager</option>
                      <option value="SALES_REP">Sales Rep</option>
                    </select>
                  </div>

                  {quickRoleNeedsBranch(newUserData.role) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                      <select
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                          errors.newUserBranch ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={newUserData.branchRef}
                        onChange={(e) => setNewUserData({ ...newUserData, branchRef: e.target.value })}
                      >
                        <option value="">Select Branch</option>
                        {formData.createMainBranch && (
                          <option value="__MAIN__">
                            Main Branch ({(formData.mainBranchCode || 'MAIN').toUpperCase().replace(/\s+/g, '')})
                          </option>
                        )}
                        {draftBranches.map((branch) => (
                          <option key={branch.tempId} value={branch.tempId}>
                            {branch.name} ({branch.code})
                          </option>
                        ))}
                      </select>
                      {errors.newUserBranch && <p className="mt-1 text-sm text-red-600">{errors.newUserBranch}</p>}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-7">
                    <input
                      id="draft-user-active"
                      type="checkbox"
                      checked={newUserData.isActive}
                      onChange={(e) => setNewUserData({ ...newUserData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary-600"
                    />
                    <label htmlFor="draft-user-active" className="text-sm text-gray-700 font-medium">
                      Active user
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={addDraftUser}>Add To List</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreateUserForm(false)}>Close</Button>
                </div>
              </div>
            )}

            {draftUsers.length === 0 ? (
              <div className="text-sm text-gray-500">No users added yet.</div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">User</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Role</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Branch</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Status</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftUsers.map((user) => {
                      const branchLabel =
                        user.branchRef === '__MAIN__'
                          ? `Main (${(formData.mainBranchCode || 'MAIN').toUpperCase().replace(/\s+/g, '')})`
                          : draftBranches.find((branch) => branch.tempId === user.branchRef)?.name || '-';
                      return (
                        <tr key={user.tempId} className="border-t">
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-4 py-2">{user.role}</td>
                          <td className="px-4 py-2">{branchLabel}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => setDraftUsers((prev) => prev.filter((item) => item.tempId !== user.tempId))}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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

