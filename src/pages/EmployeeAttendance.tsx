import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, Clock, Circle, Plane } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
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

export default function EmployeeAttendance() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
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
      
      // Calculate summary
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
    fetchAttendance();
  }, [profile, selectedMonth]);

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
