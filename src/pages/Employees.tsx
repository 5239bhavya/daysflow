import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Search, Mail, Building, BadgeCheck, 
  Phone, MapPin, Calendar, Briefcase, DollarSign, Plane, Circle,
  Pencil, Trash2, UserPlus
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  employee_id: string;
  department: string | null;
  avatar_url: string | null;
  address: string | null;
  date_of_birth: string | null;
  hire_date: string | null;
  job_title: string | null;
  basic_salary: number | null;
  created_at: string | null;
  about: string | null;
  certification: string | null;
  skill: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface AttendanceStatus {
  employee_id: string;
  status: string;
}

const departments = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Support'];

export default function Employees() {
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<(Profile & { role?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<(Profile & { role?: string }) | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, string>>(new Map());
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    department: '',
    job_title: '',
    address: '',
    basic_salary: '',
    date_of_birth: '',
    hire_date: '',
    about: '',
    certification: '',
    skill: '',
  });

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchEmployees = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const [profilesRes, rolesRes, attendanceRes] = await Promise.all([
      supabase.from('profiles').select('*').order('first_name'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('attendance').select('employee_id, status').eq('date', today),
    ]);

    if (profilesRes.data && rolesRes.data) {
      const rolesMap = new Map(rolesRes.data.map((r: UserRole) => [r.user_id, r.role]));
      const enriched = profilesRes.data.map((emp: Profile) => ({
        ...emp,
        role: rolesMap.get(emp.id) || 'employee',
      }));
      setEmployees(enriched);
    }

    if (attendanceRes.data) {
      const attMap = new Map(attendanceRes.data.map((a: AttendanceStatus) => [a.employee_id, a.status]));
      setAttendanceMap(attMap);
    }

    setLoading(false);
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    fetchEmployees();

    // Subscribe to real-time attendance changes
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `date=eq.${today}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRecord = payload.new as AttendanceStatus;
            setAttendanceMap((prev) => {
              const updated = new Map(prev);
              updated.set(newRecord.employee_id, newRecord.status);
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as AttendanceStatus;
            setAttendanceMap((prev) => {
              const updated = new Map(prev);
              updated.delete(oldRecord.employee_id);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCardClick = (employee: Profile & { role?: string }) => {
    setSelectedEmployee(employee);
    setDetailsOpen(true);
  };

  const handleEditClick = (employee: Profile & { role?: string }) => {
    setSelectedEmployee(employee);
    setEditForm({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      phone: employee.phone || '',
      department: employee.department || '',
      job_title: employee.job_title || '',
      address: employee.address || '',
      basic_salary: employee.basic_salary?.toString() || '',
      date_of_birth: employee.date_of_birth || '',
      hire_date: employee.hire_date || '',
      about: employee.about || '',
      certification: employee.certification || '',
      skill: employee.skill || '',
    });
    setDetailsOpen(false);
    setEditOpen(true);
  };

  const handleDeleteClick = (employee: Profile & { role?: string }) => {
    setSelectedEmployee(employee);
    setDetailsOpen(false);
    setDeleteOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEmployee) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone || null,
          department: editForm.department || null,
          job_title: editForm.job_title || null,
          address: editForm.address || null,
          basic_salary: editForm.basic_salary ? parseFloat(editForm.basic_salary) : null,
          date_of_birth: editForm.date_of_birth || null,
          hire_date: editForm.hire_date || null,
          about: editForm.about || null,
          certification: editForm.certification || null,
          skill: editForm.skill || null,
        })
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      toast({
        title: 'Employee Updated',
        description: 'Employee details have been saved successfully.',
      });

      setEditOpen(false);
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update employee',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;
    
    setSaving(true);
    try {
      // Note: This will delete the profile. The auth user would need to be deleted separately via admin API
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      toast({
        title: 'Employee Removed',
        description: 'Employee has been removed from the system.',
      });

      setDeleteOpen(false);
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete employee',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const searchLower = search.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(searchLower) ||
      emp.last_name.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower) ||
      (emp.department?.toLowerCase().includes(searchLower) ?? false) ||
      emp.employee_id.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getAttendanceIndicator = (employeeId: string) => {
    const status = attendanceMap.get(employeeId);
    
    if (status === 'present') {
      return (
        <div className="absolute top-3 right-3" title="Present">
          <Circle className="h-4 w-4 fill-green-500 text-green-500" />
        </div>
      );
    } else if (status === 'on_leave') {
      return (
        <div className="absolute top-3 right-3" title="On Leave">
          <Plane className="h-4 w-4 text-blue-500" />
        </div>
      );
    } else if (status === 'absent') {
      return (
        <div className="absolute top-3 right-3" title="Absent">
          <Circle className="h-4 w-4 fill-yellow-500 text-yellow-500" />
        </div>
      );
    }
    
    return (
      <div className="absolute top-3 right-3" title="No attendance marked">
        <Circle className="h-4 w-4 text-gray-300" />
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 fill-green-500 text-green-500" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-2">
              <Plane className="h-3 w-3 text-blue-500" />
              <span>On Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <span>Absent</span>
            </div>
          </div>
          <Button onClick={() => navigate('/employees/create')} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Employee Cards Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No employees found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEmployees.map((employee) => (
              <Card 
                key={employee.id} 
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
                onClick={() => handleCardClick(employee)}
              >
                {getAttendanceIndicator(employee.id)}
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-20 w-20 mb-4">
                      <AvatarImage src={employee.avatar_url || undefined} />
                      <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <h3 className="font-semibold text-lg text-foreground">
                      {employee.first_name} {employee.last_name}
                    </h3>

                    <p className="text-sm text-muted-foreground mb-3">
                      {employee.employee_id}
                    </p>

                    <div className="w-full space-y-2 text-left">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-foreground">{employee.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground">{employee.department || 'Not Assigned'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <BadgeCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                          {employee.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Employee Details Modal */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Employee Details</DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <div className="flex-1 overflow-y-auto space-y-5 pr-2">
                {/* Header with Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 flex-shrink-0">
                    <AvatarImage src={selectedEmployee.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {selectedEmployee.first_name?.[0]}{selectedEmployee.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold truncate">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </h3>
                    <p className="text-muted-foreground font-mono text-sm">{selectedEmployee.employee_id}</p>
                    <Badge variant={selectedEmployee.role === 'admin' ? 'default' : 'secondary'} className="capitalize mt-1">
                      {selectedEmployee.role}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Contact Information</h4>
                  <div className="grid gap-2.5">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{selectedEmployee.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{selectedEmployee.phone || '-'}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="break-words">{selectedEmployee.address || '-'}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Job Information */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Job Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <Building className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium text-sm truncate">{selectedEmployee.department || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Job Title</p>
                        <p className="font-medium text-sm truncate">{selectedEmployee.job_title || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Salary</p>
                        <p className="font-medium text-sm">{formatCurrency(selectedEmployee.basic_salary)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Hire Date</p>
                        <p className="font-medium text-sm">
                          {selectedEmployee.hire_date 
                            ? format(new Date(selectedEmployee.hire_date), 'MMM d, yyyy')
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Profile - About, Skills, Certifications */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Profile</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">About</p>
                      <p className="text-sm">{selectedEmployee.about || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Skills</p>
                      <p className="text-sm">{selectedEmployee.skill || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Certifications</p>
                      <p className="text-sm">{selectedEmployee.certification || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2 pb-1">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2"
                    onClick={() => handleEditClick(selectedEmployee)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1 gap-2"
                    onClick={() => handleDeleteClick(selectedEmployee)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Employee Modal */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={editForm.department} 
                  onValueChange={(value) => setEditForm({ ...editForm, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="basic_salary">Basic Salary</Label>
                <Input
                  id="basic_salary"
                  type="number"
                  value={editForm.basic_salary}
                  onChange={(e) => setEditForm({ ...editForm, basic_salary: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={editForm.date_of_birth}
                    onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hire_date">Hire Date</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={editForm.hire_date}
                    onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
                  />
                </div>
              </div>

              <Separator className="my-2" />
              <h4 className="text-sm font-semibold text-muted-foreground">Profile Information</h4>

              <div className="space-y-2">
                <Label htmlFor="about">About</Label>
                <Input
                  id="about"
                  placeholder="Brief description about the employee"
                  value={editForm.about}
                  onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skill">Skills</Label>
                <Input
                  id="skill"
                  placeholder="e.g., JavaScript, Project Management"
                  value={editForm.skill}
                  onChange={(e) => setEditForm({ ...editForm, skill: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certification">Certifications</Label>
                <Input
                  id="certification"
                  placeholder="e.g., PMP, AWS Certified"
                  value={editForm.certification}
                  onChange={(e) => setEditForm({ ...editForm, certification: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{selectedEmployee?.first_name} {selectedEmployee?.last_name}</strong> ({selectedEmployee?.employee_id}) from the system? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}