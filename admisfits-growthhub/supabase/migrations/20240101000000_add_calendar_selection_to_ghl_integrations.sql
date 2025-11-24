-- Add calendar selection fields to ghl_integrations table
ALTER TABLE ghl_integrations 
ADD COLUMN IF NOT EXISTS selected_calendar_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS selected_calendar_names text[] DEFAULT '{}';