import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Navigate } from 'react-router-dom';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  is_half_day: boolean;
  marked_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
}

export default function AttendanceRecords() {
  const { role } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase.from('profiles').select('id, first_name, last_name, employee_id');
      setEmployees(data || []);
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      
      let query = supabase
        .from('attendance')
        .select('*, profiles!inner(first_name, last_name, employee_id)')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching records:', error);
      } else {
        setRecords(data || []);
      }
      setLoading(false);
    };

    fetchRecords();
  }, [fromDate, toDate, selectedEmployee]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Attendance Records</h1>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No records found for the selected filters.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.profiles.first_name} {record.profiles.last_name}
                      </TableCell>
                      <TableCell>{record.profiles.employee_id}</TableCell>
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
