-- =====================================================
-- CONSOLIDATED DATABASE SCHEMA FOR ADMISFITS GROWTHHUB
-- This file contains all necessary SQL for the database
-- =====================================================

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'analyst', 'client');
CREATE TYPE public.project_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');

-- =====================================================
-- 2. UTILITY FUNCTIONS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'analyst');
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 3. CORE TABLES
-- =====================================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'analyst',
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project metrics table for time-series data
CREATE TABLE public.project_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Sales Metrics
  new_sales_calls INTEGER DEFAULT 0,
  scheduled_calls INTEGER DEFAULT 0,
  show_ups INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  
  -- Financial Metrics
  cash_collected_pre_refund DECIMAL(12,2) DEFAULT 0,
  refunds DECIMAL(12,2) DEFAULT 0,
  cash_collected_post_refund DECIMAL(12,2) DEFAULT 0,
  sales_value DECIMAL(12,2) DEFAULT 0,
  
  -- Marketing Metrics
  ad_spend DECIMAL(12,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, date)
);

-- Project expenses table
CREATE TABLE public.project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  revenue_generated DECIMAL(12,2) NOT NULL,
  ad_spend DECIMAL(12,2) NOT NULL,
  refunds DECIMAL(12,2) DEFAULT 0,
  agency_fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  agency_fee_amount DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. INTEGRATION TABLES
-- =====================================================

-- Google Sheets connections table
CREATE TABLE public.google_sheets_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sheet_url TEXT NOT NULL,
  sheet_id TEXT NOT NULL,
  column_mappings JSONB NOT NULL DEFAULT '{}',
  refresh_interval TEXT NOT NULL DEFAULT 'daily',
  last_sync TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- OAuth fields
  spreadsheet_id TEXT,
  sheet_name TEXT,
  range_start TEXT,
  date_column TEXT,
  sync_frequency_minutes INTEGER DEFAULT 60,
  auto_sync_enabled BOOLEAN DEFAULT false,
  next_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'idle',
  last_sync_error TEXT,
  user_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metric column mappings
  outbound_clicks_column TEXT,
  amount_spent_column TEXT,
  outbound_ctr_column TEXT,
  cpm_column TEXT,
  cpc_column TEXT,
  impressions_column TEXT,
  reach_column TEXT,
  frequency_column TEXT,
  conversions_column TEXT,
  conversion_rate_column TEXT,
  cost_per_conversion_column TEXT,
  revenue_column TEXT,
  roas_column TEXT,
  custom_metrics JSONB DEFAULT '{}',
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meta Ads connections table
CREATE TABLE IF NOT EXISTS project_meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id VARCHAR(255) NOT NULL,
  ad_account_name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one active connection per project
  UNIQUE(project_id, is_active) WHERE is_active = true
);

-- Google OAuth connections table
CREATE TABLE IF NOT EXISTS project_google_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one active connection per project
  UNIQUE(project_id, is_active) WHERE is_active = true
);

-- =====================================================
-- 5. METRICS AND DATA TABLES
-- =====================================================

-- Project daily metrics table
CREATE TABLE IF NOT EXISTS project_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'google_sheets', -- 'google_sheets', 'meta_ads', 'api', 'ghl', 'manual'
  
  -- Meta Ads metrics
  outbound_clicks INTEGER DEFAULT 0,
  amount_spent DECIMAL(12,2) DEFAULT 0,
  outbound_ctr DECIMAL(8,6) DEFAULT 0,
  cpm DECIMAL(8,2) DEFAULT 0,
  cpc DECIMAL(8,2) DEFAULT 0,
  
  -- Additional metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency DECIMAL(4,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(8,6) DEFAULT 0,
  cost_per_conversion DECIMAL(8,2) DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  roas DECIMAL(8,2) DEFAULT 0,
  
  -- GHL-specific fields
  ghl_appointments_total INTEGER DEFAULT 0,
  ghl_appointments_completed INTEGER DEFAULT 0,
  ghl_appointments_no_show INTEGER DEFAULT 0,
  ghl_appointments_cancelled INTEGER DEFAULT 0,
  ghl_deals_total INTEGER DEFAULT 0,
  ghl_deals_won INTEGER DEFAULT 0,
  ghl_deals_lost INTEGER DEFAULT 0,
  ghl_deals_value DECIMAL(12,2) DEFAULT 0,
  ghl_deals_won_value DECIMAL(12,2) DEFAULT 0,
  
  -- Custom data storage
  custom_data JSONB DEFAULT '{}',
  raw_data JSONB, -- Store original data for debugging
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique date per project per source
  UNIQUE(project_id, date, source)
);

-- Check constraint for valid sources
ALTER TABLE project_daily_metrics 
ADD CONSTRAINT project_daily_metrics_source_check 
CHECK (source IN ('google_sheets', 'meta_ads', 'api', 'ghl', 'manual'));

-- Project metric configurations table
CREATE TABLE IF NOT EXISTS project_metric_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metric configuration
  metric_name VARCHAR(100) NOT NULL,
  metric_key VARCHAR(50) NOT NULL,
  display_name VARCHAR(100),
  database_field VARCHAR(100),
  format_type VARCHAR(20) NOT NULL DEFAULT 'number', -- 'number', 'currency', 'percentage'
  aggregation_type VARCHAR(20) NOT NULL DEFAULT 'sum', -- 'sum', 'average', 'max', 'min', 'last'
  calculation_type VARCHAR(50) DEFAULT 'total', -- 'total', 'average', 'percentage'
  
  -- Display settings
  icon VARCHAR(50) DEFAULT 'TrendingUp',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_main_metric BOOLEAN NOT NULL DEFAULT false,
  
  -- Data source configuration
  data_source_type VARCHAR(50) DEFAULT 'database', -- 'database', 'google_sheets', 'api', 'meta_ads'
  data_source_config JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique metric keys per project
  UNIQUE(project_id, metric_key)
);

