import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, UserCircle, Lock, Camera, Edit, Save, X, 
  MapPin, Phone, Briefcase, Calendar, Building, Mail,
  Award, Lightbulb, FileText
} from 'lucide-react';
import { z } from 'zod';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

interface ProfileData {
  phone: string;
  address: string;
  date_of_birth: string;
  job_title: string;
  about: string;
  skill: string;
  certification: string;
}

export default function Profile() {
  const { profile, role, updatePassword, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { uploadAvatar, uploading } = useAvatarUpload(profile?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<ProfileData>({
    phone: '',
    address: '',
    date_of_birth: '',
    job_title: '',
    about: '',
    skill: '',
    certification: '',
  });

  // Load current profile data into edit form
  useEffect(() => {
    if (profile) {
      setEditData({
        phone: profile.phone || '',
        address: (profile as any).address || '',
        date_of_birth: (profile as any).date_of_birth || '',
        job_title: (profile as any).job_title || '',
        about: (profile as any).about || '',
        skill: (profile as any).skill || '',
        certification: (profile as any).certification || '',
      });
    }
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadAvatar(file);
      if (url) {
        refreshProfile();
      }
    }
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

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        phone: editData.phone || null,
        address: editData.address || null,
        date_of_birth: editData.date_of_birth || null,
        job_title: editData.job_title || null,
        about: editData.about || null,
        skill: editData.skill || null,
        certification: editData.certification || null,
      })
      .eq('id', profile.id);

    setSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully.',
      });
      setIsEditing(false);
      refreshProfile();
    }
  };

  const handleStartEditing = () => {
    setEditData({
      phone: profile?.phone || '',
      address: (profile as any)?.address || '',
      date_of_birth: (profile as any)?.date_of_birth || '',
      job_title: (profile as any)?.job_title || '',
      about: (profile as any)?.about || '',
      skill: (profile as any)?.skill || '',
      certification: (profile as any)?.certification || '',
    });
    setIsEditing(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        {/* Profile Header Card */}
        <Card className="shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
              {/* Avatar with upload */}
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold">{profile?.first_name} {profile?.last_name}</h2>
                <p className="text-muted-foreground">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                    <Briefcase className="h-3 w-3" />
                    {role}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                    {profile?.employee_id}
                  </span>
                </div>
              </div>
              
              {!isEditing && (
                <Button variant="outline" onClick={handleStartEditing}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Profile Information</CardTitle>
            {isEditing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {/* Basic Info - Read Only */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Full Name
                  </Label>
                  <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <p className="font-medium">{profile?.email}</p>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Department
                  </Label>
                  <p className="font-medium">{profile?.department || '-'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Employee ID
                  </Label>
                  <p className="font-medium font-mono">{profile?.employee_id}</p>
                </div>
              </div>

              <Separator />

              {/* Editable Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  ) : (
                    <p className="font-medium">{profile?.phone || '-'}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date of Birth
                  </Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editData.date_of_birth}
                      onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{(profile as any)?.date_of_birth || '-'}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Job Title
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editData.job_title}
                      onChange={(e) => setEditData({ ...editData, job_title: e.target.value })}
                      placeholder="e.g. Software Engineer"
                    />
                  ) : (
                    <p className="font-medium">{(profile as any)?.job_title || '-'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                {isEditing ? (
                  <Textarea
                    value={editData.address}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    placeholder="Enter your full address"
                    rows={2}
                  />
                ) : (
                  <p className="font-medium">{(profile as any)?.address || '-'}</p>
                )}
              </div>

              <Separator />

              {/* About, Skills, Certifications */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">About & Skills</h4>
                
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    About Me
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.about}
                      onChange={(e) => setEditData({ ...editData, about: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  ) : (
                    <p className="font-medium">{(profile as any)?.about || '-'}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Skills
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editData.skill}
                      onChange={(e) => setEditData({ ...editData, skill: e.target.value })}
                      placeholder="e.g., JavaScript, Project Management, Excel"
                    />
                  ) : (
                    <p className="font-medium">{(profile as any)?.skill || '-'}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Certifications
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editData.certification}
                      onChange={(e) => setEditData({ ...editData, certification: e.target.value })}
                      placeholder="e.g., PMP, AWS Certified, Google Analytics"
                    />
                  ) : (
                    <p className="font-medium">{(profile as any)?.certification || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  required
                />
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    required
                  />
                </div>
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
