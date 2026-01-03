import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Calendar, FileText, Paperclip } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface LeaveRequest {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_days: number | null;
  reason: string | null;
  status: string;
  attachment_url: string | null;
  created_at: string;
}

interface LeaveBalance {
  paidLeave: number;
  sickLeave: number;
}

export default function TimeOff() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [balance] = useState<LeaveBalance>({ paidLeave: 12, sickLeave: 6 });
  
  const [formData, setFormData] = useState({
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: '',
  });
  const [calculatedDays, setCalculatedDays] = useState(0);

  const fetchRequests = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', profile.id)
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
  }, [profile]);

  useEffect(() => {
    if (formData.fromDate && formData.toDate) {
      const days = differenceInDays(new Date(formData.toDate), new Date(formData.fromDate)) + 1;
      setCalculatedDays(days > 0 ? days : 0);
    } else {
      setCalculatedDays(0);
    }
  }, [formData.fromDate, formData.toDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.leaveType || !formData.fromDate || !formData.toDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (calculatedDays <= 0) {
      toast({
        title: 'Invalid Dates',
        description: 'To date must be after or equal to From date',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('leave_requests').insert({
        employee_id: profile?.id,
        leave_type: formData.leaveType,
        from_date: formData.fromDate,
        to_date: formData.toDate,
        total_days: calculatedDays,
        reason: formData.reason || null,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Your time off request has been submitted for approval.',
      });

      setDialogOpen(false);
      setFormData({ leaveType: '', fromDate: '', toDate: '', reason: '' });
      fetchRequests();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Balance Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Paid Time Off Balance</p>
              <p className="text-2xl font-semibold">{balance.paidLeave} days</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Sick Leave Balance</p>
              <p className="text-2xl font-semibold">{balance.sickLeave} days</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Time Off Requests</CardTitle>
                <CardDescription>Your leave history and pending requests</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Request Time Off
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Request Time Off</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Time Off Type *</Label>
                      <Select
                        value={formData.leaveType}
                        onValueChange={(value) => setFormData({ ...formData, leaveType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Paid Time Off</SelectItem>
                          <SelectItem value="sick">Sick Leave</SelectItem>
                          <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Date *</Label>
                        <Input
                          type="date"
                          value={formData.fromDate}
                          onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>To Date *</Label>
                        <Input
                          type="date"
                          value={formData.toDate}
                          onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {calculatedDays > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Total: <strong>{calculatedDays}</strong> day{calculatedDays !== 1 ? 's' : ''}
                      </p>
                    )}

                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Textarea
                        placeholder="Describe your reason..."
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      />
                    </div>

                    {formData.leaveType === 'sick' && (
                      <div className="space-y-2">
                        <Label>Attachment (Medical Certificate)</Label>
                        <Input type="file" accept=".pdf,.jpg,.jpeg,.png" />
                        <p className="text-xs text-muted-foreground">Required for sick leave</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Request
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No time off requests yet. Click "Request Time Off" to submit one.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="uppercase text-xs font-semibold">Type</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">From</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">To</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Days</TableHead>
                    <TableHead className="uppercase text-xs font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="capitalize">{request.leave_type} Leave</TableCell>
                      <TableCell>{format(new Date(request.from_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(request.to_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{request.total_days || '-'}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
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
