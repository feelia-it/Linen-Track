import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { getVendors, createVendor, updateVendor, deleteVendor, getCompanies } from '../services/api';
import { Plus, Pencil, Trash2, Truck, Search } from 'lucide-react';
import { toast } from 'sonner';

const Vendors = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    company_id: '',
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    gst_number: '',
  });

  const fetchData = async () => {
    try {
      const [vendorsData, companiesData] = await Promise.all([
        getVendors(),
        user?.role === 'super_admin' ? getCompanies() : Promise.resolve([])
      ]);
      setVendors(vendorsData);
      setCompanies(companiesData);
    } catch (error) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate company_id for super_admin
    if (user?.role === 'super_admin' && !editingVendor && !formData.company_id) {
      toast.error('Please select a company');
      return;
    }
    
    try {
      if (editingVendor) {
        await updateVendor(editingVendor.vendor_id, formData);
        toast.success('Vendor updated');
      } else {
        await createVendor(formData);
        toast.success('Vendor created');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      company_id: vendor.company_id || '',
      vendor_name: vendor.vendor_name || '',
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      gst_number: vendor.gst_number || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (vendorId) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteVendor(vendorId);
        toast.success('Vendor deactivated');
        fetchData();
      } catch (error) {
        toast.error('Failed to deactivate');
      }
    }
  };

  const resetForm = () => {
    setEditingVendor(null);
    setFormData({ 
      company_id: user?.company_id || '', 
      vendor_name: '', 
      contact_person: '', 
      email: '', 
      phone: '', 
      address: '', 
      gst_number: '' 
    });
  };

  const filteredVendors = vendors.filter(v => 
    v.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCompanyName = (companyId) => {
    return companies.find(c => c.company_id === companyId)?.display_name || companyId;
  };

  return (
    <DashboardLayout title="Vendors">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search vendors..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9" 
              data-testid="search-vendors" 
            />
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="add-vendor-btn">
            <Plus className="w-4 h-4 mr-2" />Add Vendor
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="p-8 text-center">
                <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No vendors found</p>
                <Button variant="link" onClick={() => { resetForm(); setDialogOpen(true); }}>
                  Add your first vendor
                </Button>
              </div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    {user?.role === 'super_admin' && <TableHead>Company</TableHead>}
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>GST</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((v) => (
                    <TableRow key={v.vendor_id} data-testid={`vendor-row-${v.vendor_id}`}>
                      <TableCell className="font-medium">{v.vendor_name}</TableCell>
                      {user?.role === 'super_admin' && <TableCell>{getCompanyName(v.company_id)}</TableCell>}
                      <TableCell>{v.contact_person || '-'}</TableCell>
                      <TableCell>{v.phone || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{v.gst_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={v.is_active ? 'status-active' : 'status-inactive'}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(v)} data-testid={`edit-vendor-${v.vendor_id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(v.vendor_id)} data-testid={`delete-vendor-${v.vendor_id}`}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {user?.role === 'super_admin' && !editingVendor && (
              <div className="space-y-2">
                <Label>Company *</Label>
                <Select 
                  value={formData.company_id} 
                  onValueChange={(v) => setFormData({ ...formData, company_id: v })}
                  required
                >
                  <SelectTrigger data-testid="select-vendor-company">
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
            
            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor Name *</Label>
              <Input 
                id="vendor_name" 
                value={formData.vendor_name} 
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })} 
                required 
                data-testid="input-vendor-name" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input 
                  value={formData.contact_person} 
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} 
                  data-testid="input-contact-person"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  data-testid="input-phone"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input 
                value={formData.gst_number} 
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })} 
                data-testid="input-gst"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={formData.address} 
                onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                data-testid="input-address"
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-vendor">{editingVendor ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Vendors;
