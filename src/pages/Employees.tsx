import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, Search, UserCircle, Mail, Building, BadgeCheck, 
  Phone, MapPin, Calendar, Briefcase, DollarSign, X, Plane, Circle
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
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
}

interface UserRole {
  user_id: string;
  role: string;
}

interface AttendanceStatus {
  employee_id: string;
  status: string;
}

export default function Employees() {
  const { role } = useAuth();
  const [employees, setEmployees] = useState<(Profile & { role?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<(Profile & { role?: string }) | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, string>>(new Map());

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
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

      // Create attendance map
      if (attendanceRes.data) {
        const attMap = new Map(attendanceRes.data.map((a: AttendanceStatus) => [a.employee_id, a.status]));
        setAttendanceMap(attMap);
      }

      setLoading(false);
    };

    fetchEmployees();
  }, []);

  const handleCardClick = (employee: Profile & { role?: string }) => {
    setSelectedEmployee(employee);
    setDetailsOpen(true);
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
    
    // No attendance record for today
    return (
      <div className="absolute top-3 right-3" title="No attendance marked">
        <Circle className="h-4 w-4 text-gray-300" />
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Legend */}
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
          <div className="flex items-center gap-2">
            <Circle className="h-3 w-3 text-gray-300" />
            <span>Not Marked</span>
          </div>
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
                    {/* Avatar */}
                    <Avatar className="h-20 w-20 mb-4">
                      <AvatarImage src={employee.avatar_url || undefined} />
                      <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name */}
                    <h3 className="font-semibold text-lg text-foreground">
                      {employee.first_name} {employee.last_name}
                    </h3>

                    {/* Employee ID */}
                    <p className="text-sm text-muted-foreground mb-3">
                      {employee.employee_id}
                    </p>

                    {/* Info Items */}
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-6">
                {/* Header with Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedEmployee.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {selectedEmployee.first_name?.[0]}{selectedEmployee.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </h3>
                    <p className="text-muted-foreground font-mono">{selectedEmployee.employee_id}</p>
                    <Badge variant={selectedEmployee.role === 'admin' ? 'default' : 'secondary'} className="capitalize mt-1">
                      {selectedEmployee.role}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Contact Information</h4>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEmployee.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEmployee.phone || '-'}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{selectedEmployee.address || '-'}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Job Information */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Job Information</h4>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="font-medium">{selectedEmployee.department || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Job Title</p>
                        <p className="font-medium">{selectedEmployee.job_title || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Hire Date</p>
                        <p className="font-medium">
                          {selectedEmployee.hire_date 
                            ? format(new Date(selectedEmployee.hire_date), 'MMM d, yyyy')
                            : '-'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Basic Salary</p>
                        <p className="font-medium">{formatCurrency(selectedEmployee.basic_salary)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Personal Information */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Personal Information</h4>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">
                          {selectedEmployee.date_of_birth 
                            ? format(new Date(selectedEmployee.date_of_birth), 'MMM d, yyyy')
                            : '-'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Joined</p>
                        <p className="font-medium">
                          {selectedEmployee.created_at 
                            ? format(new Date(selectedEmployee.created_at), 'MMM d, yyyy')
                            : '-'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}