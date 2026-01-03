import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Loader2, ChevronDown, UserCircle, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { supabase } from '@/integrations/supabase/client';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/attendance': 'Attendance',
  '/attendance/manage': 'Attendance Management',
  '/time-off': 'Time Off',
  '/time-off/approvals': 'Time Off Requests',
  '/employees': 'Employees',
  '/employees/create': 'Create Employee',
  '/profile': 'Profile',
  '/payroll': 'Payroll',
  '/payroll/manage': 'Payroll Management',
};

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, profile, loading, signOut, role } = useAuth();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(true);

  // Track admin online status using Supabase Realtime Presence
  useEffect(() => {
    if (!user || role !== 'admin') return;

    const channel = supabase.channel('admin-presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setIsOnline(true);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Handle visibility change to update presence
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        setIsOnline(true);
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      } else {
        setIsOnline(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const pageTitle = title || pageTitles[location.pathname] || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <header className="h-16 bg-background border-b border-border flex items-center justify-between px-8">
          <h2 className="text-xl font-semibold text-foreground">{pageTitle}</h2>
          
          <div className="flex items-center gap-2">
            <NotificationBell />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </span>
                    </div>
                    {/* Online/Offline indicator for admin */}
                    {role === 'admin' && (
                      <span 
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                          isOnline ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        title={isOnline ? 'Online' : 'Offline'}
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium">{profile?.first_name}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <UserCircle className="h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-destructive">
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}