-- Google Sheets sync configurations table
CREATE TABLE IF NOT EXISTS google_sheets_sync_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Google Sheets configuration
  spreadsheet_id VARCHAR(255) NOT NULL,
  spreadsheet_name VARCHAR(255),
  sheet_name VARCHAR(255) NOT NULL DEFAULT 'Sheet1',
  range_start VARCHAR(10) NOT NULL DEFAULT 'A2',
  sheet_configs JSONB DEFAULT '[]',
  column_mappings JSONB DEFAULT '{}',
  
  -- Column mappings
  date_column VARCHAR(10) NOT NULL DEFAULT 'A',
  outbound_clicks_column VARCHAR(10) DEFAULT 'B',
  amount_spent_column VARCHAR(10) DEFAULT 'C',
  outbound_ctr_column VARCHAR(10) DEFAULT 'D',
  cpm_column VARCHAR(10) DEFAULT 'E',
  cpc_column VARCHAR(10) DEFAULT 'F',
  impressions_column VARCHAR(10),
  reach_column VARCHAR(10),
  frequency_column VARCHAR(10),
  conversions_column VARCHAR(10),
  conversion_rate_column VARCHAR(10),
  cost_per_conversion_column VARCHAR(10),
  revenue_column VARCHAR(10),
  roas_column VARCHAR(10),
  custom_metrics JSONB DEFAULT '{}',
  
  -- Sync settings
  is_active BOOLEAN DEFAULT true,
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_frequency_minutes INTEGER DEFAULT 60,
  sync_interval_hours INTEGER DEFAULT 24,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  next_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(50) DEFAULT 'pending',
  sync_status VARCHAR(50) DEFAULT 'idle',
  last_sync_error TEXT,
  
  -- Individual records mode settings
  sync_mode VARCHAR(50) DEFAULT 'daily_aggregate', -- 'daily_aggregate' or 'individual_records'
  unique_id_column VARCHAR(10),
  record_type VARCHAR(50),
  amount_column VARCHAR(10),
  status_column VARCHAR(10),
  auto_aggregate BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One config per project
  UNIQUE(project_id),
  UNIQUE(project_id, spreadsheet_id)
);

-- Add check constraints for sync mode
ALTER TABLE google_sheets_sync_configs 
ADD CONSTRAINT chk_sync_mode CHECK (sync_mode IN ('daily_aggregate', 'individual_records'));

ALTER TABLE google_sheets_sync_configs 
ADD CONSTRAINT chk_record_type CHECK (
  (sync_mode = 'daily_aggregate') OR 
  (sync_mode = 'individual_records' AND record_type IS NOT NULL)
);

ALTER TABLE google_sheets_sync_configs 
ADD CONSTRAINT chk_unique_id_column CHECK (
  (sync_mode = 'daily_aggregate') OR 
  (sync_mode = 'individual_records' AND unique_id_column IS NOT NULL)
);

-- Google Sheets sync history table
CREATE TABLE IF NOT EXISTS google_sheets_sync_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_config_id UUID NOT NULL REFERENCES google_sheets_sync_configs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- manual, scheduled
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, success, error
  sheets_synced INTEGER DEFAULT 0,
  rows_processed INTEGER DEFAULT 0,
  rows_inserted INTEGER DEFAULT 0,
  rows_updated INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual records table for storing transaction-level data
CREATE TABLE IF NOT EXISTS project_individual_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Record identifiers
  record_id VARCHAR(255) NOT NULL, -- close_id, transaction_id, lead_id, etc.
  date DATE NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'google_sheets',
  record_type VARCHAR(50) NOT NULL, -- 'sale', 'lead', 'call', 'appointment', etc.
  
  -- Common fields that might be queried
  amount DECIMAL(12,2), -- Sale amount, lead value, etc.
  status VARCHAR(100), -- 'closed', 'pending', 'cancelled', etc.
  
  -- Flexible data storage for all other fields
  record_data JSONB NOT NULL DEFAULT '{}', -- All other transaction fields
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(project_id, source, record_id) -- Prevent duplicate records per project/source
);

-- =====================================================
-- 6. GHL INTEGRATION TABLES
-- =====================================================

-- GHL integration configurations table
CREATE TABLE IF NOT EXISTS ghl_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- GHL API Configuration
  api_key TEXT NOT NULL,
  location_id TEXT NOT NULL,
  location_name TEXT,
  
  -- Integration Settings
  is_active BOOLEAN DEFAULT true,
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 60,
  
  -- Sync Status
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(50) DEFAULT 'pending',
  last_sync_error TEXT,
  
  -- API Rate Limiting
  daily_api_calls INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id)
);

-- GHL appointments table
CREATE TABLE IF NOT EXISTS ghl_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_integration_id UUID NOT NULL REFERENCES ghl_integrations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- GHL Appointment Data
  ghl_appointment_id TEXT NOT NULL,
  contact_id TEXT,
  calendar_id TEXT,
  location_id TEXT,
  
  -- Appointment Details
  title TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50),
  
  -- Contact Information
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Additional Data
  notes TEXT,
  source VARCHAR(100),
  ghl_raw_data JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(ghl_integration_id, ghl_appointment_id)
);

-- GHL opportunities table
CREATE TABLE IF NOT EXISTS ghl_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_integration_id UUID NOT NULL REFERENCES ghl_integrations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- GHL Opportunity Data
  ghl_opportunity_id TEXT NOT NULL,
  contact_id TEXT,
  pipeline_id TEXT,
  pipeline_stage_id TEXT,
  
  -- Opportunity Details
  name TEXT,
  status VARCHAR(50),
  monetary_value DECIMAL(12,2) DEFAULT 0,
  
  -- Contact Information
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Dates
  created_date TIMESTAMP WITH TIME ZONE,
  last_status_change_date TIMESTAMP WITH TIME ZONE,
  close_date TIMESTAMP WITH TIME ZONE,
  
  -- Additional Data
  source VARCHAR(100),
  assigned_to TEXT,
  ghl_raw_data JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(ghl_integration_id, ghl_opportunity_id)
);

-- GHL daily metrics aggregation table
CREATE TABLE IF NOT EXISTS ghl_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_integration_id UUID NOT NULL REFERENCES ghl_integrations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Appointment Metrics
  appointments_total INTEGER DEFAULT 0,
  appointments_confirmed INTEGER DEFAULT 0,
  appointments_completed INTEGER DEFAULT 0,
  appointments_no_show INTEGER DEFAULT 0,
  appointments_cancelled INTEGER DEFAULT 0,
  
  -- Opportunity Metrics
  opportunities_total INTEGER DEFAULT 0,
  opportunities_won INTEGER DEFAULT 0,
  opportunities_lost INTEGER DEFAULT 0,
  opportunities_open INTEGER DEFAULT 0,
  
  -- Revenue Metrics
  revenue_total DECIMAL(12,2) DEFAULT 0,
  revenue_won DECIMAL(12,2) DEFAULT 0,
  average_deal_value DECIMAL(12,2) DEFAULT 0,
  
  -- Conversion Metrics
  appointment_show_rate DECIMAL(5,2) DEFAULT 0,
  opportunity_conversion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(ghl_integration_id, date)
);

-- GHL metric mappings table
CREATE TABLE IF NOT EXISTS ghl_metric_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metric Configuration
  metric_config_id UUID NOT NULL REFERENCES project_metric_configs(id) ON DELETE CASCADE,
  
  -- GHL Data Source Configuration
  ghl_endpoint VARCHAR(50) NOT NULL, -- 'appointments', 'opportunities', 'contacts'
  ghl_field VARCHAR(100) NOT NULL,
  ghl_filters JSONB DEFAULT '{}',
  aggregation_type VARCHAR(20) DEFAULT 'sum',
  
  -- Transformation Rules
  transformation_rule JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(metric_config_id)
);

