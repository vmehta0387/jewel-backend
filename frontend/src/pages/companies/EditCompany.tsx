import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SmartDropdown from '../../components/common/SmartDropdown';
import FloatingErrorToast from '../../components/common/FloatingErrorToast';
import { useUnsavedChangesGuard } from '../../components/common/useUnsavedChangesGuard';
import { useAppDialog } from '../../components/common/useAppDialog';
import PricingSlabTable, { validatePricingSlabs } from '../../components/forms/PricingSlabTable';
import CollectionPricingTable, {
  type CollectionOverride,
  validateCollectionOverrides,
} from '../../components/forms/CollectionPricingTable';
import api from '../../services/api';
import { formatAddressLocation } from '../../utils/address';
import { getStoredUser, hasActionPermission } from '../../utils/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const optionalNumberId = (value?: string | number | null): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const COMPANY_ERROR_ORDER = [
  'companyName',
  'newManagerDraft',
  'newBranchName',
  'newUserFirstName',
  'primaryEmail',
  'shipStreetAddress',
  'defaultMultiplier',
  'slabs',
  'collections',
];
const NEW_MANAGER_ERROR_ORDER = ['newManagerFirstName', 'newManagerLastName', 'newManagerEmail'];
const NEW_BRANCH_ERROR_ORDER = ['newBranchName', 'newBranchCode', 'newBranchEmail', 'newBranchMultiplier'];
const NEW_USER_ERROR_ORDER = [
  'newUserFirstName',
  'newUserLastName',
  'newUserEmail',
  'newUserPassword',
  'newUserBranch',
];

type QuickUserRole = 'COMPANY_ADMIN' | 'BRANCH_MANAGER' | 'SALES_REP';

const QUICK_USER_ROLE_OPTIONS: { value: QuickUserRole; label: string }[] = [
  { value: 'COMPANY_ADMIN', label: 'Company Admin' },
  { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
  { value: 'SALES_REP', label: 'Sales Rep' },
];

function quickRoleNeedsBranch(role: QuickUserRole): boolean {
  return role === 'BRANCH_MANAGER' || role === 'SALES_REP';
}

function ManageActionContent() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M7.5 12.5L12.5 7.5M9 4.5H4.5V9M11 15.5H15.5V11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Manage</span>
    </span>
  );
}

