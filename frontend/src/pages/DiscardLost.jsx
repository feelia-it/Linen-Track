import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { getDiscardLost, createDiscardLost, getItems, getOutlets, getStaff } from '../services/api';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const DiscardLost = () => {
  const [records, setRecords] = useState([]);
  const [items, setItems] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    outlet_id: '',
    staff_id: '',
    item_id: '',
    size: '',
    quantity: 1,
    type: 'discard',
    reason: '',
  });

  const fetchData = async () => {
    try {
      const [recordsData, itemsData, outletsData, staffData] = await Promise.all([
        getDiscardLost(),
        getItems(),
        getOutlets(),
        getStaff()
      ]);
      setRecords(recordsData);
      setItems(itemsData);
      setOutlets(outletsData);
      setStaff(staffData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createDiscardLost(formData);
      toast.success(`${formData.type === 'discard' ? 'Discard' : 'Lost'} recorded`);
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed');
    }
  };

  const resetForm = () => {
    setFormData({ outlet_id: '', staff_id: '', item_id: '', size: '', quantity: 1, type: 'discard', reason: '' });
  };

  const getItemName = (itemId) => items.find(i => i.item_id === itemId)?.item_name || itemId;
  const getOutletName = (outletId) => outlets.find(o => o.outlet_id === outletId)?.outlet_name || outletId;
  const getStaffName = (staffId) => staff.find(s => s.staff_id === staffId)?.name || '-';
  const selectedItem = items.find(i => i.item_id === formData.item_id);
  const filteredStaff = formData.outlet_id ? staff.filter(s => s.outlet_id === formData.outlet_id) : staff;

  const filteredRecords = activeTab === 'all' ? records : records.filter(r => r.type === activeTab);

  const totalLostValue = records.filter(r => r.type === 'lost').reduce((sum, r) => sum + (r.cost_value || 0), 0);

  return (
    <DashboardLayout title="Discard / Lost">
      <div className="space-y-6">
        {totalLostValue > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span className="text-sm font-medium">Total Lost Value</span>
              </div>
              <span className="font-mono text-lg text-destructive">₹{totalLostValue.toLocaleString()}</span>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="discard">Discarded</TabsTrigger>
              <TabsTrigger value="lost">Lost</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="create-record-btn">
            <Plus className="w-4 h-4 mr-2" />Record
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center"><Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No records</p></div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((r) => (
                    <TableRow key={r.record_id}>
                      <TableCell>{new Date(r.recorded_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={r.type === 'lost' ? 'status-flagged' : 'status-warning'}>
                          {r.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getItemName(r.item_id)} {r.size && `(${r.size})`}</TableCell>
                      <TableCell>{getOutletName(r.outlet_id)}</TableCell>
                      <TableCell>{getStaffName(r.staff_id)}</TableCell>
                      <TableCell className="text-right font-mono">{r.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">₹{r.cost_value?.toLocaleString()}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
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
          <DialogHeader><DialogTitle>Record Discard / Lost</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="discard">Discard (Damaged/Worn out)</SelectItem>
                  <SelectItem value="lost">Lost (Missing/Runaway)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Outlet *</Label>
                <Select value={formData.outlet_id} onValueChange={(v) => setFormData({ ...formData, outlet_id: v, staff_id: '' })} required>
                  <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                  <SelectContent>{outlets.map((o) => (<SelectItem key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              {formData.type === 'lost' && (
                <div className="space-y-2">
                  <Label>Staff (if applicable)</Label>
                  <Select value={formData.staff_id} onValueChange={(v) => setFormData({ ...formData, staff_id: v })} disabled={!formData.outlet_id}>
                    <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {filteredStaff.map((s) => (<SelectItem key={s.staff_id} value={s.staff_id}>{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item *</Label>
                <Select value={formData.item_id} onValueChange={(v) => setFormData({ ...formData, item_id: v, size: '' })} required>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>{items.map((i) => (<SelectItem key={i.item_id} value={i.item_id}>{i.item_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              {selectedItem?.enable_size_tracking && (
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Select value={formData.size} onValueChange={(v) => setFormData({ ...formData, size: v })}>
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>{selectedItem.sizes_available?.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })} required />
            </div>

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="Describe why the item is being discarded or lost" required />
            </div>

            {formData.type === 'lost' && formData.staff_id && (
              <div className="p-3 border rounded-sm bg-destructive/5 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2 text-destructive" />
                This will flag the staff member's profile
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-record">Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DiscardLost;
