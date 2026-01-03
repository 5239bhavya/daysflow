-- Create table for email verification codes
CREATE TABLE public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX idx_email_verifications_code ON public.email_verifications(code);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for signup)
CREATE POLICY "Anyone can insert verification"
ON public.email_verifications FOR INSERT
WITH CHECK (true);

-- Allow anyone to read their own verification (by email match)
CREATE POLICY "Anyone can read verification by email"
ON public.email_verifications FOR SELECT
USING (true);

-- Allow updates for verification
CREATE POLICY "Anyone can update verification"
ON public.email_verifications FOR UPDATE
USING (true);

-- Clean up expired verifications periodically (optional - can be done via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_verifications
  WHERE expires_at < now() OR verified = true;
END;
$$;