-- =====================================================
-- 7. INDEXES
-- =====================================================

-- Projects indexes
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);

-- Project metrics indexes  
CREATE INDEX idx_project_metrics_project_id ON project_metrics(project_id);
CREATE INDEX idx_project_metrics_date ON project_metrics(date);

-- Daily metrics indexes
CREATE INDEX idx_project_daily_metrics_project_id ON project_daily_metrics(project_id);
CREATE INDEX idx_project_daily_metrics_date ON project_daily_metrics(date);
CREATE INDEX idx_project_daily_metrics_source ON project_daily_metrics(source);
CREATE INDEX idx_project_daily_metrics_project_date ON project_daily_metrics(project_id, date);
CREATE INDEX idx_project_daily_metrics_custom_data ON project_daily_metrics USING GIN (custom_data);
CREATE INDEX idx_project_daily_metrics_ghl_source ON project_daily_metrics(project_id, source, date) WHERE source = 'ghl';

-- Metric configs indexes
CREATE INDEX idx_project_metric_configs_project_id ON project_metric_configs(project_id);
CREATE INDEX idx_project_metric_configs_main ON project_metric_configs(project_id, is_main_metric);
CREATE INDEX idx_project_metric_configs_visible ON project_metric_configs(project_id, is_visible);
CREATE INDEX idx_project_metric_configs_order ON project_metric_configs(project_id, display_order);
CREATE INDEX idx_project_metric_configs_data_source_type ON project_metric_configs(data_source_type);

-- Connection tables indexes
CREATE INDEX idx_project_meta_connections_project_id ON project_meta_connections(project_id);
CREATE INDEX idx_project_meta_connections_user_id ON project_meta_connections(user_id);
CREATE INDEX idx_project_meta_connections_active ON project_meta_connections(is_active);
CREATE UNIQUE INDEX idx_project_meta_connections_unique_active ON project_meta_connections(project_id) WHERE is_active = true;

CREATE INDEX idx_project_google_connections_project_id ON project_google_connections(project_id);
CREATE INDEX idx_project_google_connections_user_id ON project_google_connections(user_id);
CREATE INDEX idx_project_google_connections_active ON project_google_connections(is_active);

CREATE INDEX idx_google_sheets_connections_project_id ON google_sheets_connections(project_id);
CREATE INDEX idx_google_sheets_connections_is_active ON google_sheets_connections(is_active);
CREATE INDEX idx_google_sheets_connections_spreadsheet_id ON google_sheets_connections(spreadsheet_id);
CREATE INDEX idx_google_sheets_connections_sync_status ON google_sheets_connections(sync_status);

-- Sync configs indexes
CREATE INDEX idx_google_sheets_sync_configs_project_id ON google_sheets_sync_configs(project_id);
CREATE INDEX idx_google_sheets_sync_configs_active ON google_sheets_sync_configs(is_active);
CREATE INDEX idx_sync_configs_next_sync ON google_sheets_sync_configs(next_sync_at) WHERE auto_sync_enabled = true;
CREATE INDEX idx_auto_sync_ready ON google_sheets_sync_configs(next_sync_at, sync_status) WHERE auto_sync_enabled = true;

-- Sync history indexes
CREATE INDEX idx_sync_history_sync_config ON google_sheets_sync_history(sync_config_id);
CREATE INDEX idx_sync_history_project ON google_sheets_sync_history(project_id);

-- Individual records indexes
CREATE INDEX idx_individual_records_project_id ON project_individual_records(project_id);
CREATE INDEX idx_individual_records_date ON project_individual_records(date);
CREATE INDEX idx_individual_records_type ON project_individual_records(record_type);
CREATE INDEX idx_individual_records_project_date ON project_individual_records(project_id, date);
CREATE INDEX idx_individual_records_project_type ON project_individual_records(project_id, record_type);
CREATE INDEX idx_individual_records_source ON project_individual_records(source);
CREATE INDEX idx_individual_records_data_gin ON project_individual_records USING GIN (record_data);

-- GHL indexes
CREATE INDEX idx_ghl_integrations_project_id ON ghl_integrations(project_id);
CREATE INDEX idx_ghl_integrations_location_id ON ghl_integrations(location_id);
CREATE INDEX idx_ghl_integrations_active ON ghl_integrations(is_active);
CREATE INDEX idx_ghl_integrations_sync_status ON ghl_integrations(last_sync_status);
CREATE INDEX idx_ghl_integration_configs_project_active ON ghl_integrations(project_id, is_active) WHERE is_active = true;

CREATE INDEX idx_ghl_appointments_integration_id ON ghl_appointments(ghl_integration_id);
CREATE INDEX idx_ghl_appointments_project_id ON ghl_appointments(project_id);
CREATE INDEX idx_ghl_appointments_start_time ON ghl_appointments(start_time);
CREATE INDEX idx_ghl_appointments_status ON ghl_appointments(status);
CREATE INDEX idx_ghl_appointments_ghl_id ON ghl_appointments(ghl_appointment_id);

CREATE INDEX idx_ghl_opportunities_integration_id ON ghl_opportunities(ghl_integration_id);
CREATE INDEX idx_ghl_opportunities_project_id ON ghl_opportunities(project_id);
CREATE INDEX idx_ghl_opportunities_status ON ghl_opportunities(status);
CREATE INDEX idx_ghl_opportunities_ghl_id ON ghl_opportunities(ghl_opportunity_id);
CREATE INDEX idx_ghl_opportunities_created_date ON ghl_opportunities(created_date);

CREATE INDEX idx_ghl_daily_metrics_integration_id ON ghl_daily_metrics(ghl_integration_id);
CREATE INDEX idx_ghl_daily_metrics_project_id ON ghl_daily_metrics(project_id);
CREATE INDEX idx_ghl_daily_metrics_date ON ghl_daily_metrics(date);

CREATE INDEX idx_ghl_metric_mappings_project_id ON ghl_metric_mappings(project_id);
CREATE INDEX idx_ghl_metric_mappings_metric_config_id ON ghl_metric_mappings(metric_config_id);
CREATE INDEX idx_ghl_metric_mappings_endpoint ON ghl_metric_mappings(ghl_endpoint);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_sheets_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_metric_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sheets_sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sheets_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_individual_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghl_metric_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for projects
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

CREATE POLICY "Admins and managers can manage all projects" ON public.projects 
FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- RLS policies for project_metrics
CREATE POLICY "All authenticated users can view metrics" ON public.project_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage metrics" ON public.project_metrics FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- RLS policies for project_expenses
CREATE POLICY "All authenticated users can view expenses" ON public.project_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage expenses" ON public.project_expenses FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- RLS policies for google_sheets_connections
CREATE POLICY "View Google Sheets connections with org access"
  ON google_sheets_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = google_sheets_connections.project_id 
      AND projects.created_by = auth.uid()
    )
    OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admisfits.com'
  );

