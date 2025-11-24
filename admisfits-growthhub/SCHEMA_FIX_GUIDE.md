# Database Schema Fix Guide

## Issue
The error "Could not find the 'data_source_config' column of 'project_metric_configs' in the schema cache" indicates that the database schema is missing required columns for Meta Ads metrics support.

## Solution

### Step 1: Run the Schema Fix Script
Copy and paste the contents of `manual_fix_metric_configs_schema.sql` into your Supabase SQL Editor and execute it:

```sql
-- Manual fix for project_metric_configs table schema
-- Add missing columns if they don't exist
ALTER TABLE project_metric_configs 
ADD COLUMN IF NOT EXISTS data_source_type VARCHAR(50) DEFAULT 'database';

ALTER TABLE project_metric_configs 
ADD COLUMN IF NOT EXISTS data_source_config JSONB DEFAULT '{}';

-- Update existing records to have proper defaults
UPDATE project_metric_configs 
SET data_source_type = 'database', data_source_config = '{}'
WHERE data_source_type IS NULL OR data_source_config IS NULL;

-- Make database_field nullable for external data sources
ALTER TABLE project_metric_configs 
ALTER COLUMN database_field DROP NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_project_metric_configs_data_source_type 
ON project_metric_configs(data_source_type);
```

### Step 2: Verify the Schema
Run this query to verify the columns exist:

```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'project_metric_configs' 
ORDER BY ordinal_position;
```

You should see these columns:
- `data_source_type` (VARCHAR(50), nullable: NO, default: 'database')
- `data_source_config` (JSONB, nullable: YES, default: '{}')

### Step 3: Test Meta Ads Metrics
1. Go to Project Details > Metrics Configuration
2. Click "Add Metric"
3. Select "Meta Ads" as the data source
4. Choose any Meta Ads metric (e.g., "Impressions", "Ad Spend", "Conversions")
5. Configure the metric settings and save

## Expected Result
- Meta Ads metrics should now be available in the data source dropdown
- You can configure metrics using any of the 75+ available Meta Ads fields
- The metrics will automatically sync when viewing the dashboard

## Alternative: Create Table from Scratch
If the above doesn't work, you can also run the complete table creation script from `create_project_metric_configs.sql` followed by the data source migration from `supabase/migrations/20250118000007_add_metric_data_sources.sql`.

## Troubleshooting
- If you still get schema cache errors, try refreshing your Supabase dashboard
- Check that your project has the Meta Ads connection set up first
- Ensure you have the necessary permissions to alter tables in Supabase