# Database Setup Fix - Missing project_metric_configs Table

## Issue
The charts show "No Metrics Configured" because the `project_metric_configs` table doesn't exist in the database.

## Solution

You have two options to fix this:

### Option 1: Run Supabase Migrations (Recommended)

If you have Supabase CLI installed:

```bash
# Navigate to project directory
cd /path/to/your/project

# Run the migrations
supabase db reset
# or
supabase migration up
```

### Option 2: Manual SQL Execution

If you don't have Supabase CLI, execute these SQL scripts manually in your Supabase dashboard:

1. **Go to your Supabase Dashboard** → SQL Editor
2. **Run the following script first** (creates the table):

```sql
-- Create table for storing project metric configurations
CREATE TABLE IF NOT EXISTS project_metric_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metric configuration
  metric_name VARCHAR(100) NOT NULL,
  metric_key VARCHAR(50) NOT NULL,
  display_name VARCHAR(100),
  database_field VARCHAR(100) NOT NULL,
  format_type VARCHAR(20) NOT NULL DEFAULT 'number', -- 'number', 'currency', 'percentage'
  aggregation_type VARCHAR(20) NOT NULL DEFAULT 'sum', -- 'sum', 'average', 'max', 'min', 'last'
  
  -- Display settings
  icon VARCHAR(50) DEFAULT 'TrendingUp',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_main_metric BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique metric keys per project
  UNIQUE(project_id, metric_key)
);

-- Create indexes for better performance
CREATE INDEX idx_project_metric_configs_project_id ON project_metric_configs(project_id);
CREATE INDEX idx_project_metric_configs_main ON project_metric_configs(project_id, is_main_metric);
CREATE INDEX idx_project_metric_configs_visible ON project_metric_configs(project_id, is_visible);
CREATE INDEX idx_project_metric_configs_order ON project_metric_configs(project_id, display_order);

-- Create RLS policies
ALTER TABLE project_metric_configs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own project metric configs
CREATE POLICY "Users can view their own project metric configs"
  ON project_metric_configs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create metric configs for their projects
CREATE POLICY "Users can create metric configs for their projects"
  ON project_metric_configs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_metric_configs.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can update their own project metric configs
CREATE POLICY "Users can update their own project metric configs"
  ON project_metric_configs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own project metric configs
CREATE POLICY "Users can delete their own project metric configs"
  ON project_metric_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_project_metric_configs_updated_at
  BEFORE UPDATE ON project_metric_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

3. **Then run this script** (sets up default metrics for existing projects):

```sql
-- Setup default metrics for all existing projects that don't have any metrics configured
INSERT INTO project_metric_configs (project_id, user_id, metric_name, metric_key, database_field, aggregation_type, format_type, icon, display_order, is_visible, is_main_metric)
SELECT 
  p.id as project_id,
  p.user_id,
  unnest(ARRAY['Revenue', 'Ad Spend', 'ROAS', 'Conversions', 'Clicks', 'Impressions', 'CTR', 'CPC']) as metric_name,
  unnest(ARRAY['revenue', 'spend', 'roas', 'conversions', 'clicks', 'impressions', 'ctr', 'cpc']) as metric_key,
  unnest(ARRAY['revenue', 'amount_spent', 'roas', 'conversions', 'outbound_clicks', 'impressions', 'outbound_ctr', 'cpc']) as database_field,
  unnest(ARRAY['sum', 'sum', 'average', 'sum', 'sum', 'sum', 'average', 'average']) as aggregation_type,
  unnest(ARRAY['currency', 'currency', 'number', 'number', 'number', 'number', 'percentage', 'currency']) as format_type,
  unnest(ARRAY['DollarSign', 'TrendingUp', 'Target', 'Users', 'MousePointer', 'Eye', 'Activity', 'DollarSign']) as icon,
  unnest(ARRAY[1, 2, 3, 4, 5, 6, 7, 8]) as display_order,
  true as is_visible,
  unnest(ARRAY[true, true, true, true, false, false, false, false]) as is_main_metric
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_metric_configs pmc WHERE pmc.project_id = p.id
);
```

### After Running the Scripts

1. **Refresh your browser** - the app should automatically detect the new metrics
2. **Check the console** - you should see debug logs showing the metrics being loaded
3. **Charts should now appear** with default metrics (Revenue, Ad Spend, ROAS, Conversions)

## Debug Information

If you're still having issues, check the browser console (F12) for debug logs:
- 🔍 Shows which project ID it's fetching metrics for
- 📊 Shows retrieved metric configs 
- 🔢 Shows calculation results

## Files Modified
- Created: `supabase/migrations/20250118000005_create_project_metric_configs.sql`
- Enhanced: `src/hooks/useProjectMetrics.ts` (with auto-creation and debug logging)
- Improved: Chart error messages for better user feedback