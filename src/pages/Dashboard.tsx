import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Clock, FileText, Users, CheckSquare } from 'lucide-react';

interface Stats {
  todayAttendance: string;
  totalLeaves: number;
  pendingLeaves: number;
  totalEmployees?: number;
  todayPresentCount?: number;
}

export default function Dashboard() {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState<Stats>({
    todayAttendance: 'Not Marked',
    totalLeaves: 0,
    pendingLeaves: 0,
    totalEmployees: 0,
    todayPresentCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      const today = new Date().toISOString().split('T')[0];

      if (role === 'admin') {
        const [employeesRes, todayAttendanceRes, pendingLeavesRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today).eq('status', 'present'),
          supabase.from('leave_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        ]);

        setStats({
          todayAttendance: 'N/A',
          totalLeaves: 0,
          pendingLeaves: pendingLeavesRes.count || 0,
          totalEmployees: employeesRes.count || 0,
          todayPresentCount: todayAttendanceRes.count || 0,
        });
      } else {
        const [attendanceRes, leavesRes, pendingRes] = await Promise.all([
          supabase.from('attendance').select('status').eq('employee_id', profile.id).eq('date', today).single(),
          supabase.from('leave_requests').select('id', { count: 'exact' }).eq('employee_id', profile.id).eq('status', 'approved'),
          supabase.from('leave_requests').select('id', { count: 'exact' }).eq('employee_id', profile.id).eq('status', 'pending'),
        ]);

        setStats({
          todayAttendance: attendanceRes.data?.status ? (attendanceRes.data.status === 'present' ? 'Present' : 'Absent') : 'Not Marked',
          totalLeaves: leavesRes.count || 0,
          pendingLeaves: pendingRes.count || 0,
        });
      }
    };

    fetchStats();
  }, [profile, role]);

  const adminCards = [
    { title: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'text-blue-400' },
    { title: "Today's Attendance", value: stats.todayPresentCount, icon: Clock, color: 'text-green-400' },
    { title: 'Pending Leave Requests', value: stats.pendingLeaves, icon: FileText, color: 'text-yellow-400' },
  ];

  const employeeCards = [
    { title: "Today's Status", value: stats.todayAttendance, icon: Clock, color: 'text-blue-400' },
    { title: 'Total Leaves Taken', value: stats.totalLeaves, icon: CheckSquare, color: 'text-green-400' },
    { title: 'Pending Requests', value: stats.pendingLeaves, icon: FileText, color: 'text-yellow-400' },
  ];

  const cards = role === 'admin' ? adminCards : employeeCards;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, {profile?.first_name}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {role === 'admin' ? 'Admin Dashboard' : 'Employee Dashboard'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
