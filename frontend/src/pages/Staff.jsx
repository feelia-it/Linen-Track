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
import { getStaff, createStaff, updateStaff, deleteStaff, getOutlets } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Pencil, Trash2, UserCircle, Search, Flag } from 'lucide-react';
import { toast } from 'sonner';

const DEPARTMENTS = ['HOH', 'FOH', 'Admin', 'Security', 'Housekeeping', 'Other'];

const Staff = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOutlet, setFilterOutlet] = useState('all');
  const [formData, setFormData] = useState({
    outlet_id: '',
    staff_code: '',
    name: '',
    department: 'FOH',
    designation: '',
    phone: '',
    email: '',
    joining_date: '',
  });

  const fetchData = async () => {
    try {
      const [staffData, outletsData] = await Promise.all([
        getStaff(),
        getOutlets()
      ]);
      setStaff(staffData);
      setOutlets(outletsData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await updateStaff(editingStaff.staff_id, formData);
        toast.success('Staff updated');
      } else {
        await createStaff(formData);
        toast.success('Staff created');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleEdit = (s) => {
    setEditingStaff(s);
    setFormData({
      outlet_id: s.outlet_id || '',
      staff_code: s.staff_code || '',
      name: s.name || '',
      department: s.department || 'FOH',
      designation: s.designation || '',
      phone: s.phone || '',
      email: s.email || '',
      joining_date: s.joining_date || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (staffId) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteStaff(staffId);
        toast.success('Staff deactivated');
        fetchData();
      } catch (error) {
        toast.error('Failed');
      }
    }
  };

  const resetForm = () => {
    setEditingStaff(null);
    setFormData({ outlet_id: '', staff_code: '', name: '', department: 'FOH', designation: '', phone: '', email: '', joining_date: '' });
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.staff_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOutlet = filterOutlet === 'all' || s.outlet_id === filterOutlet;
    return matchesSearch && matchesOutlet;
  });

  return (
    <DashboardLayout title="Staff">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" data-testid="search-staff" />
            </div>
            {outlets.length > 0 && (
              <Select value={filterOutlet} onValueChange={setFilterOutlet}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by outlet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outlets</SelectItem>
                  {outlets.map((o) => (<SelectItem key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="add-staff-btn">
            <Plus className="w-4 h-4 mr-2" />Add Staff
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-8 text-center"><UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No staff found</p></div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((s) => (
                    <TableRow key={s.staff_id} data-testid={`staff-row-${s.staff_id}`}>
                      <TableCell className="font-mono text-sm">{s.staff_code}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {s.name}
                          {s.is_flagged && <Flag className="w-4 h-4 text-destructive" title={s.flag_reason} />}
                        </div>
                      </TableCell>
                      <TableCell>{s.department}</TableCell>
                      <TableCell>{outlets.find(o => o.outlet_id === s.outlet_id)?.outlet_name || '-'}</TableCell>
                      <TableCell>{s.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={s.is_flagged ? 'status-flagged' : s.is_active ? 'status-active' : 'status-inactive'}>
                          {s.is_flagged ? 'Flagged' : s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.staff_id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editingStaff ? 'Edit Staff' : 'Add Staff'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Outlet *</Label>
              <Select value={formData.outlet_id} onValueChange={(v) => setFormData({ ...formData, outlet_id: v })} required>
                <SelectTrigger data-testid="select-staff-outlet"><SelectValue placeholder="Select outlet" /></SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => (<SelectItem key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Staff Code *</Label><Input value={formData.staff_code} onChange={(e) => setFormData({ ...formData, staff_code: e.target.value })} required data-testid="input-staff-code" /></div>
              <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="input-staff-name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Designation</Label><Input value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Joining Date</Label><Input type="date" value={formData.joining_date} onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-staff">{editingStaff ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Staff;
