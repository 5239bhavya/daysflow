import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, Plus, Plane, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { Navigate } from 'react-router-dom';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string | null;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  extra_hours: number | null;
  remarks: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

export default function AdminAttendance() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    date: selectedDate,
    status: 'present',
    checkIn: '',
    checkOut: '',
    workHours: '',
    extraHours: '',
    remarks: '',
  });

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, employee_id, department')
      .order('first_name');
    
    if (error) {
      console.error('Error fetching employees:', error);
    } else {
      setEmployees(data || []);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        profiles:employee_id (
          first_name,
          last_name,
          employee_id
        )
      `)
      .eq('date', selectedDate)
      .order('marked_at', { ascending: false });

    if (error) {
      console.error('Error fetching attendance:', error);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
        },
        (payload) => {
          console.log('Attendance update:', payload);
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId) {
      toast({
        title: 'Error',
        description: 'Please select an employee',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Check if attendance already exists for this employee on this date
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', formData.employeeId)
        .eq('date', formData.date)
        .single();

      const attendanceData = {
        employee_id: formData.employeeId,
        date: formData.date,
        status: formData.status,
        check_in: formData.checkIn || null,
        check_out: formData.checkOut || null,
        work_hours: formData.workHours ? parseFloat(formData.workHours) : null,
        extra_hours: formData.extraHours ? parseFloat(formData.extraHours) : null,
        remarks: formData.remarks || null,
      };

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('attendance')
          .update(attendanceData)
          .eq('id', existing.id);
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Attendance updated successfully' });
      } else {
        // Insert new record
        const { error } = await supabase
          .from('attendance')
          .insert(attendanceData);
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Attendance marked successfully' });
      }

      setDialogOpen(false);
      setFormData({
        employeeId: '',
        date: selectedDate,
        status: 'present',
        checkIn: '',
        checkOut: '',
        workHours: '',
        extraHours: '',
        remarks: '',
      });
      fetchAttendance();

    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark attendance',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label htmlFor="date">Select Date</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Mark Attendance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Mark Employee Attendance</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleMarkAttendance} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <Select
                    value={formData.employeeId}
                    onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">
                        <div className="flex items-center gap-2">
                          <Circle className="h-3 w-3 fill-[hsl(145,63%,49%)] text-[hsl(145,63%,49%)]" />
                          Present
                        </div>
                      </SelectItem>
                      <SelectItem value="absent">
                        <div className="flex items-center gap-2">
                          <Plane className="h-3 w-3 text-[hsl(6,78%,57%)]" />
                          Absent
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.status === 'present' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Check-in Time</Label>
                        <Input
                          type="time"
                          value={formData.checkIn}
                          onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Check-out Time</Label>
                        <Input
                          type="time"
                          value={formData.checkOut}
                          onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Work Hours</Label>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="8"
                          value={formData.workHours}
                          onChange={(e) => setFormData({ ...formData, workHours: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Extra Hours</Label>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="0"
                          value={formData.extraHours}
                          onChange={(e) => setFormData({ ...formData, extraHours: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea
                    placeholder="Optional notes..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Attendance for {format(new Date(selectedDate), 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No attendance records for this date.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="uppercase text-xs font-semibold">Employee</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">ID</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Status</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Check-in</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Check-out</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.profiles?.first_name} {record.profiles?.last_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.profiles?.employee_id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIndicator(record.status)}
                          <span>{getStatusLabel(record.status)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{record.check_in || '-'}</TableCell>
                      <TableCell>{record.check_out || '-'}</TableCell>
                      <TableCell>
                        {record.work_hours ? `${record.work_hours}h` : '-'}
                        {record.extra_hours ? ` (+${record.extra_hours}h)` : ''}
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
