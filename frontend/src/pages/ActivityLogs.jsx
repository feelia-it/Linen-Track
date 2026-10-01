import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
import { getActivityLogs, getOutlets } from '../services/api';
import { History, Filter } from 'lucide-react';
import { toast } from 'sonner';

const ENTITY_TYPES = ['all', 'company', 'outlet', 'user', 'item', 'vendor', 'staff', 'grn', 'issue', 'return', 'discard_lost', 'template'];

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOutlet, setFilterOutlet] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsData, outletsData] = await Promise.all([
          getActivityLogs(null, filterOutlet === 'all' ? null : filterOutlet, filterEntity === 'all' ? null : filterEntity, 200),
          getOutlets()
        ]);
        setLogs(logsData);
        setOutlets(outletsData);
      } catch (error) {
        toast.error('Failed to load logs');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filterOutlet, filterEntity]);

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'status-active';
      case 'update': return 'bg-info/10 text-info border-info/20';
      case 'delete': return 'status-flagged';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout title="Activity Logs">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={filterOutlet} onValueChange={setFilterOutlet}>
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

          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((e) => (
                <SelectItem key={e} value={e} className="capitalize">{e === 'all' ? 'All Entities' : e.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              Activity Trail
              <Badge variant="outline" className="ml-2">{logs.length} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No activity logs found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.log_id}>
                      <TableCell className="text-sm">
                        {new Date(log.logged_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{log.entity_type?.replace('_', ' ')}</TableCell>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate">{log.entity_id}</TableCell>
                      <TableCell className="font-mono text-sm">{log.user_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityLogs;
