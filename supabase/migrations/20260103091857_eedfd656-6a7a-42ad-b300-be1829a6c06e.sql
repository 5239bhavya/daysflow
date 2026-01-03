-- Delete employee function for admin cleanup
CREATE OR REPLACE FUNCTION public.delete_employee(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_email text;
    deleted_name text;
BEGIN
    -- Check if caller is admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Permission denied: Admin access required'
        );
    END IF;

    -- Get employee info before deletion
    SELECT email, first_name || ' ' || last_name 
    INTO deleted_email, deleted_name
    FROM public.profiles
    WHERE id = p_user_id;

    -- Check if user exists
    IF deleted_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Employee not found'
        );
    END IF;

    -- Delete from related tables
    DELETE FROM public.salary_details WHERE employee_id = p_user_id;
    DELETE FROM public.attendance WHERE employee_id = p_user_id;
    DELETE FROM public.leave_requests WHERE employee_id = p_user_id;
    DELETE FROM public.payroll WHERE employee_id = p_user_id;
    DELETE FROM public.notifications WHERE user_id = p_user_id;
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    DELETE FROM public.profiles WHERE id = p_user_id;

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Employee deleted successfully',
        'deleted_email', deleted_email,
        'deleted_name', deleted_name
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error deleting employee: ' || SQLERRM
        );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_employee(uuid) TO authenticated;