CREATE POLICY "Users can create connections for their projects"
  ON google_sheets_connections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = google_sheets_connections.project_id 
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Update Google Sheets connections with org access"
  ON google_sheets_connections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = google_sheets_connections.project_id 
      AND projects.created_by = auth.uid()
    )
    OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admisfits.com'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = google_sheets_connections.project_id 
      AND projects.created_by = auth.uid()
    )
    OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admisfits.com'
  );

CREATE POLICY "Delete Google Sheets connections with org access"
  ON google_sheets_connections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = google_sheets_connections.project_id 
      AND projects.created_by = auth.uid()
    )
    OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admisfits.com'
  );

-- RLS policies for invoices
CREATE POLICY "All authenticated users can view invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage invoices" ON public.invoices FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- RLS policies for project_meta_connections with org access
CREATE POLICY "View Meta connections with org access"
  ON project_meta_connections
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admisfits.com'
  );

CREATE POLICY "Users can create Meta connections for their projects"
  ON project_meta_connections
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_meta_connections.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Update Meta connections with org access"
  ON project_meta_connections
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admisfits.com'
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admisfits.com'
  );

CREATE POLICY "Delete Meta connections with org access"
  ON project_meta_connections
  FOR DELETE
  USING (
    auth.uid() = user_id 
    OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admisfits.com'
  );

-- RLS policies for project_google_connections
CREATE POLICY "Users can view their own Google connections"
  ON project_google_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create Google connections for their projects"
  ON project_google_connections
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_google_connections.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own Google connections"
  ON project_google_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google connections"
  ON project_google_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for project_daily_metrics
CREATE POLICY "Users can view their own project metrics"
  ON project_daily_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert metrics for their projects"
  ON project_daily_metrics
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_daily_metrics.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own project metrics"
  ON project_daily_metrics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project metrics"
  ON project_daily_metrics
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for project_metric_configs
CREATE POLICY "Users can view their own project metric configs"
  ON project_metric_configs
  FOR SELECT
  USING (auth.uid() = user_id);

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

CREATE POLICY "Users can update their own project metric configs"
  ON project_metric_configs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project metric configs"
  ON project_metric_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for google_sheets_sync_configs
CREATE POLICY "Users can view their own sync configs"
  ON google_sheets_sync_configs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create sync configs for their projects"
  ON google_sheets_sync_configs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = google_sheets_sync_configs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own sync configs"
  ON google_sheets_sync_configs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync configs"
  ON google_sheets_sync_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for google_sheets_sync_history
CREATE POLICY "Users can view their sync history" ON google_sheets_sync_history
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert their sync history" ON google_sheets_sync_history
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- RLS policies for project_individual_records
CREATE POLICY "Users can view their own individual records"
  ON project_individual_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_individual_records.project_id 
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert individual records for their projects"
  ON project_individual_records
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_individual_records.project_id 
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own individual records"
  ON project_individual_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_individual_records.project_id 
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own individual records"
  ON project_individual_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_individual_records.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- RLS policies for GHL tables
CREATE POLICY "Users can view their own GHL integrations"
  ON ghl_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create GHL integrations for their projects"
  ON ghl_integrations
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = ghl_integrations.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own GHL integrations"
  ON ghl_integrations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GHL integrations"
  ON ghl_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view appointments from their integrations"
  ON ghl_appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ghl_integrations
      WHERE ghl_integrations.id = ghl_appointments.ghl_integration_id
      AND ghl_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage appointments from their integrations"
  ON ghl_appointments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ghl_integrations
      WHERE ghl_integrations.id = ghl_appointments.ghl_integration_id
      AND ghl_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view opportunities from their integrations"
  ON ghl_opportunities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ghl_integrations
      WHERE ghl_integrations.id = ghl_opportunities.ghl_integration_id
      AND ghl_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage opportunities from their integrations"
  ON ghl_opportunities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ghl_integrations
      WHERE ghl_integrations.id = ghl_opportunities.ghl_integration_id
      AND ghl_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view metrics from their integrations"
  ON ghl_daily_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ghl_integrations
      WHERE ghl_integrations.id = ghl_daily_metrics.ghl_integration_id
      AND ghl_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage metrics from their integrations"
  ON ghl_daily_metrics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ghl_integrations
      WHERE ghl_integrations.id = ghl_daily_metrics.ghl_integration_id
      AND ghl_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own GHL metric mappings"
  ON ghl_metric_mappings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create GHL metric mappings for their projects"
  ON ghl_metric_mappings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = ghl_metric_mappings.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own GHL metric mappings"
  ON ghl_metric_mappings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GHL metric mappings"
  ON ghl_metric_mappings
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_metrics_updated_at BEFORE UPDATE ON public.project_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_meta_connections_updated_at BEFORE UPDATE ON project_meta_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_google_connections_updated_at BEFORE UPDATE ON project_google_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_daily_metrics_updated_at BEFORE UPDATE ON project_daily_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_metric_configs_updated_at BEFORE UPDATE ON project_metric_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_google_sheets_sync_configs_updated_at BEFORE UPDATE ON google_sheets_sync_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_google_sheets_connections_updated_at BEFORE UPDATE ON google_sheets_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_individual_records_updated_at BEFORE UPDATE ON project_individual_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ghl_integrations_updated_at BEFORE UPDATE ON ghl_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ghl_appointments_updated_at BEFORE UPDATE ON ghl_appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ghl_opportunities_updated_at BEFORE UPDATE ON ghl_opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ghl_daily_metrics_updated_at BEFORE UPDATE ON ghl_daily_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ghl_metric_mappings_updated_at BEFORE UPDATE ON ghl_metric_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. VIEWS
-- =====================================================

-- Create view for unified project metrics including GHL data
CREATE OR REPLACE VIEW project_metrics_unified AS
SELECT 
  pdm.*,
  gic.location_name as ghl_location_name,
  gic.is_active as ghl_integration_active,
  gic.last_sync_at as ghl_last_sync,
  -- Calculate derived metrics
  CASE 
    WHEN pdm.ghl_appointments_total > 0 
    THEN ROUND((pdm.ghl_appointments_completed::DECIMAL / pdm.ghl_appointments_total) * 100, 2)
    ELSE 0 
  END as appointment_completion_rate,
  
  CASE 
    WHEN pdm.ghl_deals_total > 0 
    THEN ROUND((pdm.ghl_deals_won::DECIMAL / pdm.ghl_deals_total) * 100, 2)
    ELSE 0 
  END as deal_win_rate,
  
  CASE 
    WHEN pdm.ghl_appointments_total > 0 
    THEN ROUND(pdm.ghl_deals_won_value::DECIMAL / NULLIF(pdm.ghl_appointments_total, 0), 2)
    ELSE 0 
  END as revenue_per_appointment,
  
  CASE 
    WHEN pdm.ghl_deals_won > 0 
    THEN ROUND(pdm.ghl_deals_won_value::DECIMAL / NULLIF(pdm.ghl_deals_won, 0), 2)
    ELSE 0 
  END as average_deal_value

