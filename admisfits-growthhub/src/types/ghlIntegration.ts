// Types for GHL (Go High Level) API v2 integration with sub accounts

// Main GHL integration configuration
export interface GHLIntegration {
  id: string;
  project_id: string;
  user_id: string;
  
  // GHL API Configuration
  api_key: string;
  location_id: string;
  location_name?: string;
  
  // Calendar Selection
  selected_calendar_ids?: string[];
  selected_calendar_names?: string[];
  
  // Integration Settings
  is_active: boolean;
  auto_sync_enabled: boolean;
  sync_frequency_minutes: number;
  
  // Sync Status and Monitoring
  last_sync_at?: string;
  last_sync_status: 'pending' | 'success' | 'error' | 'in_progress';
  last_sync_error?: string;
  
  // API Rate Limiting Tracking
  daily_api_calls: number;
  last_reset_date: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Raw GHL appointment data
export interface GHLAppointmentData {
  id: string;
  ghl_integration_id: string;
  project_id: string;
  
  // GHL Appointment Data
  ghl_appointment_id: string;
  contact_id?: string;
  calendar_id?: string;
  location_id?: string;
  
  // Appointment Details
  title?: string;
  start_time: string;
  end_time?: string;
  status?: 'confirmed' | 'cancelled' | 'no_show' | 'completed';
  
  // Contact Information
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  
  // Additional Data
  notes?: string;
  source?: string;
  ghl_raw_data?: any;
  
  // Metadata
  created_at: string;
  updated_at: string;
  synced_at: string;
}

// Raw GHL opportunity data
export interface GHLOpportunityData {
  id: string;
  ghl_integration_id: string;
  project_id: string;
  
  // GHL Opportunity Data
  ghl_opportunity_id: string;
  contact_id?: string;
  pipeline_id?: string;
  pipeline_stage_id?: string;
  
  // Opportunity Details
  name?: string;
  status?: 'open' | 'won' | 'lost' | 'abandoned';
  monetary_value?: number;
  
  // Contact Information
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  
  // Dates
  created_date?: string;
  last_status_change_date?: string;
  close_date?: string;
  
  // Additional Data
  source?: string;
  assigned_to?: string;
  ghl_raw_data?: any;
  
  // Metadata
  created_at: string;
  updated_at: string;
  synced_at: string;
}

// GHL daily metrics aggregation
export interface GHLDailyMetrics {
  id: string;
  ghl_integration_id: string;
  project_id: string;
  date: string;
  
  // Appointment Metrics
  appointments_total: number;
  appointments_confirmed: number;
  appointments_completed: number;
  appointments_no_show: number;
  appointments_cancelled: number;
  
  // Opportunity Metrics
  opportunities_total: number;
  opportunities_won: number;
  opportunities_lost: number;
  opportunities_open: number;
  
  // Revenue Metrics
  revenue_total: number;
  revenue_won: number;
  average_deal_value: number;
  
