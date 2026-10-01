import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Building2,
  Store,
  Users,
  Package,
  Truck,
  UserCircle,
  Boxes,
  FileInput,
  FileOutput,
  Undo2,
  Trash2,
  FileText,
  FolderTree,
  Building,
  BarChart3,
  History,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'company_admin', 'company_manager', 'outlet_manager', 'issuer', 'auditor'] },
  { path: '/companies', label: 'Companies', icon: Building2, roles: ['super_admin'] },
  { path: '/outlets', label: 'Outlets', icon: Store, roles: ['super_admin', 'company_admin'] },
  { path: '/users', label: 'Users', icon: Users, roles: ['super_admin', 'company_admin'] },
  { divider: true, label: 'Inventory', roles: ['super_admin', 'company_admin', 'company_manager', 'outlet_manager', 'issuer'] },
  { path: '/categories', label: 'Categories', icon: FolderTree, roles: ['super_admin', 'company_admin', 'company_manager'] },
  { path: '/departments', label: 'Departments', icon: Building, roles: ['super_admin', 'company_admin', 'company_manager'] },
  { path: '/items', label: 'Item Master', icon: Package, roles: ['super_admin', 'company_admin', 'company_manager'] },
  { path: '/vendors', label: 'Vendors', icon: Truck, roles: ['super_admin', 'company_admin', 'company_manager'] },
  { path: '/staff', label: 'Staff', icon: UserCircle, roles: ['super_admin', 'company_admin', 'company_manager', 'outlet_manager'] },
  { path: '/inventory', label: 'Inventory', icon: Boxes, roles: ['super_admin', 'company_admin', 'company_manager', 'outlet_manager', 'issuer'] },
  { divider: true, label: 'Transactions', roles: ['super_admin', 'company_admin', 'company_manager', 'outlet_manager', 'issuer'] },
  { path: '/grn', label: 'Stock Receive (GRN)', icon: FileInput, roles: ['super_admin', 'company_admin', 'company_manager', 'outlet_manager', 'issuer'] },
  { path: '/issues', label: 'Issue', icon: FileOutput, roles: ['super_admin', 'company_admin', 'company_manager', 'outlet_manager', 'issuer'] },
  { path: '/returns', label: 'Return', icon: Undo2, roles: ['super_admin', 'company_admin', 'company_manager', 'outlet_manager', 'issuer'] },
  { path: '/discard-lost', label: 'Discard / Lost', icon: Trash2, roles: ['super_admin', 'company_admin', 'company_manager', 'outlet_manager', 'issuer'] },
  { divider: true, label: 'Analytics', roles: ['super_admin', 'company_admin', 'auditor'] },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'company_admin', 'company_manager', 'auditor'] },
  { path: '/activity-logs', label: 'Activity Logs', icon: History, roles: ['super_admin', 'company_admin', 'auditor'] },
];

export const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter(item =>
    item.roles?.includes(user?.role) || item.divider
  );

  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center">
              <Boxes className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg font-heading">UniForm</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
          {filteredNav.map((item, idx) => {
            if (item.divider) {
              return (
                <div key={idx} className="pt-4 pb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3">
                    {item.label}
                  </span>
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
                data-testid={`nav-${item.path.replace('/', '')}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 glass-header h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            {title && <h1 className="text-xl font-semibold font-heading">{title}</h1>}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="theme-toggle">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.picture} alt={user?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-primary mt-1 capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="settings-link">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive" data-testid="logout-btn">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
