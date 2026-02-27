import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';
import api from '../../services/api';
import { getStoredUser } from '../../utils/auth';

export default function BranchesPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};

      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/branches', { params });
      setBranches(response.data.data || []);
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
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
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Branch Name' },
    {
      key: 'company',
      label: 'Company',
      render: (_: any, row: any) => <span>{row.company?.companyName || '-'}</span>,
    },
    {
      key: 'city',
      label: 'Location',
      render: (val: string, row: any) => <span>{val ? `${val}, ${row.country || ''}` : '-'}</span>,
    },
    {
      key: 'branchMultiplier',
      label: 'Multiplier',
      render: (val: number) => `${val}x`,
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
            onClick={() => navigate(`/branches/edit/${row.id}`)}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={async () => {
              try {
                await api.patch(`/branches/${row.id}/status`, { isActive: !row.isActive });
                fetchBranches();
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
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-600 mt-1">
            {isSuperAdmin
              ? 'Manage company branches and branch-level pricing multipliers'
              : 'View branches for your assigned companies'}
          </p>
        </div>
        {isSuperAdmin && <Button onClick={() => navigate('/branches/add')}>+ Add Branch</Button>}
      </div>

      <Card className="mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by branch name, code, city, country, or company"
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
          <h2 className="text-base font-semibold text-gray-900">Branch Directory</h2>
          <span className="text-xs text-gray-600">
            {branches.length} record{branches.length === 1 ? '' : 's'}
          </span>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : branches.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No branches found for selected filters.</div>
        ) : (
          <Table columns={columns} data={branches} />
        )}
      </Card>
    </div>
  );
}