  // Conversion Metrics
  appointment_show_rate: number;
  opportunity_conversion_rate: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateGHLIntegrationInput {
  api_key: string;
  location_id: string;
  location_name?: string;
  auto_sync_enabled?: boolean;
  sync_frequency_minutes?: number;
  skip_validation?: boolean; // Allow skipping location validation for manual entry
}

export interface UpdateGHLIntegrationInput {
  api_key?: string;
  location_id?: string;
  location_name?: string;
  is_active?: boolean;
  auto_sync_enabled?: boolean;
  sync_frequency_minutes?: number;
  selected_calendar_ids?: string[];
  selected_calendar_names?: string[];
}

// Backwards compatibility types
export type GHLIntegrationConfig = GHLIntegration;
export type CreateGHLIntegrationConfigInput = CreateGHLIntegrationInput;
export type UpdateGHLIntegrationConfigInput = UpdateGHLIntegrationInput;

// GHL API Endpoint Types
export type GHLEndpoint = 
  | 'appointments' 
  | 'opportunities' 
  | 'contacts' 
  | 'invoices'
  | 'locations';

// GHL API Response Types
export interface GHLLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
}

// GHL Calendar Type
export interface GHLCalendar {
  id: string;
  name: string;
  description?: string;
  locationId: string;
  teamId?: string;
  isActive?: boolean;
  slug?: string;
  widgetType?: string;
  widgetColor?: string;
  backgroundColor?: string;
  textColor?: string;
  eventType?: string;
  eventTitle?: string;
  meetingLocation?: string;
  slotDuration?: number;
  slotInterval?: number;
  openHours?: any[];
  enableRecurring?: boolean;
  recurring?: any;
  formId?: string;
  smsReminder?: boolean;
  emailReminder?: boolean;
  timezone?: string;
  calendarType?: string;
}

export interface GHLAppointment {
  id: string;
  locationId: string;
  contactId: string;
  calendarId: string;
  title: string;
  appointmentStatus: 'scheduled' | 'completed' | 'confirmed' | 'cancelled' | 'no_show';
  startTime: string;
  endTime: string;
  address?: string;
  notes?: string;
  assignedUserId?: string;
  dateAdded: string;
  dateUpdated: string;
}

export interface GHLOpportunity {
  id: string;
  locationId: string;
  contactId: string;
  name: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  stage: string;
  monetaryValue: number;
  currency: string;
  source?: string;
  assignedTo?: string;
  dateAdded: string;
  dateUpdated: string;
}

export interface GHLContact {
  id: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  source?: string;
  tags: string[];
  dateAdded: string;
  dateUpdated: string;
}

export interface GHLInvoice {
  id: string;
  locationId: string;
  contactId: string;
  number: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'void';
  currency: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
}

// GHL API Query Parameters
export interface GHLApiParams {
  locationId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  status?: string;
  [key: string]: any;
}

// GHL Dashboard Metrics
// Calendar-focused dashboard metrics
export interface GHLDashboardMetrics {
  appointments: {
    total: number;
    scheduled: number;
    completed: number;
    no_show: number;
    cancelled: number;
    pending: number;
  };
  calendarBreakdown?: {
    [calendarId: string]: {
      calendarName: string;
      total: number;
      completed: number;
      no_show: number;
      cancelled: number;
      scheduled: number;
    };
  };
  performance: {
    show_rate: number; // completed / (completed + no_show)
    completion_rate: number; // completed / total
    cancellation_rate: number; // cancelled / total
  };
}

// Extended Project Daily Metrics with GHL fields
export interface ProjectDailyMetricsWithGHL {
  // Existing fields...
  id: string;
  project_id: string;
  user_id: string;
  date: string;
  source: string;
  
  // Standard metrics
  outbound_clicks?: number;
  amount_spent?: number;
  outbound_ctr?: number;
  cpm?: number;
  cpc?: number;
  impressions?: number;
  reach?: number;
  frequency?: number;
  conversions?: number;
  conversion_rate?: number;
  cost_per_conversion?: number;
  revenue?: number;
  roas?: number;
  
  // GHL-specific fields
  ghl_appointments_total?: number;
  ghl_appointments_completed?: number;
  ghl_appointments_no_show?: number;
  ghl_appointments_cancelled?: number;
  ghl_deals_total?: number;
  ghl_deals_won?: number;
  ghl_deals_lost?: number;
  ghl_deals_value?: number;
  ghl_deals_won_value?: number;
  
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// GHL Integration Status
export interface GHLIntegrationStatus {
  isConfigured: boolean;
  isActive: boolean;
  lastSync?: string;
  syncStatus: 'pending' | 'success' | 'error' | 'in_progress';
  error?: string;
  apiUsage: {
    dailyCalls: number;
    limit: number;
    resetDate: string;
  };
}

// GHL Setup Wizard Steps
export type GHLSetupStep = 
  | 'api_key' 
  | 'location_selection' 
  | 'metric_mapping' 
  | 'sync_settings' 
  | 'completion';

export interface GHLSetupState {
  currentStep: GHLSetupStep;
  apiKey?: string;
  selectedLocation?: GHLLocation;
  availableLocations: GHLLocation[];
  metricMappings: Partial<CreateGHLMetricMappingInput>[];
  syncSettings: {
    autoSync: boolean;
    frequency: number;
  };
}