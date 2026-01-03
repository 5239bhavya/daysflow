import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  FileText, 
  Users, 
  BadgeCheck, 
  Circle, 
  Plane, 
  DollarSign,
  UserPlus,
  CalendarCheck,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Stats {
  totalDays: number;
  presentDays: number;
  onLeaveDays: number;
  absentDays: number;
  paidLeaveBalance: number;
  sickLeaveBalance: number;
  latestNetSalary: number | null;
  totalEmployees?: number;
  todayPresentCount?: number;
  pendingRequests?: number;
  totalPayroll?: number;
}

interface RecentLeaveRequest {
  id: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: string;
  avatar_url?: string;
}

interface RecentEmployee {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
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
    latestNetSalary: null,
    totalEmployees: 0,
    todayPresentCount: 0,
    pendingRequests: 0,
    totalPayroll: 0,
  });
  const [recentLeaves, setRecentLeaves] = useState<RecentLeaveRequest[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentMonthNum = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      if (role === 'admin') {
        const [employeesRes, todayAttendanceRes, pendingLeavesRes, payrollRes, recentLeavesRes, recentEmployeesRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today).eq('status', 'present'),
          supabase.from('leave_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('payroll').select('net_salary').eq('month', currentMonthNum).eq('year', currentYear),
          supabase
            .from('leave_requests')
            .select(`
              id,
              leave_type,
              from_date,
              to_date,
              status,
              profiles:employee_id (first_name, last_name, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('profiles')
            .select('id, first_name, last_name, employee_id, department, avatar_url, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const totalPayroll = payrollRes.data?.reduce((sum, r) => sum + Number(r.net_salary), 0) || 0;

        setStats(prev => ({
          ...prev,
          totalEmployees: employeesRes.count || 0,
          todayPresentCount: todayAttendanceRes.count || 0,
          pendingRequests: pendingLeavesRes.count || 0,
          totalPayroll,
        }));

        // Process recent leaves
        const processedLeaves = recentLeavesRes.data?.map((leave: any) => ({
          id: leave.id,
          employee_name: `${leave.profiles?.first_name || ''} ${leave.profiles?.last_name || ''}`.trim(),
          leave_type: leave.leave_type,
          from_date: leave.from_date,
          to_date: leave.to_date,
          status: leave.status,
          avatar_url: leave.profiles?.avatar_url,
        })) || [];

        setRecentLeaves(processedLeaves);
        setRecentEmployees(recentEmployeesRes.data || []);
      } else {
        const startOfMonth = `${currentMonth}-01`;
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

        const [attendanceRes, payrollRes] = await Promise.all([
          supabase
            .from('attendance')
            .select('status')
            .eq('employee_id', profile.id)
            .gte('date', startOfMonth)
            .lte('date', endOfMonth),
          supabase
            .from('payroll')
            .select('net_salary')
            .eq('employee_id', profile.id)
            .eq('status', 'paid')
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const attendanceData = attendanceRes.data;
        const present = attendanceData?.filter(r => r.status === 'present').length || 0;
        const onLeave = attendanceData?.filter(r => r.status === 'on_leave').length || 0;
        const absent = attendanceData?.filter(r => r.status === 'absent').length || 0;

        setStats(prev => ({
          ...prev,
          totalDays: attendanceData?.length || 0,
          presentDays: present,
          onLeaveDays: onLeave,
          absentDays: absent,
          latestNetSalary: payrollRes.data?.net_salary ?? null,
        }));
      }
    };

    fetchStats();
  }, [profile, role]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Pending</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  // Admin Dashboard
  if (role === 'admin') {
    const statsCards = [
      { 
        title: 'Total Employees', 
        value: stats.totalEmployees, 
        icon: Users,
        color: 'bg-primary/10 text-primary',
        onClick: () => navigate('/employees'),
      },
      { 
        title: 'Present Today', 
        value: stats.todayPresentCount, 
        icon: CalendarCheck,
        color: 'bg-green-100 text-green-600',
        onClick: () => navigate('/attendance/manage'),
      },
      { 
        title: 'Pending Requests', 
        value: stats.pendingRequests, 
        icon: AlertCircle,
        color: 'bg-orange-100 text-orange-600',
        onClick: () => navigate('/time-off/approvals'),
      },
      { 
        title: 'Monthly Payroll', 
        value: formatCurrency(stats.totalPayroll || 0), 
        icon: TrendingUp,
        color: 'bg-blue-100 text-blue-600',
        onClick: () => navigate('/payroll/manage'),
      },
    ];

    const quickActions = [
      { label: 'Add Employee', icon: UserPlus, onClick: () => navigate('/employees/create'), variant: 'default' as const },
      { label: 'Mark Attendance', icon: Clock, onClick: () => navigate('/attendance/manage'), variant: 'outline' as const },
      { label: 'Leave Approvals', icon: FileText, onClick: () => navigate('/time-off/approvals'), variant: 'outline' as const },
    ];

    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, {profile?.first_name}! 👋
              </h1>
              <p className="text-muted-foreground">
                Here's what's happening with your team today.
              </p>
            </div>
            <div className="flex gap-2">
              {quickActions.map((action) => (
                <Button 
                  key={action.label}
                  variant={action.variant}
                  onClick={action.onClick}
                  className="gap-2"
                >
                  <action.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((card) => (
              <Card 
                key={card.title} 
                className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                onClick={card.onClick}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <p className="text-3xl font-bold mt-1">{card.value}</p>
                    </div>
                    <div className={`h-12 w-12 rounded-full ${card.color} flex items-center justify-center`}>
                      <card.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Leave Requests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Leave Requests</CardTitle>
                  <CardDescription>Latest employee leave applications</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/time-off/approvals')} className="gap-1">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {recentLeaves.length > 0 ? (
                  <div className="space-y-4">
                    {recentLeaves.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={leave.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {leave.employee_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{leave.employee_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {leave.leave_type} • {format(new Date(leave.from_date), 'MMM d')} - {format(new Date(leave.to_date), 'MMM d')}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(leave.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-2 opacity-50" />
                    <p>No recent leave requests</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Employees */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
                  <CardDescription>Recently added employees</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/employees')} className="gap-1">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {recentEmployees.length > 0 ? (
                  <div className="space-y-4">
                    {recentEmployees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={employee.avatar_url || undefined} />
                            <AvatarFallback className="bg-secondary text-primary text-sm">
                              {getInitials(employee.first_name, employee.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{employee.first_name} {employee.last_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {employee.employee_id} • {employee.department || 'No department'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {employee.employee_id}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mb-2 opacity-50" />
                    <p>No employees yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Overview */}
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/30 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Today's Overview</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.todayPresentCount}</p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{stats.pendingRequests}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{stats.totalEmployees}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

        <div className="grid gap-6 md:grid-cols-2">
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

          {/* Payroll Card */}
          <Card 
            className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/payroll')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Payroll
              </CardTitle>
              <CardDescription>Your salary information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="pt-2">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-semibold text-primary">
                    {stats.latestNetSalary !== null 
                      ? formatCurrency(stats.latestNetSalary) 
                      : 'No data'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Last Net Salary</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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