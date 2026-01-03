
-- Create companies table for company setup
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  setup_complete BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view company info
CREATE POLICY "Authenticated users can view company"
ON public.companies FOR SELECT
TO authenticated
USING (true);

-- Only admins can update company
CREATE POLICY "Admins can update company"
ON public.companies FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add company_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Update attendance table with new fields
ALTER TABLE public.attendance 
  ADD COLUMN IF NOT EXISTS check_in TIME,
  ADD COLUMN IF NOT EXISTS check_out TIME,
  ADD COLUMN IF NOT EXISTS work_hours NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS extra_hours NUMERIC(4,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Update leave_requests table
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS total_days INTEGER;

-- Create function to generate admin ID
CREATE OR REPLACE FUNCTION public.generate_admin_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_id TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(employee_id FROM 'ADM-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM profiles
  WHERE employee_id LIKE 'ADM-' || year_part || '-%';
  
  new_id := 'ADM-' || year_part || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN new_id;
END;
$$;

-- Update employee ID generator to use EMP prefix
CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_id TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(employee_id FROM 'EMP-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM profiles
  WHERE employee_id LIKE 'EMP-' || year_part || '-%';
  
  new_id := 'EMP-' || year_part || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN new_id;
END;
$$;

-- Update attendance RLS to allow admin to insert/update for any employee
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance;

CREATE POLICY "Admins can insert any attendance"
ON public.attendance FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any attendance"
ON public.attendance FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow insert for companies (first admin setup)
CREATE POLICY "First admin can create company"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (true);
