import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LeaveRequest {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string | null;
  is_half_day: boolean;
  status: string;
  created_at: string;
}

export default function LeaveStatus() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!profile) return;

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests:', error);
      } else {
        setRequests(data || []);
      }
      setLoading(false);
    };

    fetchRequests();
  }, [profile]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-yellow-600">Pending</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Leave Status</h1>

        <Card>
          <CardHeader>
            <CardTitle>My Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No leave requests found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="capitalize font-medium">{request.leave_type}</TableCell>
                      <TableCell>{format(new Date(request.from_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(request.to_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{request.is_half_day ? 'Half Day' : 'Full Day'}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{format(new Date(request.created_at), 'MMM d, yyyy')}</TableCell>
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
