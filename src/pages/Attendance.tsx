import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  is_half_day: boolean;
  marked_at: string;
}

export default function Attendance() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayMarked, setTodayMarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchAttendance = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .order('date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching attendance:', error);
    } else {
      setRecords(data || []);
      setTodayMarked(data?.some(r => r.date === today) || false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, [profile]);

  const markAttendance = async (status: 'present' | 'absent') => {
    if (!profile || todayMarked) return;

    setMarking(true);
    const { error } = await supabase.from('attendance').insert({
      employee_id: profile.id,
      date: today,
      status,
    });
    setMarking(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark attendance. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Attendance marked as ${status}.`,
      });
      fetchAttendance();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Attendance</h1>

        <Card>
          <CardHeader>
            <CardTitle>Mark Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
              {todayMarked ? (
                <Badge variant="secondary">Already Marked</Badge>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => markAttendance('present')}
                    disabled={marking}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {marking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Mark Present
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => markAttendance('absent')}
                    disabled={marking}
                  >
                    {marking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Mark Absent
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No attendance records found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Marked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                          {record.status === 'present' ? 'Present' : 'Absent'}
                          {record.is_half_day && ' (Half Day)'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(record.marked_at), 'h:mm a')}</TableCell>
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