FROM project_daily_metrics pdm
LEFT JOIN ghl_integrations gic ON pdm.project_id = gic.project_id
WHERE pdm.source = 'ghl' OR gic.id IS NOT NULL;

-- Create view for easy aggregation queries from individual records
CREATE OR REPLACE VIEW project_daily_record_aggregates AS
SELECT 
  project_id,
  date,
  source,
  record_type,
  COUNT(*) as record_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
FROM project_individual_records
GROUP BY project_id, date, source, record_type;

-- Grant permissions for views
GRANT SELECT ON project_metrics_unified TO authenticated;
GRANT SELECT ON project_daily_record_aggregates TO authenticated;

-- Create RLS policy for the aggregates view
CREATE POLICY "Users can view their own aggregated records"
  ON project_daily_record_aggregates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_daily_record_aggregates.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- =====================================================
-- 11. HELPER FUNCTIONS
-- =====================================================

-- Function to handle auto-sync scheduling
CREATE OR REPLACE FUNCTION schedule_google_sheets_auto_sync()
RETURNS void AS $$
DECLARE
  config RECORD;
BEGIN
  -- Find all configs that need to be synced
  FOR config IN
    SELECT * FROM google_sheets_sync_configs
    WHERE auto_sync_enabled = true
    AND sync_status = 'idle'
    AND (next_sync_at IS NULL OR next_sync_at <= NOW())
  LOOP
    -- Update status to prevent duplicate processing
    UPDATE google_sheets_sync_configs
    SET sync_status = 'scheduled',
        updated_at = NOW()
    WHERE id = config.id;

    -- Schedule next sync time
    UPDATE google_sheets_sync_configs
    SET next_sync_at = NOW() + INTERVAL '1 hour' * config.sync_interval_hours
    WHERE id = config.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to setup default metrics for a project
