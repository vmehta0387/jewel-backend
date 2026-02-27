import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';
import api from '../../services/api';
import { getStoredUser } from '../../utils/auth';

export default function CompaniesPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};

      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/companies', { params });
      setCompanies(response.data.data || []);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [searchTerm]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const columns = [
    { key: 'companyCode', label: 'Code' },
    { key: 'companyName', label: 'Company Name' },
    {
      key: 'accountManager',
      label: 'Account Manager',
      render: (_: any, row: any) => (
        <span>{row.accountManager ? `${row.accountManager.firstName} ${row.accountManager.lastName}` : '-'}</span>
      ),
    },
    {
      key: 'city',
      label: 'Location',
      render: (val: string, row: any) => <span>{val ? `${val}, ${row.country || ''}` : '-'}</span>,
    },
    {
      key: 'defaultMultiplier',
      label: 'Default Multiplier',
      render: (val: number) => `${val}x`,
    },
    {
      key: 'branchCount',
      label: 'Total Branches',
      render: (val: number) => <span>{val ?? 0}</span>,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (val: boolean) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            val ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  if (isSuperAdmin) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/companies/edit/${row.id}`)}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={async () => {
              try {
                await api.patch(`/companies/${row.id}/status`, { isActive: !row.isActive });
                fetchCompanies();
              } catch (error) {
                console.error(error);
              }
            }}
            className={`text-sm font-medium ${
              row.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
            }`}
          >
            {row.isActive ? 'Disable' : 'Enable'}
          </button>
        </div>
      ),
    });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-600 mt-1">
            {isSuperAdmin
              ? 'Manage your jewelry company partners'
              : 'View companies assigned to you'}
          </p>
        </div>
        {isSuperAdmin && <Button onClick={() => navigate('/companies/add')}>+ Add Company</Button>}
      </div>

      <Card className="mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by company name, code, city, country, or account manager"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Search
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={handleClearSearch}>
              Clear
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Company Directory</h2>
          <span className="text-xs text-gray-600">
            {companies.length} record{companies.length === 1 ? '' : 's'}
          </span>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No companies found for selected filters.</div>
        ) : (
          <Table columns={columns} data={companies} />
        )}
      </Card>
    </div>
  );
}
