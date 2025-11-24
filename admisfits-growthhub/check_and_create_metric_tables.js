// Script to check and create metric configuration tables in Supabase
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateTables() {
  try {
    console.log('Checking if project_metric_configs table exists...');
    
    // Try to query the table to see if it exists
    const { data, error } = await supabase
      .from('project_metric_configs')
      .select('count')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log('Table does not exist. Creating project_metric_configs table...');
      
      // Create the table using SQL
      const createTableSQL = `
        -- Create table for project metric configurations
        CREATE TABLE IF NOT EXISTS project_metric_configs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          project_id UUID NOT NULL,
          metric_name VARCHAR(255) NOT NULL,
          metric_key VARCHAR(100) NOT NULL,
          database_field VARCHAR(100) NOT NULL,
          aggregation_type VARCHAR(50) DEFAULT 'sum',
          calculation_type VARCHAR(50) DEFAULT 'total',
          format_type VARCHAR(50) DEFAULT 'number',
          icon VARCHAR(50) DEFAULT 'TrendingUp',
          display_order INTEGER DEFAULT 0,
          is_visible BOOLEAN DEFAULT true,
          is_main_metric BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(project_id, metric_key)
        );

        -- Add RLS policies
        ALTER TABLE project_metric_configs ENABLE ROW LEVEL SECURITY;

        -- Policy for authenticated users to see their project metric configs
        CREATE POLICY "Users can view their project metric configs" ON project_metric_configs
          FOR SELECT USING (true);

        -- Policy for authenticated users to insert their project metric configs
        CREATE POLICY "Users can insert their project metric configs" ON project_metric_configs
          FOR INSERT WITH CHECK (true);

        -- Policy for authenticated users to update their project metric configs
        CREATE POLICY "Users can update their project metric configs" ON project_metric_configs
          FOR UPDATE USING (true);

        -- Policy for authenticated users to delete their project metric configs
        CREATE POLICY "Users can delete their project metric configs" ON project_metric_configs
          FOR DELETE USING (true);

        -- Create updated_at trigger
        CREATE OR REPLACE FUNCTION update_project_metric_configs_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER update_project_metric_configs_updated_at
          BEFORE UPDATE ON project_metric_configs
          FOR EACH ROW
          EXECUTE FUNCTION update_project_metric_configs_updated_at();
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.error('Error creating table:', createError);
        console.log('Please run the SQL script manually in Supabase dashboard:');
        console.log('Go to Supabase dashboard > SQL Editor > and run the create_project_metric_configs.sql file');
        return;
      }
      
      console.log('Table created successfully!');
      
      // Now create default metrics for existing projects
      console.log('Creating default metrics for existing projects...');
      
      // First, get all projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id');
        
      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        return;
      }
      
      // Create default metrics for each project
      for (const project of projects || []) {
        await createDefaultMetrics(project.id);
      }
      
      console.log('Default metrics created for all projects!');
      
    } else if (error) {
      console.error('Error checking table:', error);
    } else {
      console.log('Table already exists!');
      
      // Check if we need to create default metrics for projects that don't have any
      const { data: projects } = await supabase
        .from('projects')
        .select('id');
        
      for (const project of projects || []) {
        const { data: existingConfigs } = await supabase
          .from('project_metric_configs')
          .select('id')
          .eq('project_id', project.id)
          .limit(1);
          
        if (!existingConfigs || existingConfigs.length === 0) {
          console.log(`Creating default metrics for project ${project.id}...`);
          await createDefaultMetrics(project.id);
        }
      }
    }
    
    console.log('Setup complete!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function createDefaultMetrics(projectId) {
  const defaultMetrics = [
    {
      project_id: projectId,
      metric_name: 'Revenue',
      metric_key: 'revenue',
      database_field: 'revenue',
      format_type: 'currency',
      icon: 'DollarSign',
      display_order: 1,
      is_main_metric: true,
      aggregation_type: 'sum'
    },
    {
      project_id: projectId,
      metric_name: 'Ad Spend',
      metric_key: 'spend',
      database_field: 'amount_spent',
      format_type: 'currency',
      icon: 'TrendingUp',
      display_order: 2,
      is_main_metric: true,
      aggregation_type: 'sum'
    },
    {
      project_id: projectId,
      metric_name: 'ROAS',
      metric_key: 'roas',
      database_field: 'roas',
      format_type: 'number',
      icon: 'Target',
      display_order: 3,
      is_main_metric: true,
      aggregation_type: 'average'
    },
    {
      project_id: projectId,
      metric_name: 'Conversions',
      metric_key: 'conversions',
      database_field: 'conversions',
      format_type: 'number',
      icon: 'Users',
      display_order: 4,
      is_main_metric: true,
      aggregation_type: 'sum'
    }
  ];

  const { error } = await supabase
    .from('project_metric_configs')
    .insert(defaultMetrics);

  if (error) {
    console.error(`Error creating default metrics for project ${projectId}:`, error);
  }
}

checkAndCreateTables();