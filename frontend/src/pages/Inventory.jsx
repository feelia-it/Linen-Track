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
import { getInventory, setOpeningStock, getItems, getOutlets } from '../services/api';
import { Boxes, Search, AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [items, setItems] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOutlet, setFilterOutlet] = useState('all');
  const [formData, setFormData] = useState({
    outlet_id: '',
    item_id: '',
    size: '',
    opening_stock: 0,
  });

  const fetchData = async () => {
    try {
      const [invData, itemsData, outletsData] = await Promise.all([
        getInventory(),
        getItems(),
        getOutlets()
      ]);
      setInventory(invData);
      setItems(itemsData);
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

  const handleSetOpening = async (e) => {
    e.preventDefault();
    try {
      await setOpeningStock(formData);
      toast.success('Opening stock set');
      setDialogOpen(false);
      setFormData({ outlet_id: '', item_id: '', size: '', opening_stock: 0 });
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed');
    }
  };

  const getItemName = (itemId) => items.find(i => i.item_id === itemId)?.item_name || itemId;
  const getOutletName = (outletId) => outlets.find(o => o.outlet_id === outletId)?.outlet_name || outletId;
  const selectedItem = items.find(i => i.item_id === formData.item_id);

  const filteredInventory = inventory.filter(inv => {
    const itemName = getItemName(inv.item_id)?.toLowerCase() || '';
    const matchesSearch = itemName.includes(searchTerm.toLowerCase());
    const matchesOutlet = filterOutlet === 'all' || inv.outlet_id === filterOutlet;
    return matchesSearch && matchesOutlet;
  });

  const lowStockCount = inventory.filter(i => i.current_stock < 5).length;

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6">
        {lowStockCount > 0 && (
          <Card className="border-warning bg-warning/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span className="text-sm font-medium">{lowStockCount} items are low on stock</span>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search inventory..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" data-testid="search-inventory" />
            </div>
            {outlets.length > 0 && (
              <Select value={filterOutlet} onValueChange={setFilterOutlet}>
                <SelectTrigger className="w-[200px]" data-testid="filter-outlet"><SelectValue placeholder="Filter by outlet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outlets</SelectItem>
                  {outlets.map((o) => (<SelectItem key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="set-opening-btn">
            <Plus className="w-4 h-4 mr-2" />Set Opening Stock
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-8 text-center"><Boxes className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No inventory records found</p></div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">Returned</TableHead>
                    <TableHead className="text-right">Lost/Discard</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((inv) => (
                    <TableRow key={inv.inventory_id} data-testid={`inventory-row-${inv.inventory_id}`}>
                      <TableCell className="font-medium">{getItemName(inv.item_id)}</TableCell>
                      <TableCell>{getOutletName(inv.outlet_id)}</TableCell>
                      <TableCell>{inv.size || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{inv.opening_stock}</TableCell>
                      <TableCell className="text-right font-mono text-success">+{inv.received}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">-{inv.issued}</TableCell>
                      <TableCell className="text-right font-mono text-info">+{inv.returned}</TableCell>
                      <TableCell className="text-right font-mono text-warning">-{(inv.discarded || 0) + (inv.lost || 0)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={inv.current_stock < 5 ? 'status-warning' : 'status-active'}>
                          {inv.current_stock}
                        </Badge>
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
          <DialogHeader><DialogTitle>Set Opening Stock</DialogTitle></DialogHeader>
          <form onSubmit={handleSetOpening} className="space-y-4">
            <div className="space-y-2">
              <Label>Outlet *</Label>
              <Select value={formData.outlet_id} onValueChange={(v) => setFormData({ ...formData, outlet_id: v })} required>
                <SelectTrigger data-testid="select-inv-outlet"><SelectValue placeholder="Select outlet" /></SelectTrigger>
                <SelectContent>{outlets.map((o) => (<SelectItem key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select value={formData.item_id} onValueChange={(v) => setFormData({ ...formData, item_id: v, size: '' })} required>
                <SelectTrigger data-testid="select-inv-item"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{items.map((i) => (<SelectItem key={i.item_id} value={i.item_id}>{i.item_name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {selectedItem?.enable_size_tracking && selectedItem?.sizes_available?.length > 0 && (
              <div className="space-y-2">
                <Label>Size</Label>
                <Select value={formData.size} onValueChange={(v) => setFormData({ ...formData, size: v })}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>{selectedItem.sizes_available.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Opening Stock *</Label>
              <Input type="number" min="0" value={formData.opening_stock} onChange={(e) => setFormData({ ...formData, opening_stock: parseInt(e.target.value) || 0 })} required data-testid="input-opening-stock" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-opening">Set Stock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Inventory;
