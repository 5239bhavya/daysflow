import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, FileText } from 'lucide-react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { Navigate } from 'react-router-dom';

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_days: number | null;
  reason: string | null;
  status: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

export default function TimeOffApprovals() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        profiles:employee_id (
          first_name,
          last_name,
          employee_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setProcessing(requestId);

    try {
      // Get the request details first
      const request = requests.find(r => r.id === requestId);
      
      // Update the leave request status
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: action })
        .eq('id', requestId);

      if (error) throw error;

      // If approved, mark attendance as on_leave for each day in the range
      if (action === 'approved' && request) {
        const days = eachDayOfInterval({
          start: parseISO(request.from_date),
          end: parseISO(request.to_date),
        });

        for (const day of days) {
          const dateStr = format(day, 'yyyy-MM-dd');
          
          // Check if attendance exists for this day
          const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('employee_id', request.employee_id)
            .eq('date', dateStr)
            .single();

          if (existing) {
            // Update existing record
            await supabase
              .from('attendance')
              .update({ status: 'on_leave' })
              .eq('id', existing.id);
          } else {
            // Create new attendance record
            await supabase
              .from('attendance')
              .insert({
                employee_id: request.employee_id,
                date: dateStr,
                status: 'on_leave',
              });
          }
        }
      }

      toast({
        title: 'Success',
        description: `Request ${action} successfully.`,
      });

      fetchRequests();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="status-approved">Approved</Badge>;
      case 'rejected':
        return <Badge className="status-rejected">Rejected</Badge>;
      default:
        return <Badge className="status-pending">Pending</Badge>;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Time Off Requests
                </CardTitle>
                <CardDescription>
                  {pendingCount > 0 
                    ? `${pendingCount} pending request${pendingCount !== 1 ? 's' : ''} awaiting approval`
                    : 'All requests have been processed'
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No time off requests yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="uppercase text-xs font-semibold">Employee</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Type</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">From</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">To</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Days</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Reason</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Status</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {request.profiles?.first_name} {request.profiles?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {request.profiles?.employee_id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{request.leave_type}</TableCell>
                      <TableCell>{format(new Date(request.from_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(request.to_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{request.total_days || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {request.reason || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {request.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-[hsl(145,63%,49%)] hover:text-[hsl(145,63%,49%)] hover:bg-[hsl(145,63%,49%)]/10"
                              onClick={() => handleAction(request.id, 'approved')}
                              disabled={processing === request.id}
                            >
                              {processing === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-[hsl(6,78%,57%)] hover:text-[hsl(6,78%,57%)] hover:bg-[hsl(6,78%,57%)]/10"
                              onClick={() => handleAction(request.id, 'rejected')}
                              disabled={processing === request.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
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
