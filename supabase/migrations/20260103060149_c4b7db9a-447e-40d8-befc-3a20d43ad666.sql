-- Create a function to get email by employee_id for login (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_email_by_employee_id(p_employee_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email
  FROM public.profiles
  WHERE employee_id = p_employee_id;
  
  RETURN user_email;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_employee_id(text) TO authenticated;