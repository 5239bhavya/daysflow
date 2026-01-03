import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Users, 
  FileText, 
  DollarSign, 
  Shield, 
  BarChart3,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Employee Management',
    description: 'Easily onboard, manage, and track all employee information in one centralized system.',
  },
  {
    icon: Clock,
    title: 'Attendance Tracking',
    description: 'Monitor daily attendance with check-in/check-out times, work hours, and status indicators.',
  },
  {
    icon: FileText,
    title: 'Leave Management',
    description: 'Streamline leave requests with automated workflows and instant approval notifications.',
  },
  {
    icon: DollarSign,
    title: 'Payroll Processing',
    description: 'Calculate salaries, manage allowances and deductions with complete transparency.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Secure data with role-based permissions for admins and employees.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Insights',
    description: 'Get instant notifications and dashboard analytics for informed decisions.',
  },
];

const benefits = [
  'Automated attendance tracking',
  'Instant leave approvals',
  'Transparent payroll management',
  'Real-time notifications',
  'Secure employee data',
  'Mobile-friendly interface',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Dayflow</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/setup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Secure & Reliable HRMS Solution
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
            Streamline Your
            <span className="text-primary block mt-2">HR Operations</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Dayflow is a comprehensive Human Resource Management System designed to simplify 
            employee management, attendance tracking, leave requests, and payroll processing.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/setup">
              <Button size="lg" className="px-8 gap-2">
                Start Free Setup
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="px-8">
                Login to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features to manage your workforce efficiently
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-background rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Why Choose Dayflow?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Built for modern HR teams who need a reliable, secure, and easy-to-use 
                solution for managing their workforce.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl p-8 lg:p-12">
              <div className="space-y-6">
                <div className="bg-background rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Leave Approved</p>
                      <p className="text-sm text-muted-foreground">Your vacation request was approved</p>
                    </div>
                  </div>
                </div>
                <div className="bg-background rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Salary Processed</p>
                      <p className="text-sm text-muted-foreground">January payroll has been processed</p>
                    </div>
                  </div>
                </div>
                <div className="bg-background rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Checked In</p>
                      <p className="text-sm text-muted-foreground">Today at 9:00 AM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your HR?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Set up your company in minutes and start managing your workforce more efficiently today.
          </p>
          <Link to="/setup">
            <Button size="lg" variant="secondary" className="px-8 gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Dayflow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Dayflow HRMS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
