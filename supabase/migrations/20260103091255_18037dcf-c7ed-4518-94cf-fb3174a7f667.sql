-- Create salary_details table
CREATE TABLE IF NOT EXISTS public.salary_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    
    -- Wage Configuration
    wage_type TEXT NOT NULL DEFAULT 'monthly' CHECK (wage_type IN ('monthly', 'yearly')),
    wage NUMERIC(12, 2) NOT NULL DEFAULT 0,
    working_days INTEGER DEFAULT 22,
    break_time NUMERIC(4, 2) DEFAULT 1,
    
    -- Salary Components (stored as JSONB for flexibility)
    components JSONB DEFAULT '[]'::jsonb,
    
    -- Bank Details
    bank_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    pan_no TEXT,
    uan_no TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one config per employee
    UNIQUE(employee_id)
);

-- Enable RLS
ALTER TABLE public.salary_details ENABLE ROW LEVEL SECURITY;

-- Admin can view all salary details (using existing has_role function)
CREATE POLICY "Admins can view all salary details"
    ON public.salary_details FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can insert salary details
CREATE POLICY "Admins can insert salary details"
    ON public.salary_details FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update salary details
CREATE POLICY "Admins can update salary details"
    ON public.salary_details FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Employees can view their own salary details
CREATE POLICY "Employees can view own salary details"
    ON public.salary_details FOR SELECT
    USING (employee_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_salary_details_updated_at
    BEFORE UPDATE ON public.salary_details
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();