CREATE OR REPLACE FUNCTION setup_default_project_metrics(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert default metric configurations only if they don't exist
  INSERT INTO project_metric_configs (project_id, metric_name, metric_key, database_field, aggregation_type, calculation_type, format_type, icon, display_order, is_visible, is_main_metric)
  VALUES 
    (p_project_id, 'Revenue', 'revenue', 'revenue', 'sum', 'total', 'currency', 'DollarSign', 1, true, true),
    (p_project_id, 'Ad Spend', 'spend', 'amount_spent', 'sum', 'total', 'currency', 'TrendingUp', 2, true, true),
    (p_project_id, 'ROAS', 'roas', 'roas', 'average', 'average', 'number', 'Target', 3, true, true),
    (p_project_id, 'Conversions', 'conversions', 'conversions', 'sum', 'total', 'number', 'Users', 4, true, true),
    (p_project_id, 'Clicks', 'clicks', 'outbound_clicks', 'sum', 'total', 'number', 'MousePointer', 5, true, false),
    (p_project_id, 'Impressions', 'impressions', 'impressions', 'sum', 'total', 'number', 'Eye', 6, true, false),
    (p_project_id, 'CTR', 'ctr', 'outbound_ctr', 'average', 'average', 'percentage', 'Activity', 7, true, false),
    (p_project_id, 'CPC', 'cpc', 'cpc', 'average', 'average', 'currency', 'DollarSign', 8, true, false)
  ON CONFLICT (project_id, metric_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function for incrementing GHL API usage with daily reset
CREATE OR REPLACE FUNCTION increment_ghl_api_usage(integration_id UUID)
RETURNS VOID AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  integration_record RECORD;
BEGIN
  -- Get current integration
  SELECT * INTO integration_record 
  FROM ghl_integrations 
  WHERE id = integration_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Reset counter if it's a new day
  IF integration_record.last_reset_date != current_date THEN
    UPDATE ghl_integrations 
    SET 
      daily_api_calls = 1,
      last_reset_date = current_date,
      updated_at = NOW()
    WHERE id = integration_id;
  ELSE
    -- Increment counter
    UPDATE ghl_integrations 
    SET 
      daily_api_calls = daily_api_calls + 1,
      updated_at = NOW()
    WHERE id = integration_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get GHL metrics summary for a project
CREATE OR REPLACE FUNCTION get_ghl_metrics_summary(
  p_project_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_appointments', COALESCE(SUM(ghl_appointments_total), 0),
    'completed_appointments', COALESCE(SUM(ghl_appointments_completed), 0),
    'no_show_appointments', COALESCE(SUM(ghl_appointments_no_show), 0),
    'cancelled_appointments', COALESCE(SUM(ghl_appointments_cancelled), 0),
    'total_deals', COALESCE(SUM(ghl_deals_total), 0),
    'won_deals', COALESCE(SUM(ghl_deals_won), 0),
    'lost_deals', COALESCE(SUM(ghl_deals_lost), 0),
    'total_deal_value', COALESCE(SUM(ghl_deals_value), 0),
    'won_deal_value', COALESCE(SUM(ghl_deals_won_value), 0),
    'total_revenue', COALESCE(SUM(revenue), 0),
    'total_conversions', COALESCE(SUM(conversions), 0),
    'date_range', json_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date,
      'days', p_end_date - p_start_date + 1
    )
  ) INTO result
  FROM project_daily_metrics
  WHERE project_id = p_project_id
    AND source = 'ghl'
    AND date BETWEEN p_start_date AND p_end_date;
    
  RETURN COALESCE(result, '{}');
END;
$$ LANGUAGE plpgsql;

-- Function to check if GHL integration is active for a project
CREATE OR REPLACE FUNCTION is_ghl_integration_active(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_active BOOLEAN := FALSE;
BEGIN
  SELECT gic.is_active INTO is_active
  FROM ghl_integrations gic
  WHERE gic.project_id = p_project_id;
  
  RETURN COALESCE(is_active, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Function to get GHL integration status for a project
CREATE OR REPLACE FUNCTION get_ghl_integration_status(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'is_configured', CASE WHEN gic.id IS NOT NULL THEN true ELSE false END,
    'is_active', COALESCE(gic.is_active, false),
    'location_id', gic.location_id,
    'location_name', gic.location_name,
    'last_sync_at', gic.last_sync_at,
    'last_sync_status', gic.last_sync_status,
    'last_sync_error', gic.last_sync_error,
    'auto_sync_enabled', COALESCE(gic.auto_sync_enabled, false),
    'sync_frequency_minutes', gic.sync_frequency_minutes,
    'daily_api_calls', COALESCE(gic.daily_api_calls, 0),
    'last_reset_date', gic.last_reset_date,
    'created_at', gic.created_at
  ) INTO result
  FROM ghl_integrations gic
  WHERE gic.project_id = p_project_id;
  
  RETURN COALESCE(result, json_build_object('is_configured', false, 'is_active', false));
END;
$$ LANGUAGE plpgsql;

-- Function to get individual records for a project and date range
CREATE OR REPLACE FUNCTION get_project_individual_records(
  p_project_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_record_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  record_id VARCHAR,
  date DATE,
  record_type VARCHAR,
  amount DECIMAL,
  status VARCHAR,
  record_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.record_id,
    r.date,
    r.record_type,
    r.amount,
    r.status,
    r.record_data,
    r.created_at
  FROM project_individual_records r
  WHERE r.project_id = p_project_id
    AND (p_start_date IS NULL OR r.date >= p_start_date)
    AND (p_end_date IS NULL OR r.date <= p_end_date)
    AND (p_record_type IS NULL OR r.record_type = p_record_type)
  ORDER BY r.date DESC, r.created_at DESC;
END;
$$;

-- Function to get daily aggregates from individual records
CREATE OR REPLACE FUNCTION get_daily_aggregates_from_records(
  p_project_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_record_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  record_type VARCHAR,
  total_records BIGINT,
  total_amount DECIMAL,
  avg_amount DECIMAL,
  closed_count BIGINT,
  pending_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.date,
    r.record_type,
    COUNT(*) as total_records,
    SUM(r.amount) as total_amount,
    AVG(r.amount) as avg_amount,
    COUNT(CASE WHEN r.status = 'closed' THEN 1 END) as closed_count,
    COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending_count
  FROM project_individual_records r
  WHERE r.project_id = p_project_id
    AND (p_start_date IS NULL OR r.date >= p_start_date)
    AND (p_end_date IS NULL OR r.date <= p_end_date)
    AND (p_record_type IS NULL OR r.record_type = p_record_type)
  GROUP BY r.date, r.record_type
  ORDER BY r.date DESC;
END;
$$;

-- =====================================================
-- 12. DATA MIGRATION FUNCTIONS
-- =====================================================

-- Function to backup existing daily metrics before switching to individual records
CREATE OR REPLACE FUNCTION backup_daily_metrics_for_project(p_project_id UUID)
RETURNS TABLE (backed_up_records INTEGER, backup_table_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  backup_table TEXT;
  record_count INTEGER;
BEGIN
  backup_table := 'daily_metrics_backup_' || REPLACE(p_project_id::TEXT, '-', '_') || '_' || EXTRACT(epoch FROM NOW())::INTEGER;
  
  EXECUTE format('CREATE TABLE %I AS SELECT * FROM project_daily_metrics WHERE project_id = %L ORDER BY date DESC', backup_table, p_project_id);
  EXECUTE format('SELECT COUNT(*) FROM %I', backup_table) INTO record_count;
  EXECUTE format('ALTER TABLE %I ADD COLUMN backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), ADD COLUMN original_project_id UUID DEFAULT %L, ADD COLUMN backup_reason TEXT DEFAULT ''Mode switch to individual_records''', backup_table, p_project_id);
  
  RETURN QUERY SELECT record_count, backup_table;
END;
$$;

-- Function to convert daily aggregates to individual records
CREATE OR REPLACE FUNCTION convert_daily_aggregates_to_individual_records(
  p_project_id UUID, p_user_id UUID, p_record_type VARCHAR DEFAULT 'converted_aggregate'
)
RETURNS TABLE (converted_records INTEGER, success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  daily_record RECORD;
  record_count INTEGER := 0;
  error_msg TEXT := NULL;
BEGIN
  BEGIN
    FOR daily_record IN SELECT * FROM project_daily_metrics WHERE project_id = p_project_id ORDER BY date LOOP
      INSERT INTO project_individual_records (
        project_id, user_id, record_id, date, source, record_type, amount, status, record_data
      ) VALUES (
        p_project_id, p_user_id,
        'AGG_' || daily_record.date::TEXT || '_' || COALESCE(daily_record.source, 'unknown'),
        daily_record.date, COALESCE(daily_record.source, 'converted_from_daily'), p_record_type,
        daily_record.revenue, 'converted',
        jsonb_build_object(
          'original_daily_metric', true, 'outbound_clicks', daily_record.outbound_clicks,
          'amount_spent', daily_record.amount_spent, 'outbound_ctr', daily_record.outbound_ctr,
          'cpm', daily_record.cpm, 'cpc', daily_record.cpc, 'impressions', daily_record.impressions,
          'reach', daily_record.reach, 'frequency', daily_record.frequency,
          'conversions', daily_record.conversions, 'conversion_rate', daily_record.conversion_rate,
          'cost_per_conversion', daily_record.cost_per_conversion, 'revenue', daily_record.revenue,
          'roas', daily_record.roas, 'converted_at', NOW()::TEXT
        )
      ) ON CONFLICT (project_id, source, record_id) DO UPDATE SET
        record_data = EXCLUDED.record_data || jsonb_build_object('last_updated', NOW()::TEXT);
      
      record_count := record_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT record_count, true, error_msg;
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RETURN QUERY SELECT record_count, false, error_msg;
  END;
END;
$$;

-- Function to convert individual records to daily aggregates
CREATE OR REPLACE FUNCTION convert_individual_records_to_daily_aggregates(
  p_project_id UUID, p_user_id UUID, p_source VARCHAR DEFAULT 'google_sheets'
)
RETURNS TABLE (converted_days INTEGER, success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  daily_agg RECORD;
  day_count INTEGER := 0;
  error_msg TEXT := NULL;
BEGIN
  BEGIN
    FOR daily_agg IN 
      SELECT date, source, COUNT(*) as total_records, SUM(amount) as total_amount, AVG(amount) as avg_amount,
             COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
             SUM((record_data->>'outbound_clicks')::NUMERIC) as total_outbound_clicks,
             SUM((record_data->>'amount_spent')::NUMERIC) as total_amount_spent,
             SUM((record_data->>'impressions')::NUMERIC) as total_impressions,
             SUM((record_data->>'conversions')::NUMERIC) as total_conversions
      FROM project_individual_records WHERE project_id = p_project_id AND source = p_source
      GROUP BY date, source ORDER BY date
    LOOP
      INSERT INTO project_daily_metrics (
        project_id, user_id, date, source, outbound_clicks, amount_spent, impressions, conversions, revenue, custom_data
      ) VALUES (
        p_project_id, p_user_id, daily_agg.date, daily_agg.source,
        daily_agg.total_outbound_clicks, daily_agg.total_amount_spent, daily_agg.total_impressions,
        daily_agg.total_conversions, daily_agg.total_amount,
        jsonb_build_object(
          'converted_from_individual_records', true, 'total_individual_records', daily_agg.total_records,
          'avg_amount_per_record', daily_agg.avg_amount, 'closed_records_count', daily_agg.closed_count,
          'converted_at', NOW()::TEXT
        )
      ) ON CONFLICT (project_id, date, source) DO UPDATE SET
        outbound_clicks = EXCLUDED.outbound_clicks, amount_spent = EXCLUDED.amount_spent,
        impressions = EXCLUDED.impressions, conversions = EXCLUDED.conversions,
        revenue = EXCLUDED.revenue, custom_data = EXCLUDED.custom_data, updated_at = NOW();
      
      day_count := day_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT day_count, true, error_msg;
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RETURN QUERY SELECT day_count, false, error_msg;
  END;
END;
$$;

-- Function to switch sync mode with data migration
CREATE OR REPLACE FUNCTION switch_sync_mode_with_data_migration(
  p_project_id UUID, p_user_id UUID, p_new_sync_mode VARCHAR,
  p_preserve_existing_data BOOLEAN DEFAULT true, p_backup_before_switch BOOLEAN DEFAULT true
)
RETURNS TABLE (success BOOLEAN, old_mode VARCHAR, new_mode VARCHAR, backup_table_name TEXT, records_converted INTEGER, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_config RECORD;
  backup_result RECORD;
  conversion_result RECORD;
  error_msg TEXT := NULL;
  backup_table TEXT := NULL;
  converted_count INTEGER := 0;
BEGIN
  BEGIN
    SELECT * INTO current_config FROM google_sheets_sync_configs WHERE project_id = p_project_id;
    
    IF NOT FOUND THEN
      error_msg := 'No sync configuration found for project';
      RETURN QUERY SELECT false, NULL::VARCHAR, p_new_sync_mode, backup_table, 0, error_msg;
      RETURN;
    END IF;
    
    IF COALESCE(current_config.sync_mode, 'daily_aggregate') = p_new_sync_mode THEN
      RETURN QUERY SELECT true, current_config.sync_mode, p_new_sync_mode, backup_table, 0, 'No mode change needed'::TEXT;
      RETURN;
    END IF;
    
    IF p_backup_before_switch AND p_new_sync_mode = 'individual_records' THEN
      SELECT * INTO backup_result FROM backup_daily_metrics_for_project(p_project_id);
      backup_table := backup_result.backup_table_name;
    END IF;
    
    IF p_preserve_existing_data THEN
      IF p_new_sync_mode = 'individual_records' AND COALESCE(current_config.sync_mode, 'daily_aggregate') = 'daily_aggregate' THEN
        SELECT * INTO conversion_result FROM convert_daily_aggregates_to_individual_records(p_project_id, p_user_id, 'converted_sale');
        
        IF NOT conversion_result.success THEN
          error_msg := 'Failed to convert daily aggregates: ' || conversion_result.error_message;
          RETURN QUERY SELECT false, current_config.sync_mode, p_new_sync_mode, backup_table, 0, error_msg;
          RETURN;
        END IF;
        
        converted_count := conversion_result.converted_records;
        
      ELSIF p_new_sync_mode = 'daily_aggregate' AND current_config.sync_mode = 'individual_records' THEN
        SELECT * INTO conversion_result FROM convert_individual_records_to_daily_aggregates(p_project_id, p_user_id);
        
        IF NOT conversion_result.success THEN
          error_msg := 'Failed to convert individual records: ' || conversion_result.error_message;
          RETURN QUERY SELECT false, current_config.sync_mode, p_new_sync_mode, backup_table, 0, error_msg;
          RETURN;
        END IF;
        
        converted_count := conversion_result.converted_days;
      END IF;
    END IF;
    
    UPDATE google_sheets_sync_configs SET sync_mode = p_new_sync_mode, updated_at = NOW() WHERE project_id = p_project_id;
    
    RETURN QUERY SELECT true, current_config.sync_mode, p_new_sync_mode, backup_table, converted_count, error_msg;
    
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RETURN QUERY SELECT false, COALESCE(current_config.sync_mode, 'unknown'), p_new_sync_mode, backup_table, converted_count, error_msg;
  END;
END;
$$;

-- Function to list backup tables
CREATE OR REPLACE FUNCTION list_project_backup_tables(p_project_id UUID)
RETURNS TABLE (table_name TEXT, record_count BIGINT, backup_date TIMESTAMP WITH TIME ZONE, backup_reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  backup_table_pattern TEXT;
  table_record RECORD;
BEGIN
  backup_table_pattern := 'daily_metrics_backup_' || REPLACE(p_project_id::TEXT, '-', '_') || '%';
  
  FOR table_record IN SELECT t.table_name FROM information_schema.tables t
    WHERE t.table_name LIKE backup_table_pattern AND t.table_schema = 'public'
  LOOP
    RETURN QUERY EXECUTE format('SELECT %L::TEXT as table_name, COUNT(*)::BIGINT as record_count, MIN(backup_created_at) as backup_date, MIN(backup_reason) as backup_reason FROM %I', table_record.table_name, table_record.table_name);
  END LOOP;
END;
$$;

-- Function to restore from backup
CREATE OR REPLACE FUNCTION restore_from_backup_table(p_project_id UUID, p_user_id UUID, p_backup_table_name TEXT)
RETURNS TABLE (success BOOLEAN, restored_records INTEGER, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  record_count INTEGER := 0;
  error_msg TEXT := NULL;
BEGIN
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = p_backup_table_name AND table_schema = 'public') THEN
      error_msg := 'Backup table does not exist: ' || p_backup_table_name;
      RETURN QUERY SELECT false, 0, error_msg;
      RETURN;
    END IF;
    
    DELETE FROM project_daily_metrics WHERE project_id = p_project_id;
    
    EXECUTE format('INSERT INTO project_daily_metrics SELECT id, project_id, user_id, date, source, outbound_clicks, amount_spent, outbound_ctr, cpm, cpc, impressions, reach, frequency, conversions, conversion_rate, cost_per_conversion, revenue, roas, custom_data, raw_data, created_at, updated_at FROM %I WHERE original_project_id = %L', p_backup_table_name, p_project_id);
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    RETURN QUERY SELECT true, record_count, error_msg;
    
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RETURN QUERY SELECT false, 0, error_msg;
  END;
END;
$$;

-- =====================================================
-- 13. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION schedule_google_sheets_auto_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION increment_ghl_api_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ghl_metrics_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION is_ghl_integration_active(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ghl_integration_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_individual_records TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_aggregates_from_records TO authenticated;
GRANT EXECUTE ON FUNCTION backup_daily_metrics_for_project TO authenticated;
GRANT EXECUTE ON FUNCTION convert_daily_aggregates_to_individual_records TO authenticated;
GRANT EXECUTE ON FUNCTION convert_individual_records_to_daily_aggregates TO authenticated;
GRANT EXECUTE ON FUNCTION switch_sync_mode_with_data_migration TO authenticated;
GRANT EXECUTE ON FUNCTION list_project_backup_tables TO authenticated;
GRANT EXECUTE ON FUNCTION restore_from_backup_table TO authenticated;

-- Grant permissions to authenticated users
GRANT ALL ON project_meta_connections TO authenticated;
GRANT ALL ON project_meta_connections TO service_role;

-- =====================================================
-- 14. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE project_meta_connections IS 'Configuration for Meta Ads connections per project';
COMMENT ON TABLE project_google_connections IS 'Google OAuth connections for projects';
COMMENT ON TABLE google_sheets_connections IS 'Google Sheets integration configurations and OAuth connections per project';
COMMENT ON TABLE project_daily_metrics IS 'Daily metrics from various sources like Google Sheets, Meta Ads, GHL';
COMMENT ON TABLE project_metric_configs IS 'Configuration for project metrics display and data sources';
COMMENT ON TABLE google_sheets_sync_configs IS 'Configuration for Google Sheets sync settings per project';
COMMENT ON TABLE google_sheets_sync_history IS 'History of Google Sheets sync operations';
COMMENT ON TABLE project_individual_records IS 'Stores individual transaction records (sales, leads, calls) from Google Sheets and other sources';
COMMENT ON TABLE ghl_integrations IS 'Main configuration for GHL API v2 sub account integrations per project';
COMMENT ON TABLE ghl_appointments IS 'Raw GHL appointment data synced from sub accounts';
COMMENT ON TABLE ghl_opportunities IS 'Raw GHL opportunity/deal data synced from sub accounts';
COMMENT ON TABLE ghl_daily_metrics IS 'Daily aggregated metrics calculated from GHL raw data';
COMMENT ON TABLE ghl_metric_mappings IS 'Maps project metrics to GHL API data sources and transformations';

COMMENT ON COLUMN project_metric_configs.data_source_type IS 'Type of data source: database, google_sheets, api, meta_ads';
COMMENT ON COLUMN project_metric_configs.data_source_config IS 'JSON configuration for external data sources (sheet info, API endpoints, etc.)';
COMMENT ON COLUMN google_sheets_sync_configs.sync_mode IS 'Mode: daily_aggregate (default) or individual_records';
COMMENT ON COLUMN google_sheets_sync_configs.unique_id_column IS 'Required for individual_records mode - column containing unique identifier';
COMMENT ON COLUMN google_sheets_sync_configs.record_type IS 'Type of records: sale, lead, call, etc. (required for individual_records mode)';
COMMENT ON COLUMN project_individual_records.record_id IS 'Unique identifier from source system (close_id, lead_id, etc.)';
COMMENT ON COLUMN project_individual_records.record_type IS 'Type of record: sale, lead, call, appointment, etc.';
COMMENT ON COLUMN project_individual_records.record_data IS 'All other fields from the source record stored as JSON';
COMMENT ON COLUMN project_individual_records.amount IS 'Monetary value associated with the record (sale amount, lead value, etc.)';
COMMENT ON COLUMN project_individual_records.status IS 'Status of the record (closed, pending, cancelled, etc.)';
COMMENT ON COLUMN ghl_integrations.api_key IS 'GHL API key for sub account access (consider encryption)';
COMMENT ON COLUMN ghl_integrations.location_id IS 'GHL location ID for sub account';
COMMENT ON COLUMN ghl_integrations.daily_api_calls IS 'Track daily API usage for rate limiting';
COMMENT ON COLUMN ghl_metric_mappings.ghl_endpoint IS 'GHL API endpoint: appointments, opportunities, contacts, invoices';
COMMENT ON COLUMN ghl_metric_mappings.ghl_field IS 'Specific field to extract from GHL API response';
COMMENT ON COLUMN ghl_metric_mappings.ghl_filters IS 'JSON filters for GHL API queries (status, date range, etc.)';

COMMENT ON FUNCTION increment_ghl_api_usage(UUID) IS 'Increments daily API usage counter for GHL integration with automatic daily reset';
COMMENT ON FUNCTION get_ghl_metrics_summary(UUID, DATE, DATE) IS 'Returns aggregated GHL metrics for a project within date range';
COMMENT ON FUNCTION is_ghl_integration_active(UUID) IS 'Checks if GHL integration is active for a project';
COMMENT ON FUNCTION get_ghl_integration_status(UUID) IS 'Returns complete GHL integration status for a project';
COMMENT ON VIEW project_metrics_unified IS 'Unified view of project metrics with GHL integration data and calculated derived metrics';

-- =====================================================
-- SETUP DEFAULT METRICS FOR EXISTING PROJECTS
-- =====================================================

-- Setup default metrics for all existing projects that don't have any metrics configured
INSERT INTO project_metric_configs (project_id, metric_name, metric_key, database_field, aggregation_type, calculation_type, format_type, icon, display_order, is_visible, is_main_metric, user_id)
SELECT 
  p.id as project_id,
  unnest(ARRAY['Revenue', 'Ad Spend', 'ROAS', 'Conversions', 'Clicks', 'Impressions', 'CTR', 'CPC']) as metric_name,
  unnest(ARRAY['revenue', 'spend', 'roas', 'conversions', 'clicks', 'impressions', 'ctr', 'cpc']) as metric_key,
  unnest(ARRAY['revenue', 'amount_spent', 'roas', 'conversions', 'outbound_clicks', 'impressions', 'outbound_ctr', 'cpc']) as database_field,
  unnest(ARRAY['sum', 'sum', 'average', 'sum', 'sum', 'sum', 'average', 'average']) as aggregation_type,
  unnest(ARRAY['total', 'total', 'average', 'total', 'total', 'total', 'average', 'average']) as calculation_type,
  unnest(ARRAY['currency', 'currency', 'number', 'number', 'number', 'number', 'percentage', 'currency']) as format_type,
  unnest(ARRAY['DollarSign', 'TrendingUp', 'Target', 'Users', 'MousePointer', 'Eye', 'Activity', 'DollarSign']) as icon,
  unnest(ARRAY[1, 2, 3, 4, 5, 6, 7, 8]) as display_order,
  true as is_visible,
  unnest(ARRAY[true, true, true, true, false, false, false, false]) as is_main_metric,
  p.created_by as user_id
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_metric_configs pmc WHERE pmc.project_id = p.id
);

-- =====================================================
-- FINAL STATUS
-- =====================================================

SELECT 'Consolidated database schema created successfully!' as status;