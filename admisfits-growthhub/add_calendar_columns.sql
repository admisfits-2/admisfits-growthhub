-- Run this SQL in your Supabase SQL Editor to add the missing columns

-- Add calendar selection columns to ghl_integrations table
ALTER TABLE public.ghl_integrations 
ADD COLUMN selected_calendar_ids text[] DEFAULT '{}',
ADD COLUMN selected_calendar_names text[] DEFAULT '{}';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ghl_integrations' 
AND column_name IN ('selected_calendar_ids', 'selected_calendar_names');