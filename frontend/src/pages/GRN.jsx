import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { getGRNList, createGRN, getItems, getOutlets, getVendors } from '../services/api';
import { FileInput, Plus, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const GRN = () => {
  const [grnList, setGrnList] = useState([]);
  const [items, setItems] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewGrn, setViewGrn] = useState(null);
  const [formData, setFormData] = useState({
    outlet_id: '',
    vendor_id: '',
    items: [],
    notes: '',
  });
  const [currentItem, setCurrentItem] = useState({ item_id: '', size: '', quantity: 1 });

  const fetchData = async () => {
    try {
      const [grnData, itemsData, outletsData, vendorsData] = await Promise.all([
        getGRNList(),
        getItems(),
        getOutlets(),
        getVendors()
      ]);
      setGrnList(grnData);
      setItems(itemsData);
      setOutlets(outletsData);
      setVendors(vendorsData);
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
      await createGRN(formData);
      toast.success('GRN created successfully');
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
    setCurrentItem({ item_id: '', size: '', quantity: 1 });
  };

  const removeItem = (idx) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx)
    });
  };

  const resetForm = () => {
    setFormData({ outlet_id: '', vendor_id: '', items: [], notes: '' });
    setCurrentItem({ item_id: '', size: '', quantity: 1 });
  };

  const getItemName = (itemId) => items.find(i => i.item_id === itemId)?.item_name || itemId;
  const getOutletName = (outletId) => outlets.find(o => o.outlet_id === outletId)?.outlet_name || outletId;
  const getVendorName = (vendorId) => vendors.find(v => v.vendor_id === vendorId)?.vendor_name || vendorId;
  const selectedItem = items.find(i => i.item_id === currentItem.item_id);

  return (
    <DashboardLayout title="Stock Receive (GRN)">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="create-grn-btn">
            <Plus className="w-4 h-4 mr-2" />Create GRN
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : grnList.length === 0 ? (
              <div className="p-8 text-center"><FileInput className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No GRN records</p></div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grnList.map((grn) => (
                    <TableRow key={grn.grn_id}>
                      <TableCell className="font-mono text-sm">{grn.grn_id}</TableCell>
                      <TableCell>{new Date(grn.received_at).toLocaleDateString()}</TableCell>
                      <TableCell>{getOutletName(grn.outlet_id)}</TableCell>
                      <TableCell>{getVendorName(grn.vendor_id)}</TableCell>
                      <TableCell className="text-right font-mono">{grn.total_quantity}</TableCell>
                      <TableCell className="text-right font-mono">₹{grn.total_value?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setViewGrn(grn)}><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create GRN Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create GRN</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Outlet *</Label>
                <Select value={formData.outlet_id} onValueChange={(v) => setFormData({ ...formData, outlet_id: v })} required>
                  <SelectTrigger data-testid="select-grn-outlet"><SelectValue placeholder="Select outlet" /></SelectTrigger>
                  <SelectContent>{outlets.map((o) => (<SelectItem key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select value={formData.vendor_id} onValueChange={(v) => setFormData({ ...formData, vendor_id: v })} required>
                  <SelectTrigger data-testid="select-grn-vendor"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>{vendors.map((v) => (<SelectItem key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</SelectItem>))}</SelectContent>
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
                  <Input type="number" min="1" value={currentItem.quantity} onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })} placeholder="Qty" />
                  <Button type="button" onClick={addItem} disabled={!currentItem.item_id}>Add</Button>
                </div>
                {formData.items.length > 0 && (
                  <div className="border rounded-sm divide-y">
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
              <Button type="submit" data-testid="submit-grn">Create GRN</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View GRN Dialog */}
      <Dialog open={!!viewGrn} onOpenChange={() => setViewGrn(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>GRN Details</DialogTitle></DialogHeader>
          {viewGrn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">GRN ID:</span> <span className="font-mono">{viewGrn.grn_id}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(viewGrn.received_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Outlet:</span> {getOutletName(viewGrn.outlet_id)}</div>
                <div><span className="text-muted-foreground">Vendor:</span> {getVendorName(viewGrn.vendor_id)}</div>
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
                    {viewGrn.items?.map((item, idx) => (
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
                <span className="font-mono">{viewGrn.total_quantity} items | ₹{viewGrn.total_value?.toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GRN;
