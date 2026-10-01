import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useAuth } from '../contexts/AuthContext';
import { getOutlets, createOutlet, updateOutlet, deleteOutlet, getCompanies } from '../services/api';
import { Plus, Pencil, Trash2, Store, Search } from 'lucide-react';
import { toast } from 'sonner';

const Outlets = () => {
  const { user } = useAuth();
  const [outlets, setOutlets] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [formData, setFormData] = useState({
    company_id: '',
    outlet_name: '',
    display_company_name: '',
    city: '',
    area: '',
    outlet_code: '',
    address: '',
    can_customize_template: false,
  });

  const fetchData = async () => {
    try {
      const [outletsData, companiesData] = await Promise.all([
        getOutlets(),
        user?.role === 'super_admin' ? getCompanies() : Promise.resolve([])
      ]);
      setOutlets(outletsData);
      setCompanies(companiesData);
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
      if (editingOutlet) {
        await updateOutlet(editingOutlet.outlet_id, formData);
        toast.success('Outlet updated successfully');
      } else {
        await createOutlet(formData);
        toast.success('Outlet created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleEdit = (outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      company_id: outlet.company_id || '',
      outlet_name: outlet.outlet_name || '',
      display_company_name: outlet.display_company_name || '',
      city: outlet.city || '',
      area: outlet.area || '',
      outlet_code: outlet.outlet_code || '',
      address: outlet.address || '',
      can_customize_template: outlet.can_customize_template ?? false,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (outletId) => {
    if (window.confirm('Are you sure you want to deactivate this outlet?')) {
      try {
        await deleteOutlet(outletId);
        toast.success('Outlet deactivated');
        fetchData();
      } catch (error) {
        toast.error('Failed to deactivate outlet');
      }
    }
  };

  const resetForm = () => {
    setEditingOutlet(null);
    setFormData({
      company_id: user?.role !== 'super_admin' ? user?.company_id || '' : '',
      outlet_name: '',
      display_company_name: '',
      city: '',
      area: '',
      outlet_code: '',
      address: '',
      can_customize_template: false,
    });
  };

  const filteredOutlets = outlets.filter(o => {
    const matchesSearch = o.outlet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = filterCompany === 'all' || o.company_id === filterCompany;
    return matchesSearch && matchesCompany;
  });

  return (
    <DashboardLayout title="Outlets">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search outlets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="search-outlets"
              />
            </div>
            {user?.role === 'super_admin' && companies.length > 0 && (
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-[200px]" data-testid="filter-company">
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
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="add-outlet-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Outlet
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredOutlets.length === 0 ? (
              <div className="p-8 text-center">
                <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No outlets found</p>
              </div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Outlet Name</TableHead>
                    <TableHead>Display Company</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Template Override</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutlets.map((outlet) => (
                    <TableRow key={outlet.outlet_id} data-testid={`outlet-row-${outlet.outlet_id}`}>
                      <TableCell className="font-medium">{outlet.outlet_name}</TableCell>
                      <TableCell>{outlet.display_company_name || '-'}</TableCell>
                      <TableCell>{outlet.city}{outlet.area && `, ${outlet.area}`}</TableCell>
                      <TableCell className="font-mono text-sm">{outlet.outlet_code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={outlet.can_customize_template ? 'status-active' : 'status-inactive'}>
                          {outlet.can_customize_template ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={outlet.is_active ? 'status-active' : 'status-inactive'}>
                          {outlet.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(outlet)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(outlet.outlet_id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOutlet ? 'Edit Outlet' : 'Add Outlet'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {user?.role === 'super_admin' && (
              <div className="space-y-2">
                <Label>Company *</Label>
                <Select 
                  value={formData.company_id} 
                  onValueChange={(v) => setFormData({ ...formData, company_id: v })}
                  required
                >
                  <SelectTrigger data-testid="select-company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.company_id} value={c.company_id}>{c.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="outlet_name">Outlet Name *</Label>
                <Input
                  id="outlet_name"
                  value={formData.outlet_name}
                  onChange={(e) => setFormData({ ...formData, outlet_name: e.target.value })}
                  required
                  data-testid="input-outlet-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outlet_code">Outlet Code *</Label>
                <Input
                  id="outlet_code"
                  value={formData.outlet_code}
                  onChange={(e) => setFormData({ ...formData, outlet_code: e.target.value })}
                  required
                  data-testid="input-outlet-code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_company_name">Display Company Name (Franchise)</Label>
              <Input
                id="display_company_name"
                value={formData.display_company_name}
                onChange={(e) => setFormData({ ...formData, display_company_name: e.target.value })}
                placeholder="Different from parent company"
                data-testid="input-display-company"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Area</Label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  data-testid="input-area"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid="input-address"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="can_customize">Can Customize Template</Label>
              <Switch
                id="can_customize"
                checked={formData.can_customize_template}
                onCheckedChange={(checked) => setFormData({ ...formData, can_customize_template: checked })}
                data-testid="switch-customize-template"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-outlet">
                {editingOutlet ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Outlets;
