-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create payroll table
CREATE TABLE public.payroll (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) GENERATED ALWAYS AS (basic_salary + allowances - deductions) STORED,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
  paid_date DATE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'leave', 'attendance', 'payroll')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add profile enhancement columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(12,2) DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Payroll RLS policies
CREATE POLICY "Admins can view all payroll"
ON public.payroll FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert payroll"
ON public.payroll FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payroll"
ON public.payroll FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view their own payroll"
ON public.payroll FOR SELECT
USING (employee_id = auth.uid());

-- Notifications RLS policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can insert notifications for anyone"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Updated timestamp trigger for payroll
CREATE TRIGGER update_payroll_updated_at
  BEFORE UPDATE ON public.payroll
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_category TEXT DEFAULT 'general'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, category)
  VALUES (p_user_id, p_title, p_message, p_type, p_category)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger to notify on leave status change
CREATE OR REPLACE FUNCTION public.notify_leave_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM public.create_notification(
      NEW.employee_id,
      'Leave Request ' || INITCAP(NEW.status),
      'Your ' || NEW.leave_type || ' request from ' || NEW.from_date || ' to ' || NEW.to_date || ' has been ' || NEW.status || '.',
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
      'leave'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_leave_status_change
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_leave_status_change();