import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, User } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  employee_id: string;
  department: string | null;
  avatar_url: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

export default function EmployeeDirectory() {
  const { role } = useAuth();
  const [employees, setEmployees] = useState<(Profile & { role?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const fetchEmployees = async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('first_name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (profilesRes.data && rolesRes.data) {
        const rolesMap = new Map(rolesRes.data.map((r: UserRole) => [r.user_id, r.role]));
        const enriched = profilesRes.data.map((emp: Profile) => ({
          ...emp,
          role: rolesMap.get(emp.id) || 'employee',
        }));
        setEmployees(enriched);
      }
      setLoading(false);
    };

    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    const searchLower = search.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(searchLower) ||
      emp.last_name.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower) ||
      (emp.department?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold">Employee Directory</h1>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No employees found.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {employee.avatar_url ? (
                        <img
                          src={employee.avatar_url}
                          alt={`${employee.first_name} ${employee.last_name}`}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-xs">
                          {employee.employee_id}
                        </span>
                        {employee.department && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
                            {employee.department}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs capitalize">
                          {employee.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
