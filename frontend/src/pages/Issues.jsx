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
import { getIssues, createIssue, getItems, getOutlets, getStaff, getInventory } from '../services/api';
import { FileOutput, Plus, Eye, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Issues = () => {
  const [issues, setIssues] = useState([]);
  const [items, setItems] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewIssue, setViewIssue] = useState(null);
  const [formData, setFormData] = useState({
    outlet_id: '',
    staff_id: '',
    items: [],
    notes: '',
  });
  const [currentItem, setCurrentItem] = useState({ item_id: '', size: '', quantity: 1 });

  const fetchData = async () => {
    try {
      const [issuesData, itemsData, outletsData, staffData, invData] = await Promise.all([
        getIssues(),
        getItems(),
        getOutlets(),
        getStaff(),
        getInventory()
      ]);
      setIssues(issuesData);
      setItems(itemsData);
      setOutlets(outletsData);
      setStaff(staffData);
      setInventory(invData);
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
      await createIssue(formData);
      toast.success('Issue created successfully');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed');
    }
  };

  const getAvailableStock = (itemId, size, outletId) => {
    const inv = inventory.find(i => 
      i.item_id === itemId && 
      i.outlet_id === outletId && 
      (size ? i.size === size : !i.size)
    );
    return inv?.current_stock || 0;
  };

  const addItem = () => {
    if (!currentItem.item_id || currentItem.quantity < 1) return;
    const stock = getAvailableStock(currentItem.item_id, currentItem.size, formData.outlet_id);
    if (currentItem.quantity > stock) {
      toast.error(`Only ${stock} available in stock`);
      return;
    }
    setFormData({
      ...formData,
      items: [...formData.items, { ...currentItem }]
    });
    setCurrentItem({ item_id: '', size: '', quantity: 1 });
  };

  const removeItem = (idx) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx)
    });
  };

  const resetForm = () => {
    setFormData({ outlet_id: '', staff_id: '', items: [], notes: '' });
    setCurrentItem({ item_id: '', size: '', quantity: 1 });
  };

  const getItemName = (itemId) => items.find(i => i.item_id === itemId)?.item_name || itemId;
  const getOutletName = (outletId) => outlets.find(o => o.outlet_id === outletId)?.outlet_name || outletId;
  const getStaffName = (staffId) => staff.find(s => s.staff_id === staffId)?.name || staffId;
  const selectedItem = items.find(i => i.item_id === currentItem.item_id);
  const filteredStaff = formData.outlet_id ? staff.filter(s => s.outlet_id === formData.outlet_id) : staff;

  return (
    <DashboardLayout title="Issue">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="create-issue-btn">
            <Plus className="w-4 h-4 mr-2" />New Issue
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : issues.length === 0 ? (
              <div className="p-8 text-center"><FileOutput className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No issues recorded</p></div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => (
                    <TableRow key={issue.issue_id}>
                      <TableCell className="font-mono text-sm">{issue.issue_id}</TableCell>
                      <TableCell>{new Date(issue.issued_at).toLocaleDateString()}</TableCell>
                      <TableCell>{getOutletName(issue.outlet_id)}</TableCell>
                      <TableCell>{getStaffName(issue.staff_id)}</TableCell>
                      <TableCell className="text-right font-mono">{issue.total_items}</TableCell>
                      <TableCell className="text-right font-mono">₹{issue.total_value?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setViewIssue(issue)}><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Issue Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Issue</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Outlet *</Label>
                <Select value={formData.outlet_id} onValueChange={(v) => setFormData({ ...formData, outlet_id: v, staff_id: '' })} required>
                  <SelectTrigger data-testid="select-issue-outlet"><SelectValue placeholder="Select outlet" /></SelectTrigger>
                  <SelectContent>{outlets.map((o) => (<SelectItem key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Staff *</Label>
                <Select value={formData.staff_id} onValueChange={(v) => setFormData({ ...formData, staff_id: v })} required disabled={!formData.outlet_id}>
                  <SelectTrigger data-testid="select-issue-staff"><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>{filteredStaff.map((s) => (<SelectItem key={s.staff_id} value={s.staff_id}>{s.name} ({s.staff_code})</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">Add Items</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
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
                  <div className="relative">
                    <Input type="number" min="1" value={currentItem.quantity} onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })} placeholder="Qty" />
                    {currentItem.item_id && formData.outlet_id && (
                      <span className="absolute -bottom-5 left-0 text-xs text-muted-foreground">
                        Stock: {getAvailableStock(currentItem.item_id, currentItem.size, formData.outlet_id)}
                      </span>
                    )}
                  </div>
                  <Button type="button" onClick={addItem} disabled={!currentItem.item_id || !formData.outlet_id}>Add</Button>
                </div>
                {formData.items.length > 0 && (
                  <div className="border rounded-sm divide-y mt-6">
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 text-sm">
                        <span>{getItemName(item.item_id)} {item.size && `(${item.size})`}</span>
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
              <Button type="submit" data-testid="submit-issue">Create Issue</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Issue Dialog */}
      <Dialog open={!!viewIssue} onOpenChange={() => setViewIssue(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Details</DialogTitle></DialogHeader>
          {viewIssue && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Issue ID:</span> <span className="font-mono">{viewIssue.issue_id}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(viewIssue.issued_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Outlet:</span> {getOutletName(viewIssue.outlet_id)}</div>
                <div><span className="text-muted-foreground">Staff:</span> {getStaffName(viewIssue.staff_id)}</div>
              </div>
              <div className="border rounded-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewIssue.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{getItemName(item.item_id)}</TableCell>
                        <TableCell>{item.size || '-'}</TableCell>
                        <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between p-3 border rounded-sm bg-muted/30">
                <span className="font-medium">Total</span>
                <span className="font-mono">{viewIssue.total_items} items | ₹{viewIssue.total_value?.toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Issues;
