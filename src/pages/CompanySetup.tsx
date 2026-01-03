import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, User, Lock, Upload, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const setupSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  adminName: z.string().min(1, 'Admin name is required'),
  adminEmail: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function CompanySetup() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [formData, setFormData] = useState({
    companyName: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Error checking setup:', error);
      }
      
      setSetupComplete(data && data.length > 0);
      setCheckingSetup(false);
    };

    checkSetup();
  }, []);

  if (authLoading || checkingSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If setup is complete, redirect to login
  if (setupComplete) {
    return <Navigate to="/login" replace />;
  }

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File',
          description: 'Please upload an image file (PNG or JPG)',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = setupSchema.safeParse(formData);
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
      // 1. Create admin user with Supabase Auth
      const nameParts = formData.adminName.trim().split(' ');
      const firstName = nameParts[0] || formData.adminName;
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'admin',
            is_initial_admin: true,
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create admin user');
      }

      // Wait for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Create company record
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.companyName,
          setup_complete: true,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 3. Generate custom employee ID using the new function
      const { data: customIdResult } = await supabase.rpc('generate_custom_employee_id', {
        p_first_name: firstName,
        p_last_name: lastName,
        p_company_name: formData.companyName,
        p_hire_year: new Date().getFullYear(),
      });

      // 4. Update admin profile with company_id and custom employee_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_id: companyData.id,
          employee_id: customIdResult || `${formData.companyName.split(' ').map(w => w[0]).join('').toUpperCase()}${firstName.slice(0, 2).toUpperCase()}${lastName.slice(0, 2).toUpperCase()}${new Date().getFullYear()}0001`,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      toast({
        title: 'Setup Complete!',
        description: 'Company and admin account created successfully. Please check your email to verify your account.',
      });

      navigate('/verify-email');
      sessionStorage.setItem('pendingVerificationEmail', formData.adminEmail);

    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'An error occurred during setup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-semibold text-primary">Dayflow Setup</CardTitle>
          <CardDescription className="text-base">
            Set up your company and create the first admin account
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Company Details
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Company Logo (Optional)</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="h-16 w-16 rounded-lg border border-border overflow-hidden">
                      <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/50">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleLogoChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">PNG or JPG only</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Admin Account
              </h3>

              <div className="space-y-2">
                <Label htmlFor="adminName">Admin Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminName"
                    placeholder="Enter admin full name"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@company.com"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          </form>

          <p className="mt-4 text-xs text-center text-muted-foreground">
            This setup can only be done once. After completion, only the login page will be accessible.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
