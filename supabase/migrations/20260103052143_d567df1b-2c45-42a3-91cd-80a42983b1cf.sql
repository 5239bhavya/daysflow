-- Allow employees to insert their own attendance (check-in)
CREATE POLICY "Employees can check in"
ON public.attendance FOR INSERT
WITH CHECK (employee_id = auth.uid());

-- Allow employees to update their own attendance (check-out)
CREATE POLICY "Employees can check out"
ON public.attendance FOR UPDATE
USING (employee_id = auth.uid() AND status = 'present');

-- Enable realtime for attendance table
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;