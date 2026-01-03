import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Building, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Navigate } from 'react-router-dom';

const employeeSchema = z.object({
  name: z.string().min(1, 'Employee name is required'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  department: z.string().min(1, 'Department is required'),
});

interface CreatedEmployee {
  employeeId: string;
  temporaryPassword: string;
  name: string;
}

export default function CreateEmployee() {
  const { role, profile } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<CreatedEmployee | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = employeeSchema.safeParse(formData);
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || formData.name;
      const lastName = nameParts.slice(1).join(' ') || '';
      const temporaryPassword = generateTemporaryPassword();
      
      // Use a generated email if not provided
      const email = formData.email || `emp-${Date.now()}@dayflow.internal`;

      // Create employee user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: temporaryPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'employee',
            department: formData.department,
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create employee user');
      }

      // Wait for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get the generated employee ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('employee_id')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Update with department and company_id
      await supabase
        .from('profiles')
        .update({
          department: formData.department,
          company_id: profile?.company_id || null,
        })
        .eq('id', authData.user.id);

      const employeeId = profileData?.employee_id || 'EMP-XXXX-XXX';

      setCreatedEmployee({
        employeeId,
        temporaryPassword,
        name: formData.name,
      });

      toast({
        title: 'Employee Created!',
        description: 'Share the credentials with the employee securely.',
      });

      // Reset form
      setFormData({ name: '', email: '', department: '' });

    } catch (error: any) {
      console.error('Create employee error:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'An error occurred while creating the employee',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'id' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateAnother = () => {
    setCreatedEmployee(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {createdEmployee ? (
          <Card className="shadow-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-[hsl(145,63%,49%)]/10 flex items-center justify-center mb-2">
                <Check className="h-6 w-6 text-[hsl(145,63%,49%)]" />
              </div>
              <CardTitle className="text-xl font-semibold">Employee Created Successfully</CardTitle>
              <CardDescription>
                Share these credentials with <strong>{createdEmployee.name}</strong> securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium">Employee ID</p>
                    <p className="text-lg font-mono font-semibold">{createdEmployee.employeeId}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdEmployee.employeeId, 'id')}
                  >
                    {copiedId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium">Temporary Password</p>
                    <p className="text-lg font-mono font-semibold">{createdEmployee.temporaryPassword}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdEmployee.temporaryPassword, 'password')}
                  >
                    {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                ⚠️ The employee should change their password after first login
              </p>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={handleCreateAnother}>
                  Create Another Employee
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Create New Employee</CardTitle>
              <CardDescription>
                Add a new employee to the system. They will receive login credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Employee Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Enter full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select department" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="HR">Human Resources</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="employee@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for communication/reference only
                  </p>
                </div>

                <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Employee
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
