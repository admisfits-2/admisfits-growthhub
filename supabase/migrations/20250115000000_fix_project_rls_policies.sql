-- Drop existing project policies
DROP POLICY IF EXISTS "All authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and managers can manage projects" ON public.projects;

-- Create new RLS policies for projects
CREATE POLICY "All authenticated users can view projects" ON public.projects 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create projects" ON public.projects 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own projects" ON public.projects 
FOR UPDATE TO authenticated 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own projects" ON public.projects 
FOR DELETE TO authenticated 
USING (auth.uid() = created_by);

-- Admins and managers can manage all projects
CREATE POLICY "Admins and managers can manage all projects" ON public.projects 
FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')); 