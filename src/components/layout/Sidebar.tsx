import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Clock, 
  FileText, 
  CheckSquare, 
  Users, 
  UserSearch,
  User,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const location = useLocation();
  const { role, signOut, profile } = useAuth();

  const employeeLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/leave/apply', icon: FileText, label: 'Apply Leave' },
    { to: '/leave/status', icon: CheckSquare, label: 'Leave Status' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/employees/directory', icon: UserSearch, label: 'Employee Directory' },
    { to: '/attendance/records', icon: Clock, label: 'Attendance Records' },
    { to: '/leave/approvals', icon: CheckSquare, label: 'Leave Approvals' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const links = role === 'admin' ? adminLinks : employeeLinks;

  return (
    <aside className="flex flex-col h-screen w-64 bg-sidebar-background border-r border-sidebar-border">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">Dayflow</h1>
        <p className="text-sm text-muted-foreground">HRMS</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
              location.pathname === link.to
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <link.icon className="h-5 w-5" />
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-2 mb-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-medium">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
