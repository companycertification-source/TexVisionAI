-- =====================================================
-- WeldVision AI - User Roles Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'inspector', 'viewer', 'manager')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON public.user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-run)
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can insert default roles" ON public.user_roles;

-- Policy: Everyone can read their own role
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can see all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Admins can update roles (but not their own - prevents lockout)
CREATE POLICY "Admins can update roles" ON public.user_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Admins can insert new role assignments
CREATE POLICY "Admins can insert roles" ON public.user_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Allow users to insert their own default role (for new signups)
CREATE POLICY "System can insert default roles" ON public.user_roles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND role = 'viewer'
    );

-- =====================================================
-- IMPORTANT: First Admin Setup
-- =====================================================
-- After you run this script, you need to manually add your first admin.
-- Replace 'your-email@example.com' with your actual email.

-- Option 1: If user already exists in auth.users
-- INSERT INTO public.user_roles (user_id, email, role)
-- SELECT id, email, 'admin'
-- FROM auth.users
-- WHERE email = 'companycertification@gmail.com';

-- Option 2: Direct insert (get user_id from Supabase Auth > Users)
-- INSERT INTO public.user_roles (user_id, email, role)
-- VALUES ('YOUR-USER-UUID-HERE', 'your-email@example.com', 'admin');

-- =====================================================
-- Verification Queries
-- =====================================================
-- Check if table was created:
-- SELECT * FROM public.user_roles;

-- Check policies:
-- SELECT * FROM pg_policies WHERE tablename = 'user_roles';
