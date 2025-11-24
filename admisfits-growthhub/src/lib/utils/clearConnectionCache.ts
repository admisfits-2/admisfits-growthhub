// This function should be called from within a React component that has access to useQueryClient
export function getClearConnectionCacheFunction() {
  return (queryClient: any, projectId?: string) => {
    if (projectId) {
      // Clear specific project caches
      queryClient.invalidateQueries({ queryKey: ['meta-connection', projectId] });
      queryClient.invalidateQueries({ queryKey: ['google-connection', projectId] });
      console.log(`Cleared connection cache for project ${projectId}`);
    } else {
      // Clear all connection caches
      queryClient.invalidateQueries({ queryKey: ['meta-connection'] });
      queryClient.invalidateQueries({ queryKey: ['google-connection'] });
      console.log('Cleared all connection caches');
    }
  };
}