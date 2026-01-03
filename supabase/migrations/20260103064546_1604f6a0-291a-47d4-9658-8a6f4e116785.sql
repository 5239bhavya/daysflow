-- Update the handle_new_user function to use the new ID format
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  new_employee_id text;
  company_name text;
BEGIN
  -- Get the role from user metadata
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'employee');
  
  -- Get company name for the prefix
  SELECT name INTO company_name FROM public.companies LIMIT 1;
  
  -- Generate the custom employee ID
  new_employee_id := public.generate_custom_employee_id(
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'XX'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'XX'),
    company_name,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  );

  INSERT INTO public.profiles (id, first_name, last_name, email, phone, employee_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    new_employee_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'employee')
  );
  
  RETURN NEW;
END;
$$;