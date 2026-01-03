import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function Profile() {
  const { profile, role, updatePassword, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    department: profile?.department || '',
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: editedProfile.first_name,
        last_name: editedProfile.last_name,
        phone: editedProfile.phone,
        department: editedProfile.department,
      })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully.',
      });
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = passwordSchema.safeParse(passwords);
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);

    // First verify current password by trying to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || '',
      password: passwords.currentPassword,
    });

    if (signInError) {
      toast({
        title: 'Error',
        description: 'Current password is incorrect.',
        variant: 'destructive',
      });
      setChangingPassword(false);
      return;
    }

    const { error } = await updatePassword(passwords.newPassword);
    setChangingPassword(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Password changed successfully.',
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-3xl font-bold">Profile</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Profile Information
              {role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (editing) {
                      setEditedProfile({
                        first_name: profile?.first_name || '',
                        last_name: profile?.last_name || '',
                        phone: profile?.phone || '',
                        department: profile?.department || '',
                      });
                    }
                    setEditing(!editing);
                  }}
                >
                  {editing ? 'Cancel' : 'Edit'}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {profile?.first_name} {profile?.last_name}
                </h2>
                <p className="text-muted-foreground capitalize">{role}</p>
              </div>
            </div>

            <div className="grid gap-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={editedProfile.first_name}
                        onChange={(e) => setEditedProfile({ ...editedProfile, first_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={editedProfile.last_name}
                        onChange={(e) => setEditedProfile({ ...editedProfile, last_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={editedProfile.department}
                      onChange={(e) => setEditedProfile({ ...editedProfile, department: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Employee ID</Label>
                      <p className="font-medium">{profile?.employee_id}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{profile?.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{profile?.phone || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Department</Label>
                      <p className="font-medium">{profile?.department || '-'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  required
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
