import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectService } from '@/lib/services/projectService';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export const useProjects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all projects
  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: projectsError,
    refetch: refetchProjects
  } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await ProjectService.getProjects();
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (project: Omit<ProjectInsert, 'created_by'>) => {
      const { data, error } = await ProjectService.createProject(project);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProjectUpdate }) => {
      const { data, error } = await ProjectService.updateProject(id, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  // Archive project mutation
  const archiveProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await ProjectService.archiveProject(id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  // Get project by ID
  const getProjectById = (id: string) => {
    return useQuery({
      queryKey: ['project', id],
      queryFn: async () => {
        const { data, error } = await ProjectService.getProjectById(id);
        if (error) throw error;
        return data;
      },
      enabled: !!id && !!user
    });
  };

  return {
    projects,
    isLoadingProjects,
    projectsError,
    refetchProjects,
    createProject: createProjectMutation.mutate,
    createProjectAsync: createProjectMutation.mutateAsync,
    isCreatingProject: createProjectMutation.isPending,
    createProjectError: createProjectMutation.error,
    updateProject: updateProjectMutation.mutate,
    updateProjectAsync: updateProjectMutation.mutateAsync,
    isUpdatingProject: updateProjectMutation.isPending,
    updateProjectError: updateProjectMutation.error,
    archiveProject: archiveProjectMutation.mutate,
    archiveProjectAsync: archiveProjectMutation.mutateAsync,
    isArchivingProject: archiveProjectMutation.isPending,
    archiveProjectError: archiveProjectMutation.error,
    getProjectById
  };
}; 