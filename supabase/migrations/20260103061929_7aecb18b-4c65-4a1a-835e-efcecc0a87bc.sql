-- Add about, certification, and skill columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS about text,
ADD COLUMN IF NOT EXISTS certification text,
ADD COLUMN IF NOT EXISTS skill text;