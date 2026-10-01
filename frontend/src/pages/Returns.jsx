import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { getReturns, createReturn, getItems, getOutlets, getStaff, getIssues } from '../services/api';
import { Undo2, Plus, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CONDITIONS = ['new', 'old', 'damaged'];

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [items, setItems] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewReturn, setViewReturn] = useState(null);
  const [formData, setFormData] = useState({
    outlet_id: '',
    staff_id: '',
    issue_id: '',
    items: [],
    notes: '',
  });
  const [currentItem, setCurrentItem] = useState({ item_id: '', size: '', quantity: 1, condition_after: 'old' });

  const fetchData = async () => {
    try {
      const [returnsData, itemsData, outletsData, staffData, issuesData] = await Promise.all([
        getReturns(),
        getItems(),
        getOutlets(),
        getStaff(),
        getIssues()
      ]);
      setReturns(returnsData);
      setItems(itemsData);
      setOutlets(outletsData);
      setStaff(staffData);
      setIssues(issuesData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    try {
      await createReturn(formData);
      toast.success('Return recorded');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed');
    }
  };

  const addItem = () => {
    if (!currentItem.item_id || currentItem.quantity < 1) return;
    setFormData({
      ...formData,
      items: [...formData.items, { ...currentItem }]
    });
    setCurrentItem({ item_id: '', size: '', quantity: 1, condition_after: 'old' });
  };

  const removeItem = (idx) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx)
    });
  };

  const resetForm = () => {
    setFormData({ outlet_id: '', staff_id: '', issue_id: '', items: [], notes: '' });
    setCurrentItem({ item_id: '', size: '', quantity: 1, condition_after: 'old' });
  };

  const getItemName = (itemId) => items.find(i => i.item_id === itemId)?.item_name || itemId;
  const getOutletName = (outletId) => outlets.find(o => o.outlet_id === outletId)?.outlet_name || outletId;
  const getStaffName = (staffId) => staff.find(s => s.staff_id === staffId)?.name || staffId;
  const selectedItem = items.find(i => i.item_id === currentItem.item_id);
  const filteredStaff = formData.outlet_id ? staff.filter(s => s.outlet_id === formData.outlet_id) : staff;
  const staffIssues = formData.staff_id ? issues.filter(i => i.staff_id === formData.staff_id) : [];

  return (
    <DashboardLayout title="Return">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="create-return-btn">
            <Plus className="w-4 h-4 mr-2" />Record Return
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : returns.length === 0 ? (
              <div className="p-8 text-center"><Undo2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No returns recorded</p></div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Return ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((ret) => (
                    <TableRow key={ret.return_id}>
                      <TableCell className="font-mono text-sm">{ret.return_id}</TableCell>
                      <TableCell>{new Date(ret.returned_at).toLocaleDateString()}</TableCell>
                      <TableCell>{getOutletName(ret.outlet_id)}</TableCell>
                      <TableCell>{getStaffName(ret.staff_id)}</TableCell>
                      <TableCell className="text-right font-mono">{ret.total_items}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setViewReturn(ret)}><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Return Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Record Return</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Outlet *</Label>
                <Select value={formData.outlet_id} onValueChange={(v) => setFormData({ ...formData, outlet_id: v, staff_id: '', issue_id: '' })} required>
                  <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                  <SelectContent>{outlets.map((o) => (<SelectItem key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Staff *</Label>
                <Select value={formData.staff_id} onValueChange={(v) => setFormData({ ...formData, staff_id: v, issue_id: '' })} required disabled={!formData.outlet_id}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{filteredStaff.map((s) => (<SelectItem key={s.staff_id} value={s.staff_id}>{s.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>

            {staffIssues.length > 0 && (
              <div className="space-y-2">
                <Label>Related Issue (Optional)</Label>
                <Select value={formData.issue_id} onValueChange={(v) => setFormData({ ...formData, issue_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select issue" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {staffIssues.map((i) => (<SelectItem key={i.issue_id} value={i.issue_id}>{i.issue_id} - {new Date(i.issued_at).toLocaleDateString()}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">Add Items</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  <Select value={currentItem.item_id} onValueChange={(v) => setCurrentItem({ ...currentItem, item_id: v, size: '' })}>
                    <SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger>
                    <SelectContent>{items.map((i) => (<SelectItem key={i.item_id} value={i.item_id}>{i.item_name}</SelectItem>))}</SelectContent>
                  </Select>
                  {selectedItem?.enable_size_tracking && (
                    <Select value={currentItem.size} onValueChange={(v) => setCurrentItem({ ...currentItem, size: v })}>
                      <SelectTrigger><SelectValue placeholder="Size" /></SelectTrigger>
                      <SelectContent>{selectedItem.sizes_available?.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                    </Select>
                  )}
                  <Input type="number" min="1" value={currentItem.quantity} onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })} placeholder="Qty" />
                  <Select value={currentItem.condition_after} onValueChange={(v) => setCurrentItem({ ...currentItem, condition_after: v })}>
                    <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
                    <SelectContent>{CONDITIONS.map((c) => (<SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>))}</SelectContent>
                  </Select>
                  <Button type="button" onClick={addItem} disabled={!currentItem.item_id}>Add</Button>
                </div>
                {formData.items.length > 0 && (
                  <div className="border rounded-sm divide-y">
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 text-sm">
                        <span>{getItemName(item.item_id)} {item.size && `(${item.size})`} <span className="text-muted-foreground capitalize">- {item.condition_after}</span></span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">x{item.quantity}</span>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-return">Record Return</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Return Dialog */}
      <Dialog open={!!viewReturn} onOpenChange={() => setViewReturn(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return Details</DialogTitle></DialogHeader>
          {viewReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Return ID:</span> <span className="font-mono">{viewReturn.return_id}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(viewReturn.returned_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Outlet:</span> {getOutletName(viewReturn.outlet_id)}</div>
                <div><span className="text-muted-foreground">Staff:</span> {getStaffName(viewReturn.staff_id)}</div>
              </div>
              <div className="border rounded-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewReturn.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{getItemName(item.item_id)}</TableCell>
                        <TableCell>{item.size || '-'}</TableCell>
                        <TableCell className="capitalize">{item.condition_after}</TableCell>
                        <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Returns;
