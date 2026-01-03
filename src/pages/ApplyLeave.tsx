import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function ApplyLeave() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'casual',
    fromDate: '',
    toDate: '',
    reason: '',
    isHalfDay: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;

    if (new Date(formData.toDate) < new Date(formData.fromDate)) {
      toast({
        title: 'Validation Error',
        description: 'End date cannot be before start date.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('leave_requests').insert({
      employee_id: profile.id,
      leave_type: formData.leaveType,
      from_date: formData.fromDate,
      to_date: formData.toDate,
      reason: formData.reason,
      is_half_day: formData.isHalfDay,
    });
    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit leave request. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Leave request submitted successfully.',
      });
      navigate('/leave/status');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-3xl font-bold">Apply for Leave</h1>

        <Card>
          <CardHeader>
            <CardTitle>Leave Request Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select
                  value={formData.leaveType}
                  onValueChange={(value) => setFormData({ ...formData, leaveType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">To Date</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={formData.toDate}
                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="halfDay"
                  checked={formData.isHalfDay}
                  onCheckedChange={(checked) => setFormData({ ...formData, isHalfDay: checked as boolean })}
                />
                <Label htmlFor="halfDay" className="font-normal">Half Day Leave</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for leave..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
