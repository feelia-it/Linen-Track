import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  getSuperAdminDashboard, 
  getCompanyAdminDashboard, 
  getIssuerDashboard 
} from '../services/api';
import { 
  Building2, 
  Store, 
  Users, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  FileOutput,
  Undo2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const MetricCard = ({ title, value, icon: Icon, trend, trendValue, subtitle, onClick }) => (
  <Card 
    className={`card-widget ${onClick ? 'cursor-pointer hover:border-primary/30 transition-colors' : ''}`}
    onClick={onClick}
    data-testid={`metric-${title.toLowerCase().replace(/\s/g, '-')}`}
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="w-5 h-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="metric-value text-foreground">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-success' : 'text-destructive'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trendValue}
        </div>
      )}
    </CardContent>
  </Card>
);

const AlertItem = ({ item, onClick }) => (
  <div 
    className="flex items-center justify-between p-3 rounded-sm border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-sm bg-warning/10 flex items-center justify-center">
        <AlertTriangle className="w-4 h-4 text-warning" />
      </div>
      <div>
        <p className="text-sm font-medium">{item.item_id}</p>
        <p className="text-xs text-muted-foreground">
          Stock: <span className="font-mono text-destructive">{item.current_stock}</span>
          {item.size && ` | Size: ${item.size}`}
        </p>
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </div>
);

