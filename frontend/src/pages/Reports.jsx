import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import { 
  getStockSummaryReport, 
  getIssueReturnReport, 
  getStaffOutstandingReport,
  getOutlets
} from '../services/api';
import { BarChart3, Download, FileSpreadsheet, FileText, Users, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#FF4F00', '#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

const Reports = () => {
  const [activeTab, setActiveTab] = useState('stock');
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stockData, setStockData] = useState([]);
  const [issueReturnData, setIssueReturnData] = useState({ issues: [], returns: [], total_issued: 0, total_returned: 0 });
  const [outstandingData, setOutstandingData] = useState([]);

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const data = await getOutlets();
        setOutlets(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchOutlets();
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const outletId = selectedOutlet === 'all' ? null : selectedOutlet;
        
        switch (activeTab) {
          case 'stock':
            const stock = await getStockSummaryReport(null, outletId);
            setStockData(stock);
            break;
          case 'issue-return':
            const ir = await getIssueReturnReport(null, outletId);
            setIssueReturnData(ir);
            break;
          case 'outstanding':
            const os = await getStaffOutstandingReport(null, outletId);
            setOutstandingData(os);
            break;
        }
      } catch (error) {
        toast.error('Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [activeTab, selectedOutlet]);

  const exportToCSV = (data, filename) => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  // Prepare chart data
  const stockByCategory = stockData.reduce((acc, item) => {
    const cat = item.category || 'Other';
    acc[cat] = (acc[cat] || 0) + (item.current_stock || 0);
    return acc;
  }, {});

  const categoryChartData = Object.entries(stockByCategory).map(([name, value]) => ({ name, value }));

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="stock"><Boxes className="w-4 h-4 mr-2" />Stock Summary</TabsTrigger>
              <TabsTrigger value="issue-return"><BarChart3 className="w-4 h-4 mr-2" />Issue vs Return</TabsTrigger>
              <TabsTrigger value="outstanding"><Users className="w-4 h-4 mr-2" />Staff Outstanding</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex gap-2">
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by outlet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {outlets.map((o) => (
                  <SelectItem key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Stock Summary Tab */}
            {activeTab === 'stock' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Stock by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {categoryChartData.map((_, idx) => (
                                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Summary Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between p-3 border rounded-sm">
                        <span className="text-muted-foreground">Total Items</span>
                        <span className="font-mono font-semibold">{stockData.length}</span>
                      </div>
                      <div className="flex justify-between p-3 border rounded-sm">
                        <span className="text-muted-foreground">Total Stock</span>
                        <span className="font-mono font-semibold">{stockData.reduce((sum, i) => sum + (i.current_stock || 0), 0)}</span>
                      </div>
                      <div className="flex justify-between p-3 border rounded-sm bg-warning/5">
                        <span className="text-muted-foreground">Low Stock Items</span>
                        <span className="font-mono font-semibold text-warning">{stockData.filter(i => (i.current_stock || 0) < 5).length}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Stock Details</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => exportToCSV(stockData, 'stock_report')}>
                      <Download className="w-4 h-4 mr-2" />Export CSV
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead className="text-right">Opening</TableHead>
                          <TableHead className="text-right">Received</TableHead>
                          <TableHead className="text-right">Issued</TableHead>
                          <TableHead className="text-right">Returned</TableHead>
                          <TableHead className="text-right">Current</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockData.slice(0, 20).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.item_name || item.item_id}</TableCell>
                            <TableCell>{item.category || '-'}</TableCell>
                            <TableCell>{item.size || '-'}</TableCell>
                            <TableCell className="text-right font-mono">{item.opening_stock}</TableCell>
                            <TableCell className="text-right font-mono text-success">+{item.received}</TableCell>
                            <TableCell className="text-right font-mono text-destructive">-{item.issued}</TableCell>
                            <TableCell className="text-right font-mono text-info">+{item.returned}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{item.current_stock}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Issue vs Return Tab */}
            {activeTab === 'issue-return' && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="border-destructive/30">
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-2">Total Issued</p>
                      <p className="metric-value text-destructive">{issueReturnData.total_issued}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-success/30">
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-2">Total Returned</p>
                      <p className="metric-value text-success">{issueReturnData.total_returned}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Issues ({issueReturnData.issues?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Issue ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead className="text-right">Items</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {issueReturnData.issues?.slice(0, 10).map((issue) => (
                          <TableRow key={issue.issue_id}>
                            <TableCell className="font-mono text-sm">{issue.issue_id}</TableCell>
                            <TableCell>{new Date(issue.issued_at).toLocaleDateString()}</TableCell>
                            <TableCell>{issue.staff_id}</TableCell>
                            <TableCell className="text-right font-mono">{issue.total_items}</TableCell>
                            <TableCell className="text-right font-mono">₹{issue.total_value?.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Staff Outstanding Tab */}
            {activeTab === 'outstanding' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Staff Outstanding Items</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(outstandingData, 'outstanding_report')}>
                    <Download className="w-4 h-4 mr-2" />Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {outstandingData.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No outstanding items
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Name</TableHead>
                          <TableHead className="text-right">Total Issued</TableHead>
                          <TableHead className="text-right">Total Returned</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outstandingData.map((staff, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{staff.staff_name}</TableCell>
                            <TableCell className="text-right font-mono">{staff.total_issued}</TableCell>
                            <TableCell className="text-right font-mono">{staff.total_returned}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-warning">{staff.outstanding}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
