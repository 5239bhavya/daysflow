import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Clock, 
  FileText, 
  BadgeCheck, 
  Users, 
  UserCircle,
  LogOut,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const location = useLocation();
  const { role, signOut } = useAuth();

  const employeeLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/time-off', icon: FileText, label: 'Time Off' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/employees/create', icon: UserPlus, label: 'Create Employee' },
    { to: '/attendance/manage', icon: Clock, label: 'Attendance' },
    { to: '/time-off/approvals', icon: FileText, label: 'Time Off Requests' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ];

  const links = role === 'admin' ? adminLinks : employeeLinks;

  return (
    <aside className="flex flex-col h-screen w-64 bg-background border-r border-border">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-semibold text-primary">Dayflow</h1>
        <p className="text-xs text-muted-foreground mt-1">Human Resource Management System</p>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
              location.pathname === link.to
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-secondary'
            )}
          >
            <link.icon className="h-5 w-5" />
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-secondary"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
