import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Clock, FileText, Users, BadgeCheck, Circle, Plane } from 'lucide-react';

interface Stats {
  // Employee stats
  totalDays: number;
  presentDays: number;
  onLeaveDays: number;
  absentDays: number;
  paidLeaveBalance: number;
  sickLeaveBalance: number;
  // Admin stats
  totalEmployees?: number;
  todayPresentCount?: number;
  pendingRequests?: number;
}

export default function Dashboard() {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalDays: 0,
    presentDays: 0,
    onLeaveDays: 0,
    absentDays: 0,
    paidLeaveBalance: 12,
    sickLeaveBalance: 6,
    totalEmployees: 0,
    todayPresentCount: 0,
    pendingRequests: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().toISOString().slice(0, 7);

      if (role === 'admin') {
        const [employeesRes, todayAttendanceRes, pendingLeavesRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today).eq('status', 'present'),
          supabase.from('leave_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        ]);

        setStats(prev => ({
          ...prev,
          totalEmployees: employeesRes.count || 0,
          todayPresentCount: todayAttendanceRes.count || 0,
          pendingRequests: pendingLeavesRes.count || 0,
        }));
      } else {
        // Get current month attendance
        const startOfMonth = `${currentMonth}-01`;
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('status')
          .eq('employee_id', profile.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

        const present = attendanceData?.filter(r => r.status === 'present').length || 0;
        const onLeave = attendanceData?.filter(r => r.status === 'on_leave').length || 0;
        const absent = attendanceData?.filter(r => r.status === 'absent').length || 0;

        setStats(prev => ({
          ...prev,
          totalDays: attendanceData?.length || 0,
          presentDays: present,
          onLeaveDays: onLeave,
          absentDays: absent,
        }));
      }
    };

    fetchStats();
  }, [profile, role]);

  // Admin Dashboard
  if (role === 'admin') {
    const adminCards = [
      { 
        title: 'Total Employees', 
        value: stats.totalEmployees, 
        icon: Users,
        onClick: () => navigate('/employees'),
      },
      { 
        title: 'Attendance Today', 
        value: stats.todayPresentCount, 
        icon: Clock,
        onClick: () => navigate('/attendance/manage'),
      },
      { 
        title: 'Pending Requests', 
        value: stats.pendingRequests, 
        icon: FileText,
        onClick: () => navigate('/time-off/approvals'),
      },
    ];

    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {adminCards.map((card) => (
              <Card 
                key={card.title} 
                className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={card.onClick}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                      <card.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className="text-2xl font-semibold">{card.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Employee Dashboard
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Attendance Summary Card */}
        <Card 
          className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/attendance')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Attendance Summary
            </CardTitle>
            <CardDescription>This month's attendance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 pt-2">
              <div className="text-center">
                <p className="text-2xl font-semibold">{stats.totalDays}</p>
                <p className="text-xs text-muted-foreground">Total Days</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Circle className="h-3 w-3 fill-[hsl(145,63%,49%)] text-[hsl(145,63%,49%)]" />
                  <p className="text-2xl font-semibold text-[hsl(145,63%,49%)]">{stats.presentDays}</p>
                </div>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Circle className="h-3 w-3 fill-[hsl(45,93%,47%)] text-[hsl(45,93%,47%)]" />
                  <p className="text-2xl font-semibold text-[hsl(45,93%,47%)]">{stats.onLeaveDays}</p>
                </div>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Plane className="h-3 w-3 text-[hsl(6,78%,57%)]" />
                  <p className="text-2xl font-semibold text-[hsl(6,78%,57%)]">{stats.absentDays}</p>
                </div>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Off Summary Card */}
        <Card 
          className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/time-off')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Time Off Summary
            </CardTitle>
            <CardDescription>Your leave balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-semibold">{stats.paidLeaveBalance} days</p>
                <p className="text-sm text-muted-foreground">Paid Time Off</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-semibold">{stats.sickLeaveBalance} days</p>
                <p className="text-sm text-muted-foreground">Sick Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card 
          className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/profile')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Profile
            </CardTitle>
            <CardDescription>Your employee information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{profile?.first_name} {profile?.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee ID</span>
                <span className="font-mono font-medium">{profile?.employee_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{profile?.department || 'Not assigned'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
