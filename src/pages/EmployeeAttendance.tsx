import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, Circle, Plane, LogIn, LogOut } from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
}

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  onLeaveDays: number;
  absentDays: number;
}

interface TodayStatus {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  recordId: string | null;
}

export default function EmployeeAttendance() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalDays: 0,
    presentDays: 0,
    onLeaveDays: 0,
    absentDays: 0,
  });
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({
    hasCheckedIn: false,
    hasCheckedOut: false,
    checkInTime: null,
    checkOutTime: null,
    recordId: null,
  });

  const today = new Date().toISOString().split('T')[0];

  const fetchTodayStatus = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .eq('date', today)
      .maybeSingle();

    if (data) {
      setTodayStatus({
        hasCheckedIn: !!data.check_in,
        hasCheckedOut: !!data.check_out,
        checkInTime: data.check_in,
        checkOutTime: data.check_out,
        recordId: data.id,
      });
    } else {
      setTodayStatus({
        hasCheckedIn: false,
        hasCheckedOut: false,
        checkInTime: null,
        checkOutTime: null,
        recordId: null,
      });
    }
  };

  const fetchAttendance = async () => {
    if (!profile) return;

    setLoading(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching attendance:', error);
    } else {
      setRecords(data || []);
      
      const present = data?.filter(r => r.status === 'present').length || 0;
      const onLeave = data?.filter(r => r.status === 'on_leave').length || 0;
      const absent = data?.filter(r => r.status === 'absent').length || 0;
      
      setSummary({
        totalDays: data?.length || 0,
        presentDays: present,
        onLeaveDays: onLeave,
        absentDays: absent,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTodayStatus();
    fetchAttendance();
  }, [profile, selectedMonth]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('employee-attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `employee_id=eq.${profile.id}`,
        },
        () => {
          fetchTodayStatus();
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const handleCheckIn = async () => {
    if (!profile) return;

    setActionLoading(true);
    const currentTime = format(new Date(), 'HH:mm:ss');

    try {
      const { error } = await supabase
        .from('attendance')
        .insert({
          employee_id: profile.id,
          date: today,
          status: 'present',
          check_in: currentTime,
        });

      if (error) throw error;

      toast({
        title: 'Checked In!',
        description: `You checked in at ${format(new Date(), 'h:mm a')}`,
      });

      fetchTodayStatus();
      fetchAttendance();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check in',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!profile || !todayStatus.recordId) return;

    setActionLoading(true);
    const currentTime = format(new Date(), 'HH:mm:ss');

    try {
      // Calculate work hours
      let workHours: number | null = null;
      if (todayStatus.checkInTime) {
        const checkIn = new Date(`${today}T${todayStatus.checkInTime}`);
        const checkOut = new Date(`${today}T${currentTime}`);
        workHours = Math.round(((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
      }

      const { error } = await supabase
        .from('attendance')
        .update({
          check_out: currentTime,
          work_hours: workHours,
        })
        .eq('id', todayStatus.recordId);

      if (error) throw error;

      toast({
        title: 'Checked Out!',
        description: `You checked out at ${format(new Date(), 'h:mm a')}. Total: ${workHours}h`,
      });

      fetchTodayStatus();
      fetchAttendance();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check out',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'present':
        return <Circle className="h-4 w-4 fill-[hsl(145,63%,49%)] text-[hsl(145,63%,49%)]" />;
      case 'on_leave':
        return <Circle className="h-4 w-4 fill-[hsl(45,93%,47%)] text-[hsl(45,93%,47%)]" />;
      case 'absent':
        return <Plane className="h-4 w-4 text-[hsl(6,78%,57%)]" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'on_leave': return 'On Leave';
      case 'absent': return 'Absent';
      default: return status;
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(new Date().getFullYear(), i, 1);
    return {
      value: `${date.getFullYear()}-${String(i + 1).padStart(2, '0')}`,
      label: format(date, 'MMMM yyyy'),
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Check In/Out Card */}
        <Card className="shadow-sm border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Today's Attendance</h3>
                <p className="text-muted-foreground text-sm">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
                {todayStatus.hasCheckedIn && (
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-muted-foreground">
                      Check-in: <span className="text-foreground font-medium">{todayStatus.checkInTime}</span>
                    </span>
                    {todayStatus.hasCheckedOut && (
                      <span className="text-muted-foreground">
                        Check-out: <span className="text-foreground font-medium">{todayStatus.checkOutTime}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {!todayStatus.hasCheckedIn ? (
                  <Button 
                    size="lg" 
                    onClick={handleCheckIn} 
                    disabled={actionLoading}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <LogIn className="h-5 w-5" />
                    )}
                    Check In
                  </Button>
                ) : !todayStatus.hasCheckedOut ? (
                  <Button 
                    size="lg" 
                    onClick={handleCheckOut} 
                    disabled={actionLoading}
                    variant="destructive"
                    className="gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <LogOut className="h-5 w-5" />
                    )}
                    Check Out
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                    <Circle className="h-4 w-4 fill-green-600 text-green-600" />
                    <span className="font-medium">Completed for today</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Working Days</p>
              <p className="text-2xl font-semibold">{summary.totalDays}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Circle className="h-5 w-5 fill-[hsl(145,63%,49%)] text-[hsl(145,63%,49%)]" />
              <div>
                <p className="text-sm text-muted-foreground">Present Days</p>
                <p className="text-2xl font-semibold text-[hsl(145,63%,49%)]">{summary.presentDays}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Circle className="h-5 w-5 fill-[hsl(45,93%,47%)] text-[hsl(45,93%,47%)]" />
              <div>
                <p className="text-sm text-muted-foreground">On Leave Days</p>
                <p className="text-2xl font-semibold text-[hsl(45,93%,47%)]">{summary.onLeaveDays}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Plane className="h-5 w-5 text-[hsl(6,78%,57%)]" />
              <div>
                <p className="text-sm text-muted-foreground">Absent Days</p>
                <p className="text-2xl font-semibold text-[hsl(6,78%,57%)]">{summary.absentDays}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Attendance History</CardTitle>
                <CardDescription>View your daily attendance records</CardDescription>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No attendance records for this month.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="uppercase text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date
                      </div>
                    </TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Status</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Check-in
                      </div>
                    </TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Check-out</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'EEE, MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIndicator(record.status)}
                          <span>{getStatusLabel(record.status)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.status === 'present' && record.check_in ? record.check_in : '-'}
                      </TableCell>
                      <TableCell>
                        {record.status === 'present' && record.check_out ? record.check_out : '-'}
                      </TableCell>
                      <TableCell>
                        {record.status === 'present' && record.work_hours ? `${record.work_hours}h` : '-'}
                      </TableCell>
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
}
