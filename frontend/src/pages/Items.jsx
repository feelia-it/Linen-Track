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
import { getItems, createItem, updateItem, deleteItem, getCompanies, getCategories, getDepartments } from '../services/api';
import { Plus, Pencil, Trash2, Package, Search, X } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = ['Shirts', 'Trousers', 'Chefs Coat', 'Aprons', 'Shoes', 'Towels & Bath', 'Bedding & Linen', 'Table Linen'];
const DEFAULT_DEPARTMENTS = ['FOH', 'BOH', 'HK', 'ADM', 'FNB'];
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const Items = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [categoriesList, setCategoriesList] = useState(DEFAULT_CATEGORIES);
  const [departmentsList, setDepartmentsList] = useState(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    company_id: '',
    item_name: '',
    category: 'Shirts',
    department: 'FOH',
    cost_per_unit: 0,
    enable_size_tracking: true,
    enable_unique_code: false,
    is_reusable: true,
    track_condition: true,
    sizes_available: DEFAULT_SIZES,
    low_stock_threshold: 5,
  });
  const [newSize, setNewSize] = useState('');

  const fetchData = async () => {
    try {
      const [itemsData, companiesData, catsData, deptsData] = await Promise.all([
        getItems(),
        user?.role === 'super_admin' ? getCompanies() : Promise.resolve([]),
        getCategories().catch(() => []),
        getDepartments().catch(() => []),
      ]);
      setItems(itemsData);
      setCompanies(companiesData);
      if (catsData && catsData.length > 0) {
        setCategoriesList(catsData.map(c => c.name));
      }
      if (deptsData && deptsData.length > 0) {
        setDepartmentsList(deptsData.map(d => d.code || d.name));
      }
    } catch (error) {
      toast.error('Failed to load items');
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
      if (editingItem) {
        await updateItem(editingItem.item_id, formData);
        toast.success('Item updated successfully');
      } else {
        await createItem(formData);
        toast.success('Item created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      company_id: item.company_id || '',
      item_name: item.item_name || '',
      category: item.category || 'Shirt',
      department: item.department || 'FOH',
      cost_per_unit: item.cost_per_unit || 0,
      enable_size_tracking: item.enable_size_tracking ?? true,
      enable_unique_code: item.enable_unique_code ?? false,
      is_reusable: item.is_reusable ?? true,
      track_condition: item.track_condition ?? true,
      sizes_available: item.sizes_available || DEFAULT_SIZES,
      low_stock_threshold: item.low_stock_threshold || 5,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to deactivate this item?')) {
      try {
        await deleteItem(itemId);
        toast.success('Item deactivated');
        fetchData();
      } catch (error) {
        toast.error('Failed to deactivate item');
      }
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      company_id: user?.company_id || '',
      item_name: '',
      category: 'Shirt',
      department: 'FOH',
      cost_per_unit: 0,
      enable_size_tracking: true,
      enable_unique_code: false,
      is_reusable: true,
      track_condition: true,
      sizes_available: DEFAULT_SIZES,
      low_stock_threshold: 5,
    });
    setNewSize('');
  };

  const addSize = () => {
    if (newSize && !formData.sizes_available.includes(newSize.toUpperCase())) {
      setFormData({ ...formData, sizes_available: [...formData.sizes_available, newSize.toUpperCase()] });
      setNewSize('');
    }
  };

  const removeSize = (size) => {
    setFormData({ ...formData, sizes_available: formData.sizes_available.filter(s => s !== size) });
  };

  const filteredItems = items.filter(i => {
    const matchesSearch = i.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || i.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout title="Item Master">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="search-items"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]" data-testid="filter-category">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesList.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="add-item-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No items found</p>
              </div>
            ) : (
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Sizes</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.item_id} data-testid={`item-row-${item.item_id}`}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.department}</TableCell>
                      <TableCell className="font-mono">₹{item.cost_per_unit}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.enable_size_tracking && <Badge variant="outline" className="text-xs">Size</Badge>}
                          {item.enable_unique_code && <Badge variant="outline" className="text-xs">Code</Badge>}
                          {item.track_condition && <Badge variant="outline" className="text-xs">Cond</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.enable_size_tracking ? `${item.sizes_available?.length || 0} sizes` : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.item_id)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {user?.role === 'super_admin' && (
              <div className="space-y-2">
                <Label>Company *</Label>
                <Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })} required>
                  <SelectTrigger data-testid="select-item-company">
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
                <Label htmlFor="item_name">Item Name *</Label>
                <Input
                  id="item_name"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  required
                  data-testid="input-item-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost per Unit (₹)</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                  data-testid="input-cost"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesList.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger data-testid="select-department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentsList.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-sm bg-muted/30">
              <h4 className="font-medium text-sm">Tracking Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="size_tracking">Enable Size Tracking</Label>
                  <Switch
                    id="size_tracking"
                    checked={formData.enable_size_tracking}
                    onCheckedChange={(c) => setFormData({ ...formData, enable_size_tracking: c })}
                    data-testid="switch-size-tracking"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="unique_code">Enable Unique Code</Label>
                  <Switch
                    id="unique_code"
                    checked={formData.enable_unique_code}
                    onCheckedChange={(c) => setFormData({ ...formData, enable_unique_code: c })}
                    data-testid="switch-unique-code"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="reusable">Reusable Item</Label>
                  <Switch
                    id="reusable"
                    checked={formData.is_reusable}
                    onCheckedChange={(c) => setFormData({ ...formData, is_reusable: c })}
                    data-testid="switch-reusable"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="condition">Track Condition</Label>
                  <Switch
                    id="condition"
                    checked={formData.track_condition}
                    onCheckedChange={(c) => setFormData({ ...formData, track_condition: c })}
                    data-testid="switch-condition"
                  />
                </div>
              </div>
            </div>

            {formData.enable_size_tracking && (
              <div className="space-y-2">
                <Label>Available Sizes</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-sm min-h-[60px]">
                  {formData.sizes_available.map((size) => (
                    <Badge key={size} variant="secondary" className="gap-1">
                      {size}
                      <button type="button" onClick={() => removeSize(size)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom size"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                    className="flex-1"
                    data-testid="input-new-size"
                  />
                  <Button type="button" variant="outline" onClick={addSize}>Add</Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="threshold">Low Stock Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 0 })}
                data-testid="input-threshold"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-item">
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Items;
