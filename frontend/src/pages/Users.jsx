import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth } from '../contexts/AuthContext';
import { getUsers, updateUser, getCompanies, getOutlets } from '../services/api';
import { Users as UsersIcon, Pencil, Search, Shield, Building2, Store, UserCheck, UserX, Info } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = [
  { 
    value: 'super_admin', 
    label: 'Super Admin', 
    description: 'Full access to all companies, outlets, and system settings',
    color: 'bg-red-500/10 text-red-600 border-red-500/20'
  },
  { 
    value: 'company_admin', 
    label: 'Company Admin', 
    description: 'Manage all outlets, users, and inventory within their company',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
  },
  { 
    value: 'company_manager', 
    label: 'Company Manager', 
    description: 'Manage items, vendors, staff, and inventory operations',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  },
  { 
    value: 'outlet_manager', 
    label: 'Outlet Manager', 
    description: 'Manage staff and operations within assigned outlets',
    color: 'bg-green-500/10 text-green-600 border-green-500/20'
  },
  { 
    value: 'issuer', 
    label: 'Issuer', 
    description: 'Issue, return, and track inventory at assigned outlets',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  },
  { 
    value: 'auditor', 
    label: 'Auditor', 
    description: 'View-only access to all reports and activity logs',
    color: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
  },
];

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleInfoOpen, setRoleInfoOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [formData, setFormData] = useState({
    role: 'issuer',
    company_id: '',
    outlet_ids: [],
    is_active: true,
  });

  const fetchData = async () => {
    try {
      const [usersData, companiesData, outletsData] = await Promise.all([
        getUsers(),
        user?.role === 'super_admin' ? getCompanies() : Promise.resolve([]),
        getOutlets()
      ]);
      setUsers(usersData);
      setCompanies(companiesData);
      setOutlets(outletsData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUser(editingUser.user_id, formData);
      toast.success('User updated successfully');
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleEdit = (u) => {
    setEditingUser(u);
    setFormData({
      role: u.role || 'issuer',
      company_id: u.company_id || '',
      outlet_ids: u.outlet_ids || [],
      is_active: u.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const toggleOutlet = (outletId) => {
    if (formData.outlet_ids.includes(outletId)) {
      setFormData({ ...formData, outlet_ids: formData.outlet_ids.filter(id => id !== outletId) });
    } else {
      setFormData({ ...formData, outlet_ids: [...formData.outlet_ids, outletId] });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesCompany = filterCompany === 'all' || u.company_id === filterCompany;
    return matchesSearch && matchesRole && matchesCompany;
  });

  const availableRoles = user?.role === 'super_admin' ? ROLES : ROLES.filter(r => r.value !== 'super_admin');
  const filteredOutlets = formData.company_id 
    ? outlets.filter(o => o.company_id === formData.company_id) 
    : outlets;

  const getRoleInfo = (roleValue) => ROLES.find(r => r.value === roleValue);

  const usersByRole = ROLES.map(role => ({
    role: role.value,
    count: users.filter(u => u.role === role.value).length
  }));

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        {/* Role Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {usersByRole.map(({ role, count }) => {
            const roleInfo = getRoleInfo(role);
            return (
              <Card 
                key={role} 
                className={`cursor-pointer transition-all hover:shadow-md ${filterRole === role ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setFilterRole(filterRole === role ? 'all' : role)}
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{roleInfo?.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="search-users"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px]" data-testid="filter-role">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {user?.role === 'super_admin' && companies.length > 0 && (
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-[180px]" data-testid="filter-company">
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.company_id} value={c.company_id}>{c.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button variant="outline" onClick={() => setRoleInfoOpen(true)} data-testid="role-guide-btn">
            <Info className="w-4 h-4 mr-2" />
            Role Guide
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Outlets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const roleInfo = getRoleInfo(u.role);
                    const userInitials = u.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
                    
                    return (
                      <TableRow key={u.user_id} data-testid={`user-row-${u.user_id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={u.picture} alt={u.name} />
                              <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleInfo?.color}>
                            <Shield className="w-3 h-3 mr-1" />
                            {roleInfo?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.company_id ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              {companies.find(c => c.company_id === u.company_id)?.display_name || u.company_id}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.outlet_ids?.length > 0 ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Store className="w-3 h-3 text-muted-foreground" />
                              {u.outlet_ids.length} outlet{u.outlet_ids.length > 1 ? 's' : ''}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">All</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={u.is_active ? 'status-active' : 'status-inactive'}>
                            {u.is_active ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                            {u.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(u)}
                            disabled={u.role === 'super_admin' && user?.role !== 'super_admin'}
                            data-testid={`edit-user-${u.user_id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
            <DialogDescription>{editingUser?.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3" />
                        {r.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getRoleInfo(formData.role)?.description}
              </p>
            </div>

            {user?.role === 'super_admin' && (
              <div className="space-y-2">
                <Label>Company</Label>
                <Select 
                  value={formData.company_id} 
                  onValueChange={(v) => setFormData({ ...formData, company_id: v, outlet_ids: [] })}
                >
                  <SelectTrigger data-testid="select-user-company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Platform-level)</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.company_id} value={c.company_id}>{c.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filteredOutlets.length > 0 && ['outlet_manager', 'issuer'].includes(formData.role) && (
              <div className="space-y-2">
                <Label>Outlet Access</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select which outlets this user can access. Leave empty for all outlets.
                </p>
                <div className="border rounded-sm p-3 max-h-48 overflow-y-auto space-y-2">
                  {filteredOutlets.map((o) => (
                    <label key={o.outlet_id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                      <Checkbox
                        checked={formData.outlet_ids.includes(o.outlet_id)}
                        onCheckedChange={() => toggleOutlet(o.outlet_id)}
                      />
                      <div className="flex-1">
                        <span className="text-sm">{o.outlet_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{o.city}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.outlet_ids.length === 0 
                    ? 'Access to all outlets' 
                    : `Access to ${formData.outlet_ids.length} outlet(s)`}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.is_active ? 'active' : 'inactive'} 
                onValueChange={(v) => setFormData({ ...formData, is_active: v === 'active' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3 h-3 text-green-600" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <UserX className="w-3 h-3 text-red-600" />
                      Inactive
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-user">Update User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Info Dialog */}
      <Dialog open={roleInfoOpen} onOpenChange={setRoleInfoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Role Permissions Guide</DialogTitle>
            <DialogDescription>
              Understanding access levels in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {ROLES.map((role) => (
              <div key={role.value} className="p-3 border rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={role.color}>
                    <Shield className="w-3 h-3 mr-1" />
                    {role.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setRoleInfoOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Users;
