import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../services/api';
import { Plus, Pencil, Trash2, Building2, Search } from 'lucide-react';
import { toast } from 'sonner';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    legal_name: '',
    display_name: '',
    address: '',
    gst_number: '',
    cin_number: '',
    email: '',
    terms_conditions: '',
    allow_outlet_template_override: true,
  });

  const fetchCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (error) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.company_id, formData);
        toast.success('Company updated successfully');
      } else {
        await createCompany(formData);
        toast.success('Company created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      legal_name: company.legal_name || '',
      display_name: company.display_name || '',
      address: company.address || '',
      gst_number: company.gst_number || '',
      cin_number: company.cin_number || '',
      email: company.email || '',
      terms_conditions: company.terms_conditions || '',
      allow_outlet_template_override: company.allow_outlet_template_override ?? true,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (companyId) => {
    if (window.confirm('Are you sure you want to deactivate this company?')) {
      try {
        await deleteCompany(companyId);
        toast.success('Company deactivated');
        fetchCompanies();
      } catch (error) {
        toast.error('Failed to deactivate company');
      }
    }
  };

  const resetForm = () => {
    setEditingCompany(null);
    setFormData({
      legal_name: '',
      display_name: '',
      address: '',
      gst_number: '',
      cin_number: '',
      email: '',
      terms_conditions: '',
      allow_outlet_template_override: true,
    });
  };

  const filteredCompanies = companies.filter(c => 
    c.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Companies">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="search-companies"
            />
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="add-company-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No companies found</p>
                <Button variant="link" onClick={() => { resetForm(); setDialogOpen(true); }}>
                  Create your first company
                </Button>
              </div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Legal Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>GST</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.company_id} data-testid={`company-row-${company.company_id}`}>
                      <TableCell className="font-medium">{company.legal_name}</TableCell>
                      <TableCell>{company.display_name}</TableCell>
                      <TableCell className="font-mono text-sm">{company.gst_number || '-'}</TableCell>
                      <TableCell>{company.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={company.is_active ? 'status-active' : 'status-inactive'}>
                          {company.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(company)} data-testid={`edit-company-${company.company_id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(company.company_id)} data-testid={`delete-company-${company.company_id}`}>
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
            <DialogTitle>{editingCompany ? 'Edit Company' : 'Add Company'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legal_name">Legal Name *</Label>
                <Input
                  id="legal_name"
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  required
                  data-testid="input-legal-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name *</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                  data-testid="input-display-name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  data-testid="input-gst"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cin_number">CIN Number</Label>
                <Input
                  id="cin_number"
                  value={formData.cin_number}
                  onChange={(e) => setFormData({ ...formData, cin_number: e.target.value })}
                  data-testid="input-cin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                data-testid="input-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={formData.terms_conditions}
                onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                rows={3}
                data-testid="input-terms"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="template_override">Allow Outlet Template Override</Label>
              <Switch
                id="template_override"
                checked={formData.allow_outlet_template_override}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_outlet_template_override: checked })}
                data-testid="switch-template-override"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="submit-company">
                {editingCompany ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Companies;
