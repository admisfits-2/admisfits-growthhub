import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];

interface ProjectViewDialogProps {
  project: Project;
  trigger?: React.ReactNode;
}

export default function ProjectViewDialog({ project, trigger }: ProjectViewDialogProps) {
  const navigate = useNavigate();

  const handleViewProject = () => {
    navigate(`/project/${project.id}`);
  };

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={handleViewProject}
    >
      <Eye className="h-4 w-4" />
    </Button>
  );
} 