export default function EditCompany() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { confirm: confirmAppDialog, showAlert: showAppAlert, dialogNode } = useAppDialog();
  const currentUser = getStoredUser();
  const canDisableCompany = Boolean(
    currentUser?.role === 'SUPER_ADMIN' && hasActionPermission(currentUser, 'company.status_update'),
  );
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
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
    defaultMultiplier: 2,
    enableSlabPricing: false,
    enableCollectionPricing: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);
  const [showCreateBranchForm, setShowCreateBranchForm] = useState(false);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showAddManager, setShowAddManager] = useState(false);
  const [newManager, setNewManager] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [pendingManagerData, setPendingManagerData] = useState<any>(null);
  const [accountManagers, setAccountManagers] = useState<any[]>([]);
  const [companyBranches, setCompanyBranches] = useState<any[]>([]);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [slabs, setSlabs] = useState<any[]>([]);
  const [collectionOverrides, setCollectionOverrides] = useState<CollectionOverride[]>([]);
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
    branchMultiplier: 2,
  });
  const initialCompanySnapshotRef = useRef<string>('');

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

  const [pendingCompanyAction, setPendingCompanyAction] = useState<(() => void) | null>(null);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editBranchData, setEditBranchData] = useState({
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
    branchManagerId: '',
    isActive: true,
  });
  const [editUserData, setEditUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'COMPANY_ADMIN' as QuickUserRole,
    branchId: '',
    isActive: true,
  });
  const [editModalErrors, setEditModalErrors] = useState<Record<string, string>>({});
  const [isSavingEditModal, setIsSavingEditModal] = useState(false);

  const currentCompanySnapshot = useMemo(() => JSON.stringify({
    formData,
    slabs,
    collectionOverrides,
    pendingManagerData,
  }), [collectionOverrides, formData, pendingManagerData, slabs]);

  const hasUnsavedCompanyChanges = Boolean(initialCompanySnapshotRef.current && currentCompanySnapshot !== initialCompanySnapshotRef.current);

  const rememberCompanySnapshot = (nextFormData = formData, nextSlabs = slabs, nextCollectionOverrides = collectionOverrides, nextPendingManagerData = pendingManagerData) => {
    initialCompanySnapshotRef.current = JSON.stringify({
      formData: nextFormData,
      slabs: nextSlabs,
      collectionOverrides: nextCollectionOverrides,
      pendingManagerData: nextPendingManagerData,
    });
  };

  useEffect(() => {
    fetchCompany();
    fetchAccountManagers();
  }, [id]);

  const focusFirstError = (nextErrors: Record<string, string>, errorOrder = COMPANY_ERROR_ORDER) => {
    const firstKey = errorOrder.find((key) => nextErrors[key]);
    const target = firstKey ? fieldRefs.current[firstKey] || document.getElementById(firstKey) : null;

    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
        target.focus({ preventScroll: true });
        return;
      }
      target.querySelector<HTMLElement>('input, select, textarea, button')?.focus({ preventScroll: true });
    }, 250);
  };

  const fetchAccountManagers = async () => {
    try {
      const response = await api.get('/users/lookup', { params: { role: 'INTERNAL_REP' } });
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
        api.get('/users/lookup', { params: { companyId, status: 'ALL' } }),
      ]);

      const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      const usersById = new Map(users.map((user: any) => [String(user.id), user]));
      const branches = Array.isArray(branchesResponse.data?.data) ? branchesResponse.data.data : [];

      setCompanyBranches(
        branches.map((branch: any) => {
          const branchManagerId = branch.branchManagerId ?? branch.branchManager?.id;
          return {
            ...branch,
            branchManager:
              branch.branchManager ||
              (branchManagerId !== undefined && branchManagerId !== null
                ? usersById.get(String(branchManagerId)) || null
                : null),
          };
        }),
      );
      setCompanyUsers(users);
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
    if (showAddManager) {
      newErrors.newManagerDraft = 'Please click Add Manager to save the entered account manager details, or cancel this section before updating the company.';
    }
    if (showCreateBranchForm) {
      newErrors.newBranchName = 'Please click Create Branch to save this branch, or close the Quick Add Branch form before updating the company.';
    }
    if (showCreateUserForm) {
      newErrors.newUserFirstName = 'Please click Create User to save this user, or close the Quick Add User form before updating the company.';
    }
    if (showCreateBranchForm || showCreateUserForm) {
      newErrors.submit = 'Finish or close the open Quick Add form before saving company details.';
    }
    if (formData.primaryEmail && !EMAIL_REGEX.test(formData.primaryEmail)) {
      newErrors.primaryEmail = 'Invalid email format';
    }
    if (formData.shipToType === 'CUSTOM' && !formData.shipStreetAddress.trim()) {
      newErrors.shipStreetAddress = 'Shipping address is required for custom shipping';
    }
    if (formData.defaultMultiplier < 1.5 || formData.defaultMultiplier > 10) {
      newErrors.defaultMultiplier = 'Markup must be between 1.5 and 10';
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
    if (formData.enableCollectionPricing) {
      if (collectionOverrides.length === 0) {
        newErrors.collections = 'Add at least one collection override';
      } else {
        const collectionError = validateCollectionOverrides(collectionOverrides);
        if (collectionError) {
          newErrors.collections = collectionError;
        }
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors);
      return false;
    }
    return true;
  };

  const saveCompany = async (nextTarget?: string | (() => void)): Promise<boolean> => {
    if (!validateForm()) {
      return false;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        companyName: formData.companyName,
        accountManagerId: optionalNumberId(formData.accountManagerId),
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
      } as any;

      if (pendingManagerData) {
        payload.newAccountManager = pendingManagerData;
        delete payload.accountManagerId;
      }

      await api.put(`/companies/${id}`, payload);
      rememberCompanySnapshot(formData, slabs, collectionOverrides, null);
      if (typeof nextTarget === 'function') {
        nextTarget();
      } else if (nextTarget) {
        navigate(nextTarget);
      }
      return true;
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setErrors({ submit: Array.isArray(message) ? message.join(', ') : message || 'Network error. Please try again.' });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const { dialogNode: unsavedChangesDialog, markClean } = useUnsavedChangesGuard({
    value: {
      formData,
      slabs,
      collectionOverrides,
      pendingManagerData,
      newManager,
      newBranchData,
      newUserData,
      editBranchData,
      editUserData,
    },
    ready: !loading,
    onSave: () => saveCompany(),
    isSaving: isSubmitting || isSavingEditModal,
    title: 'Unsaved Company Changes',
  });

  const handleDisableCompany = async () => {
    if (!id || !canDisableCompany) return;
    const confirmed = await confirmAppDialog(
      'Disable this company? Its branches and user access will also be disabled.',
      {
        title: 'Disable Company',
        variant: 'warning',
        confirmLabel: 'Disable Company',
        cancelLabel: 'Cancel',
      },
    );
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      await api.patch(`/companies/${id}/status`, { isActive: false });
      markClean();
      navigate('/companies');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      showAppAlert(Array.isArray(message) ? message.join(', ') : message || 'Unable to disable company.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveCompany('/companies');
  };

  const queueCompanyAction = (action: () => void) => {
    if (!hasUnsavedCompanyChanges) {
      action();
      return;
    }
    setPendingCompanyAction(() => action);
  };

  const handleOpenFullForm = (path: string) => {
    queueCompanyAction(() => navigate(path));
  };

  const runPendingCompanyAction = () => {
    const action = pendingCompanyAction;
    setPendingCompanyAction(null);
    setPendingNavigationPath(null);
    action?.();
  };

  const validateBranchCreation = () => {
    const nextErrors: Record<string, string> = {};

    if (!newBranchData.name.trim()) nextErrors.newBranchName = 'Branch name is required';
    if (!newBranchData.code.trim()) nextErrors.newBranchCode = 'Branch code is required';
    if (newBranchData.branchMultiplier < 1.5 || newBranchData.branchMultiplier > 10) {
      nextErrors.newBranchMultiplier = 'Markup must be between 1.5 and 10';
    }
    if (newBranchData.email && !EMAIL_REGEX.test(newBranchData.email)) {
      nextErrors.newBranchEmail = 'Invalid email format';
    }

    setErrors((prev) => {
      const next = { ...prev };
      [...NEW_BRANCH_ERROR_ORDER, 'newBranchSubmit'].forEach((key) => {
        delete next[key];
      });
      return { ...next, ...nextErrors };
    });
    focusFirstError(nextErrors, NEW_BRANCH_ERROR_ORDER);
    return Object.keys(nextErrors).length === 0;
  };

  const validateNewManager = () => {
    const nextErrors: Record<string, string> = {};

    if (!newManager.firstName.trim()) nextErrors.newManagerFirstName = 'First name is required';
    if (!newManager.lastName.trim()) nextErrors.newManagerLastName = 'Last name is required';
    if (!newManager.email.trim()) {
      nextErrors.newManagerEmail = 'Email is required';
    } else if (!EMAIL_REGEX.test(newManager.email)) {
      nextErrors.newManagerEmail = 'Invalid email format';
    }

    setErrors((prev) => {
      const updated = { ...prev };
      [...NEW_MANAGER_ERROR_ORDER, 'newManagerDraft'].forEach((key) => delete updated[key]);
      return { ...updated, ...nextErrors };
    });

    focusFirstError(nextErrors, NEW_MANAGER_ERROR_ORDER);
    return Object.keys(nextErrors).length === 0;
  };

  const addPendingManager = () => {
    if (!validateNewManager()) return;

    const tempId = `temp-${Date.now()}`;
    const fullName = `${newManager.firstName.trim()} ${newManager.lastName.trim()}`;
    setAccountManagers((prev) => [...prev, { id: tempId, name: fullName }]);
    setFormData((prev) => ({ ...prev, accountManagerId: tempId }));
    setPendingManagerData({
      firstName: newManager.firstName.trim(),
      lastName: newManager.lastName.trim(),
      email: newManager.email.trim().toLowerCase(),
      phone: newManager.phone.trim() || undefined,
    });
    setNewManager({ firstName: '', lastName: '', email: '', phone: '' });
    setShowAddManager(false);
  };
  const validateUserCreation = () => {
    const nextErrors: Record<string, string> = {};

    if (!newUserData.firstName.trim()) nextErrors.newUserFirstName = 'First name is required';
    if (!newUserData.lastName.trim()) nextErrors.newUserLastName = 'Last name is required';
    if (!newUserData.email.trim()) nextErrors.newUserEmail = 'Email is required';
    if (newUserData.email && !EMAIL_REGEX.test(newUserData.email)) {
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
      [...NEW_USER_ERROR_ORDER, 'newUserSubmit'].forEach((key) => {
        delete next[key];
      });
      return { ...next, ...nextErrors };
    });
    focusFirstError(nextErrors, NEW_USER_ERROR_ORDER);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateBranch = async () => {
    if (!id || !validateBranchCreation()) {
      return;
    }

    setIsCreatingBranch(true);
    try {
      await api.post('/branches', {
        companyId: optionalNumberId(id),
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
      const userResponse = await api.post('/users', {
        firstName: newUserData.firstName.trim(),
        lastName: newUserData.lastName.trim(),
        email: newUserData.email.trim().toLowerCase(),
        password: newUserData.password,
        role: newUserData.role,
        companyId: optionalNumberId(id),
        branchId: quickRoleNeedsBranch(newUserData.role) ? optionalNumberId(newUserData.branchId) : null,
        phone: newUserData.phone.trim() || null,
        isActive: newUserData.isActive,
      });
      if (newUserData.role === 'BRANCH_MANAGER' && newUserData.branchId) {
        await api.put(`/branches/${newUserData.branchId}`, {
          branchManagerId: optionalNumberId(userResponse.data.id),
        });
      }

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

  const openBranchCreator = () => {
    queueCompanyAction(() => {
      setShowCreateBranchForm(false);
      setEditModalErrors({});
      setEditingBranch({ id: null, name: 'New Branch' });
      setEditBranchData({
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
        branchManagerId: '',
        isActive: true,
      });
    });
  };

  const openBranchEditor = (branch: any) => {
    queueCompanyAction(() => {
      setEditModalErrors({});
      setEditingBranch(branch);
      setEditBranchData({
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
        branchMultiplier: parseFloat(branch.branchMultiplier || 2),
        branchManagerId: branch.branchManagerId || branch.branchManager?.id || '',
        isActive: branch.isActive !== false,
      });
    });
  };

  const openUserEditor = (user: any) => {
    queueCompanyAction(() => {
      setEditModalErrors({});
      setEditingUser(user);
      setEditUserData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '',
        phone: user.phone || '',
        role: (user.role || 'COMPANY_ADMIN') as QuickUserRole,
        branchId: user.branchId || user.branch?.id || '',
        isActive: user.isActive !== false,
      });
    });
  };

  const closeEditModals = () => {
    if (isSavingEditModal) return;
    setEditingBranch(null);
    setEditingUser(null);
    setEditModalErrors({});
  };

  const saveBranchEditor = async () => {
    if (!editingBranch || !id) return;
    const nextErrors: Record<string, string> = {};
    if (!editBranchData.name.trim()) nextErrors.editBranchName = 'Branch name is required';
    if (!editBranchData.code.trim()) nextErrors.editBranchCode = 'Branch code is required';
    if (editBranchData.email && !EMAIL_REGEX.test(editBranchData.email)) nextErrors.editBranchEmail = 'Invalid email format';
    if (editBranchData.branchMultiplier < 1.5 || editBranchData.branchMultiplier > 10) {
      nextErrors.editBranchMultiplier = 'Markup must be between 1.5 and 10';
    }
    if (Object.keys(nextErrors).length > 0) {
      setEditModalErrors(nextErrors);
      return;
    }

    setIsSavingEditModal(true);
    try {
      const branchPayload = {
        companyId: optionalNumberId(id),
        name: editBranchData.name.trim(),
        code: editBranchData.code.toUpperCase().replace(/\s+/g, ''),
        streetAddress: editBranchData.streetAddress.trim() || null,
        streetAddress2: editBranchData.streetAddress2.trim() || null,
        city: editBranchData.city.trim() || null,
        stateProvince: editBranchData.stateProvince.trim() || null,
        postalCode: editBranchData.postalCode.trim() || null,
        country: editBranchData.country.trim() || null,
        email: editBranchData.email.trim() || null,
        phone: editBranchData.phone.trim() || null,
        branchMultiplier: editBranchData.branchMultiplier,
        branchManagerId: optionalNumberId(editBranchData.branchManagerId),
        isActive: editBranchData.isActive,
      };
      if (editingBranch.id) {
        await api.put(`/branches/${editingBranch.id}`, branchPayload);
      } else {
        await api.post('/branches', branchPayload);
      }
      await fetchCompanyResources(id);
      setEditingBranch(null);
      setEditModalErrors({});
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setEditModalErrors({ submit: Array.isArray(message) ? message.join(', ') : message || 'Failed to update branch' });
    } finally {
      setIsSavingEditModal(false);
    }
  };

  const saveUserEditor = async () => {
    if (!editingUser || !id) return;
    const nextErrors: Record<string, string> = {};
    if (!editUserData.firstName.trim()) nextErrors.editUserFirstName = 'First name is required';
    if (!editUserData.lastName.trim()) nextErrors.editUserLastName = 'Last name is required';
    if (!editUserData.email.trim()) nextErrors.editUserEmail = 'Email is required';
    if (editUserData.email && !EMAIL_REGEX.test(editUserData.email)) nextErrors.editUserEmail = 'Invalid email format';
    if (editUserData.password && editUserData.password.length < 8) nextErrors.editUserPassword = 'Password must be at least 8 characters';
    if (quickRoleNeedsBranch(editUserData.role) && !editUserData.branchId) nextErrors.editUserBranch = 'Branch is required for this role';
    if (Object.keys(nextErrors).length > 0) {
      setEditModalErrors(nextErrors);
      return;
    }

    setIsSavingEditModal(true);
    try {
      const payload: any = {
        firstName: editUserData.firstName.trim(),
        lastName: editUserData.lastName.trim(),
        email: editUserData.email.trim().toLowerCase(),
        role: editUserData.role,
        companyId: optionalNumberId(id),
        branchId: quickRoleNeedsBranch(editUserData.role) ? optionalNumberId(editUserData.branchId) : null,
        phone: editUserData.phone.trim() || null,
        isActive: editUserData.isActive,
      };
      if (editUserData.password.trim()) {
        payload.password = editUserData.password;
      }
      await api.put(`/users/${editingUser.id}`, payload);
      await fetchCompanyResources(id);
      setEditingUser(null);
      setEditModalErrors({});
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setEditModalErrors({ submit: Array.isArray(message) ? message.join(', ') : message || 'Failed to update user' });
    } finally {
      setIsSavingEditModal(false);
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" onClick={() => handleOpenFullForm('/companies')}>Back</Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Company</h1>
        {canDisableCompany ? (
          <Button type="button" variant="danger" className="ml-auto" onClick={() => void handleDisableCompany()} disabled={isSubmitting}>
            Disable Company
          </Button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {unsavedChangesDialog}
        <FloatingErrorToast
          message={errors.submit}
          onClose={() => setErrors((prev) => {
            const next = { ...prev };
            delete next.submit;
            return next;
          })}
        />

        {(pendingNavigationPath || pendingCompanyAction) && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900">Unsaved Company Changes</h2>
              <p className="mt-2 text-sm text-gray-600">
                Save your company changes before continuing, discard them, or stay on this page.
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const nextTarget = pendingCompanyAction || pendingNavigationPath || '/companies';
                    setPendingCompanyAction(null);
                    setPendingNavigationPath(null);
                    void saveCompany(nextTarget);
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (pendingCompanyAction) {
                      runPendingCompanyAction();
                      return;
                    }
                    const nextPath = pendingNavigationPath;
                    setPendingNavigationPath(null);
                    if (nextPath) navigate(nextPath);
                  }}
                  disabled={isSubmitting}
                >
                  Discard Changes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPendingCompanyAction(null);
                    setPendingNavigationPath(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
        <Card title="Company Information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div ref={(element) => { fieldRefs.current.companyName = element; }}>
              <Input
                id="companyName"
                label="Company Name *"
                value={formData.companyName}
                onChange={(event) => setFormData({ ...formData, companyName: event.target.value })}
                placeholder="Brilliant Jewelers Inc."
                error={errors.companyName}
                required
              />
            </div>
            <Input
              label="Company Code"
              value={formData.companyCode}
              disabled
              className="bg-gray-100"
            />
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Account Manager</label>
              <div className="flex gap-2">
                <SmartDropdown
                  value={formData.accountManagerId}
                  onChange={(value) => {
                    setFormData({ ...formData, accountManagerId: value });
                    if (!String(value).startsWith('temp-')) {
                      setPendingManagerData(null);
                    }
                  }}
                  config={{
                    apiSubPath: '/users/lookup',
                    extraParams: { role: 'INTERNAL_REP', status: 'ACTIVE' },
                    options: accountManagers.map((manager) => ({ ...manager, label: manager.name })),
                    placeholder: 'Select Account Manager',
                    clearLabel: 'No Account Manager',
                    valueKey: 'id',
                    labelKey: 'label',
                  }}
                />
                <Button type="button" variant="secondary" onClick={() => setShowAddManager((prev) => !prev)}>
                  {showAddManager ? 'Cancel' : '+ Add New'}
                </Button>
              </div>

              {showAddManager && (
                <div
                  id="newManagerDraft"
                  tabIndex={-1}
                  className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {errors.newManagerDraft && (
                    <p className="text-sm text-red-600">{errors.newManagerDraft}</p>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Input
                      id="newManagerFirstName"
                      label="First Name *"
                      value={newManager.firstName}
                      onChange={(event) => setNewManager({ ...newManager, firstName: event.target.value })}
                      placeholder="John"
                      error={errors.newManagerFirstName}
                    />
                    <Input
                      id="newManagerLastName"
                      label="Last Name *"
                      value={newManager.lastName}
                      onChange={(event) => setNewManager({ ...newManager, lastName: event.target.value })}
                      placeholder="Doe"
                      error={errors.newManagerLastName}
                    />
                    <Input
                      id="newManagerEmail"
                      label="Email *"
                      type="email"
                      value={newManager.email}
                      onChange={(event) => setNewManager({ ...newManager, email: event.target.value })}
                      placeholder="john.doe@company.com"
                      error={errors.newManagerEmail}
                    />
                    <Input
                      label="Phone"
                      value={newManager.phone}
                      onChange={(event) => setNewManager({ ...newManager, phone: event.target.value })}
                      placeholder="+1-555-0100"
                    />
                  </div>
                  <Button type="button" size="sm" onClick={addPendingManager}>
                    Add Manager
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Contact Information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div ref={(element) => { fieldRefs.current.primaryEmail = element; }}>
              <Input
                id="primaryEmail"
                label="Primary Email"
                type="email"
                value={formData.primaryEmail}
                onChange={(event) => setFormData({ ...formData, primaryEmail: event.target.value })}
                placeholder="contact@company.com"
                error={errors.primaryEmail}
              />
            </div>
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
                    id="shipStreetAddress"
                    label="Street Address"
                    value={formData.shipStreetAddress}
                    onChange={(event) => setFormData({ ...formData, shipStreetAddress: event.target.value })}
                    placeholder="456 Shipping Lane"
                    error={errors.shipStreetAddress}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Markup *</label>
              <div ref={(element) => { fieldRefs.current.defaultMultiplier = element; }} className="max-w-xs">
                <Input
                  type="number"
                  id="defaultMultiplier"
                  step="0.01"
                  min="1.5"
                  max="10"
                  value={formData.defaultMultiplier}
                  onChange={(event) => {
                    if (event.target.value.startsWith('-')) return;
                    setFormData({ ...formData, defaultMultiplier: parseFloat(event.target.value) || 0 });
                  }}
                  placeholder="1.5"
                  error={errors.defaultMultiplier}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Base markup applied to all products (1.0 - 10.0)</p>
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
              <p className="text-xs text-gray-500 ml-6 mt-1">Override default markup based on cost ranges</p>
            </div>

            {formData.enableSlabPricing && (
              <div
                id="slabs"
                ref={(element) => { fieldRefs.current.slabs = element; }}
                tabIndex={-1}
                className="ml-6 p-4 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <PricingSlabTable slabs={slabs} setSlabs={setSlabs} />
                {errors.slabs && <p className="text-sm text-red-600 mt-2">{errors.slabs}</p>}
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
              <div
                id="collections"
                ref={(element) => { fieldRefs.current.collections = element; }}
                tabIndex={-1}
                className="ml-6 p-4 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <CollectionPricingTable overrides={collectionOverrides} setOverrides={setCollectionOverrides} />
                {errors.collections && <p className="text-sm text-red-600 mt-2">{errors.collections}</p>}
              </div>
            )}
          </div>
        </Card>

        <Card title="Branches & Pricing">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Create and manage branches from this company context.</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => queueCompanyAction(() => setShowCreateBranchForm((prev) => !prev))}>
                  {showCreateBranchForm ? 'Cancel' : '+ Quick Add Branch'}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={openBranchCreator}>
                  Open Full Branch Form
                </Button>
              </div>
            </div>

            {showCreateBranchForm && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    id="newBranchName"
                    label="Branch Name *"
                    value={newBranchData.name}
                    onChange={(event) => setNewBranchData({ ...newBranchData, name: event.target.value })}
                    error={errors.newBranchName}
                    placeholder="Downtown Branch"
                  />
                  <Input
                    id="newBranchCode"
                    label="Branch Code *"
                    value={newBranchData.code}
                    onChange={(event) => setNewBranchData({ ...newBranchData, code: event.target.value.toUpperCase().replace(/\s+/g, '') })}
                    error={errors.newBranchCode}
                    placeholder="DOWNTOWN"
                  />
                  <Input
                    id="newBranchEmail"
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
                    id="newBranchMultiplier"
                    label="Branch Markup *"
                    type="number"
                    min="1.5"
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
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Location</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Manager</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Pricing</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companyBranches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
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
                        <td className="px-4 py-2">{formatAddressLocation(branch)}</td>
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
                            onClick={() => openBranchEditor(branch)}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                          >
                            <ManageActionContent />
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
                <Button type="button" size="sm" onClick={() => queueCompanyAction(() => setShowCreateUserForm((prev) => !prev))}>
                  {showCreateUserForm ? 'Cancel' : '+ Quick Add User'}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => handleOpenFullForm(`/users/add?companyId=${id}`)}>
                  Open Full User Form
                </Button>
              </div>
            </div>

            {showCreateUserForm && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    id="newUserFirstName"
                    label="First Name *"
                    value={newUserData.firstName}
                    onChange={(event) => setNewUserData({ ...newUserData, firstName: event.target.value })}
                    error={errors.newUserFirstName}
                    placeholder="John"
                  />
                  <Input
                    id="newUserLastName"
                    label="Last Name *"
                    value={newUserData.lastName}
                    onChange={(event) => setNewUserData({ ...newUserData, lastName: event.target.value })}
                    error={errors.newUserLastName}
                    placeholder="Doe"
                  />
                  <Input
                    id="newUserEmail"
                    label="Email *"
                    type="email"
                    value={newUserData.email}
                    onChange={(event) => setNewUserData({ ...newUserData, email: event.target.value })}
                    error={errors.newUserEmail}
                    placeholder="john@company.com"
                  />
                  <Input
                    id="newUserPassword"
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
                    <SmartDropdown
                      value={newUserData.role}
                      onChange={(value) => {
                        const nextRole = value as QuickUserRole;
                        setNewUserData({
                          ...newUserData,
                          role: nextRole,
                          branchId: quickRoleNeedsBranch(nextRole) ? newUserData.branchId : '',
                        });
                      }}
                      config={{
                        showSearch: false,
                        options: QUICK_USER_ROLE_OPTIONS.map((option) => ({ id: option.value, value: option.value, label: option.label })),
                        placeholder: 'Select Role',
                        valueKey: 'id',
                        labelKey: 'label',
                      }}
                    />
                  </div>

                  {quickRoleNeedsBranch(newUserData.role) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                      <select
                        id="newUserBranch"
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
                            onClick={() => openUserEditor(user)}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                          >
                            <ManageActionContent />
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

        {editingBranch && (
          <div className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-slate-900/45 px-4 py-8" role="dialog" aria-modal="true">
            <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
              <div className="flex items-start justify-between border-b px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{editingBranch.id ? 'Edit Branch' : 'Add Branch'}</h2>
                  <p className="text-sm text-gray-500">{editingBranch.name}</p>
                </div>
                <button type="button" className="text-2xl leading-none text-gray-400 hover:text-gray-700" onClick={closeEditModals} disabled={isSavingEditModal}>x</button>
              </div>
              <div className="space-y-4 p-5">
                {editModalErrors.submit && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editModalErrors.submit}</div>}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="Branch Name *" value={editBranchData.name} onChange={(event) => setEditBranchData({ ...editBranchData, name: event.target.value })} error={editModalErrors.editBranchName} />
                  <Input label="Branch Code *" value={editBranchData.code} onChange={(event) => setEditBranchData({ ...editBranchData, code: event.target.value.toUpperCase().replace(/\s+/g, '') })} error={editModalErrors.editBranchCode} />
                  <Input label="Branch Email" type="email" value={editBranchData.email} onChange={(event) => setEditBranchData({ ...editBranchData, email: event.target.value })} error={editModalErrors.editBranchEmail} />
                  <Input label="Branch Phone" value={editBranchData.phone} onChange={(event) => setEditBranchData({ ...editBranchData, phone: event.target.value })} />
                  <Input label="City" value={editBranchData.city} onChange={(event) => setEditBranchData({ ...editBranchData, city: event.target.value })} />
                  <Input label="State/Province" value={editBranchData.stateProvince} onChange={(event) => setEditBranchData({ ...editBranchData, stateProvince: event.target.value })} />
                  <Input label="Postal Code" value={editBranchData.postalCode} onChange={(event) => setEditBranchData({ ...editBranchData, postalCode: event.target.value })} />
                  <Input label="Country" value={editBranchData.country} onChange={(event) => setEditBranchData({ ...editBranchData, country: event.target.value })} />
                  <div className="md:col-span-2">
                    <Input label="Street Address" value={editBranchData.streetAddress} onChange={(event) => setEditBranchData({ ...editBranchData, streetAddress: event.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Input label="Address Line 2" value={editBranchData.streetAddress2} onChange={(event) => setEditBranchData({ ...editBranchData, streetAddress2: event.target.value })} />
                  </div>
                  <Input label="Branch Markup *" type="number" min="1.5" max="10" step="0.01" value={editBranchData.branchMultiplier} onChange={(event) => setEditBranchData({ ...editBranchData, branchMultiplier: parseFloat(event.target.value) || 0 })} error={editModalErrors.editBranchMultiplier} />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Branch Manager</label>
                    <select className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary-500" value={editBranchData.branchManagerId} onChange={(event) => setEditBranchData({ ...editBranchData, branchManagerId: event.target.value })}>
                      <option value="">No manager</option>
                      {companyUsers.filter((user) => user.role === 'BRANCH_MANAGER').map((user) => (
                        <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 md:col-span-2">
                    <input type="checkbox" checked={editBranchData.isActive} onChange={(event) => setEditBranchData({ ...editBranchData, isActive: event.target.checked })} className="h-4 w-4 text-primary-600" />
                    <span className="text-sm font-medium text-gray-700">Active branch</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t px-5 py-4">
                <Button type="button" variant="secondary" onClick={closeEditModals} disabled={isSavingEditModal}>Cancel</Button>
                <Button type="button" onClick={saveBranchEditor} disabled={isSavingEditModal}>{isSavingEditModal ? 'Saving...' : editingBranch.id ? 'Save Branch' : 'Create Branch'}</Button>
              </div>
            </div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-slate-900/45 px-4 py-8" role="dialog" aria-modal="true">
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
              <div className="flex items-start justify-between border-b px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
                  <p className="text-sm text-gray-500">{editingUser.email}</p>
                </div>
                <button type="button" className="text-2xl leading-none text-gray-400 hover:text-gray-700" onClick={closeEditModals} disabled={isSavingEditModal}>x</button>
              </div>
              <div className="space-y-4 p-5">
                {editModalErrors.submit && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editModalErrors.submit}</div>}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="First Name *" value={editUserData.firstName} onChange={(event) => setEditUserData({ ...editUserData, firstName: event.target.value })} error={editModalErrors.editUserFirstName} />
                  <Input label="Last Name *" value={editUserData.lastName} onChange={(event) => setEditUserData({ ...editUserData, lastName: event.target.value })} error={editModalErrors.editUserLastName} />
                  <Input label="Email *" type="email" value={editUserData.email} onChange={(event) => setEditUserData({ ...editUserData, email: event.target.value })} error={editModalErrors.editUserEmail} />
                  <Input label="New Password" type="password" value={editUserData.password} onChange={(event) => setEditUserData({ ...editUserData, password: event.target.value })} error={editModalErrors.editUserPassword} placeholder="Leave blank to keep current password" />
                  <Input label="Phone" value={editUserData.phone} onChange={(event) => setEditUserData({ ...editUserData, phone: event.target.value })} />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Role *</label>
                    <SmartDropdown
                      value={editUserData.role}
                      onChange={(value) => {
                        const nextRole = value as QuickUserRole;
                        setEditUserData({ ...editUserData, role: nextRole, branchId: quickRoleNeedsBranch(nextRole) ? editUserData.branchId : '' });
                      }}
                      config={{ showSearch: false, options: QUICK_USER_ROLE_OPTIONS.map((option) => ({ id: option.value, value: option.value, label: option.label })), placeholder: 'Select Role', valueKey: 'id', labelKey: 'label' }}
                    />
                  </div>
                  {quickRoleNeedsBranch(editUserData.role) && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Branch *</label>
                      <select className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-primary-500 ${editModalErrors.editUserBranch ? 'border-red-500' : 'border-gray-300'}`} value={editUserData.branchId} onChange={(event) => setEditUserData({ ...editUserData, branchId: event.target.value })}>
                        <option value="">Select Branch</option>
                        {companyBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>)}
                      </select>
                      {editModalErrors.editUserBranch && <p className="mt-1 text-sm text-red-600">{editModalErrors.editUserBranch}</p>}
                    </div>
                  )}
                  <label className="flex items-center gap-2 md:col-span-2">
                    <input type="checkbox" checked={editUserData.isActive} onChange={(event) => setEditUserData({ ...editUserData, isActive: event.target.checked })} className="h-4 w-4 text-primary-600" />
                    <span className="text-sm font-medium text-gray-700">Active user</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t px-5 py-4">
                <Button type="button" variant="secondary" onClick={closeEditModals} disabled={isSavingEditModal}>Cancel</Button>
                <Button type="button" onClick={saveUserEditor} disabled={isSavingEditModal}>{isSavingEditModal ? 'Saving...' : 'Save User'}</Button>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-3 sticky bottom-0 bg-white py-4 border-t">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Company'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => handleOpenFullForm('/companies')} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
      {dialogNode}
    </div>
  );
}