const ActivityItem = ({ activity }) => {
  const actionColors = {
    create: 'bg-success/10 text-success',
    update: 'bg-info/10 text-info',
    delete: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${actionColors[activity.action] || 'bg-muted text-muted-foreground'}`}>
        {activity.action?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium capitalize">{activity.action}</span>
          {' '}
          <span className="text-muted-foreground">{activity.entity_type}</span>
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {activity.entity_id}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(activity.logged_at).toLocaleTimeString()}
      </span>
    </div>
  );
};

const SuperAdminDashboard = ({ data, navigate }) => (
  <div className="space-y-6 animate-fade-in">
    {/* Metrics Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard 
        title="Companies" 
        value={data.company_count || 0} 
        icon={Building2}
        onClick={() => navigate('/companies')}
      />
      <MetricCard 
        title="Outlets" 
        value={data.outlet_count || 0} 
        icon={Store}
        onClick={() => navigate('/outlets')}
      />
      <MetricCard 
        title="Users" 
        value={data.user_count || 0} 
        icon={Users}
        onClick={() => navigate('/users')}
      />
      <MetricCard 
        title="Inventory Value" 
        value={`₹${(data.total_inventory_value || 0).toLocaleString()}`} 
        icon={Package}
        onClick={() => navigate('/inventory')}
      />
    </div>

    {/* Alerts & Activity */}
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Low Stock Alerts</CardTitle>
          <Badge variant="outline" className="status-warning">
            {data.low_stock_alerts || 0} items
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.low_stock_items?.length > 0 ? (
            data.low_stock_items.map((item, idx) => (
              <AlertItem key={idx} item={item} onClick={() => navigate('/inventory')} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No low stock alerts</p>
          )}
          {data.low_stock_alerts > 5 && (
            <Button variant="ghost" className="w-full" onClick={() => navigate('/inventory')}>
              View all {data.low_stock_alerts} alerts
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 divide-y">
            {data.recent_activity?.length > 0 ? (
              data.recent_activity.map((activity, idx) => (
                <ActivityItem key={idx} activity={activity} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
            )}
          </div>
          {data.recent_activity?.length > 0 && (
            <Button variant="ghost" className="w-full mt-2" onClick={() => navigate('/activity-logs')}>
              View all activity
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
);

const CompanyAdminDashboard = ({ data, navigate }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard 
        title="Outlets" 
        value={data.outlet_count || 0} 
        icon={Store}
        onClick={() => navigate('/outlets')}
      />
      <MetricCard 
        title="Staff" 
        value={data.staff_count || 0} 
        icon={Users}
        onClick={() => navigate('/staff')}
      />
      <MetricCard 
        title="Items" 
        value={data.item_count || 0} 
        icon={Package}
        onClick={() => navigate('/items')}
      />
      <MetricCard 
        title="Lost/Damaged (Month)" 
        value={data.lost_damaged_this_month || 0} 
        icon={AlertTriangle}
        onClick={() => navigate('/discard-lost')}
      />
    </div>

    <div className="grid sm:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Issues Today</CardTitle>
          <FileOutput className="w-5 h-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="metric-value text-foreground">{data.issues_today || 0}</div>
          <Button variant="link" className="p-0 h-auto mt-2" onClick={() => navigate('/issues')}>
            View issues <ChevronRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Returns Today</CardTitle>
          <Undo2 className="w-5 h-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="metric-value text-foreground">{data.returns_today || 0}</div>
          <Button variant="link" className="p-0 h-auto mt-2" onClick={() => navigate('/returns')}>
            View returns <ChevronRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>

    {data.outlet_stock_summary?.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Outlet Stock Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.outlet_stock_summary.map((outlet, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-sm border">
                <span className="text-sm font-medium">{outlet._id}</span>
                <span className="font-mono text-primary">{outlet.total_stock} items</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

const IssuerDashboard = ({ data, navigate }) => (
  <div className="space-y-6 animate-fade-in">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <MetricCard 
        title="Issues Today" 
        value={data.issues_today_count || 0} 
        icon={FileOutput}
        onClick={() => navigate('/issues')}
      />
      <MetricCard 
        title="Returns Today" 
        value={data.returns_today_count || 0} 
        icon={Undo2}
        onClick={() => navigate('/returns')}
      />
      <MetricCard 
        title="Low Stock Items" 
        value={data.low_stock_count || 0} 
        icon={AlertTriangle}
        onClick={() => navigate('/inventory')}
      />
    </div>

    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Today's Issues</CardTitle>
          <Button size="sm" onClick={() => navigate('/issues')}>
            New Issue
          </Button>
        </CardHeader>
        <CardContent>
          {data.issues_today?.length > 0 ? (
            <div className="space-y-2">
              {data.issues_today.slice(0, 5).map((issue, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-sm border">
                  <div>
                    <p className="text-sm font-medium">{issue.staff_id}</p>
                    <p className="text-xs text-muted-foreground">{issue.total_items} items</p>
                  </div>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No issues today</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Low Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.low_stock_items?.length > 0 ? (
            data.low_stock_items.slice(0, 5).map((item, idx) => (
              <AlertItem key={idx} item={item} onClick={() => navigate('/inventory')} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">All stock levels healthy</p>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        let dashboardData;
        if (user?.role === 'super_admin') {
          dashboardData = await getSuperAdminDashboard();
        } else if (['company_admin', 'company_manager'].includes(user?.role)) {
          dashboardData = await getCompanyAdminDashboard();
        } else {
          dashboardData = await getIssuerDashboard();
        }
        setData(dashboardData);
      } catch (error) {
        toast.error('Failed to load dashboard data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboard();
    }
  }, [user]);

  const getDashboardTitle = () => {
    switch (user?.role) {
      case 'super_admin': return 'Super Admin Dashboard';
      case 'company_admin': return 'Company Dashboard';
      case 'company_manager': return 'Company Dashboard';
      case 'outlet_manager': return 'Outlet Dashboard';
      case 'issuer': return 'Issuer Dashboard';
      case 'auditor': return 'Auditor Dashboard';
      default: return 'Dashboard';
    }
  };

  if (loading) {
    return (
      <DashboardLayout title={getDashboardTitle()}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 skeleton rounded-sm" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={getDashboardTitle()}>
      <div data-testid="dashboard-content">
        {user?.role === 'super_admin' && <SuperAdminDashboard data={data || {}} navigate={navigate} />}
        {['company_admin', 'company_manager'].includes(user?.role) && <CompanyAdminDashboard data={data || {}} navigate={navigate} />}
        {['outlet_manager', 'issuer', 'auditor'].includes(user?.role) && <IssuerDashboard data={data || {}} navigate={navigate} />}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
