import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Sun, Moon, User, Shield, Bell, Palette } from 'lucide-react';

const Settings = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{user?.name}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="outline" className="mt-1 capitalize">{user?.role?.replace('_', ' ')}</Badge>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">User ID</span>
                <p className="font-mono">{user?.user_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Company</span>
                <p>{user?.company_id || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <div>
                  <Label className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Toggle between light and dark theme</p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                data-testid="theme-switch"
              />
            </div>
          </CardContent>
        </Card>

        {/* Role & Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Role & Permissions
            </CardTitle>
            <CardDescription>Your access level in the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-sm bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium capitalize">{user?.role?.replace('_', ' ')}</span>
                <Badge variant="outline" className="status-active">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {user?.role === 'super_admin' && 'Full access to all companies, outlets, and system settings'}
                {user?.role === 'company_admin' && 'Manage all outlets, users, and inventory within your company'}
                {user?.role === 'company_manager' && 'Manage items, vendors, staff, and inventory operations'}
                {user?.role === 'outlet_manager' && 'Manage staff and operations within assigned outlets'}
                {user?.role === 'issuer' && 'Issue, return, and track inventory at assigned outlets'}
                {user?.role === 'auditor' && 'View-only access to all reports and activity logs'}
              </p>
            </div>

            {user?.outlet_ids?.length > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground">Assigned Outlets</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {user.outlet_ids.map((id) => (
                    <Badge key={id} variant="secondary">{id}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>Email notification settings (Coming Soon)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 opacity-50">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts when items are low</p>
                </div>
                <Switch disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily Summary</Label>
                  <p className="text-sm text-muted-foreground">Daily email with activity summary</p>
                </div>
                <Switch disabled />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Email notifications will be available in a future update
            </p>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="border-destructive/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Sign Out</h3>
                <p className="text-sm text-muted-foreground">End your current session</p>
              </div>
              <Button variant="destructive" onClick={logout} data-testid="signout-btn">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
