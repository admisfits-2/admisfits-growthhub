# Database Migration Guide - Individual Records Feature

## 🎯 What This Migration Does

This migration adds support for **individual record tracking** to your Google Sheets integration, solving the problem where multiple sales on the same date were being overwritten.

### Before Migration:
- ❌ Only 1 record per date (last sale overwrites previous ones)
- ❌ Lost data when multiple sales occur on same date

### After Migration:
- ✅ Unlimited individual records per date  
- ✅ Each sale stored with unique close_id
- ✅ Full transaction history preserved
- ✅ Backward compatible with existing daily aggregates

## 🚀 Migration Steps

### Step 1: Run the Main Migration

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `lpuqcvnyzvnrsiyhwoxs`

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run the Migration Script**
   - Open `complete_database_update.sql` 
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run" 

**Expected Result:** You should see:
```
Individual records database migration completed successfully!
```

### Step 2: Verify the Migration

1. **Run the Test Script**
   - Open `test_individual_records.sql`
   - Copy the verification queries (at the bottom)
   - Run them in SQL Editor

2. **Check New Tables**
   You should see:
   - ✅ `project_individual_records` table created
   - ✅ `google_sheets_sync_configs` updated with new columns
   - ✅ `project_daily_record_aggregates` view created

### Step 3: Test with Sample Data (Optional)

1. **Get Your Project and User IDs**
   ```sql
   SELECT id, name FROM projects LIMIT 5;
   SELECT id, email FROM auth.users LIMIT 5;
   ```

2. **Insert Test Records**
   - Uncomment the test data in `test_individual_records.sql`
   - Replace `'your-project-id-here'` with real project ID
   - Replace `'your-user-id-here'` with real user ID
   - Run the INSERT statements

3. **Verify Multiple Records Per Date**
   ```sql
   SELECT date, record_id, amount, status 
   FROM project_individual_records 
   WHERE project_id = 'your-actual-project-id'
   ORDER BY date, record_id;
   ```

## 📊 New Database Structure

### `project_individual_records` Table
```sql
- id (UUID, Primary Key)
- project_id (UUID, Foreign Key to projects)
- user_id (UUID, Foreign Key to auth.users)
- record_id (VARCHAR, Unique identifier like close_id)
- date (DATE)
- source (VARCHAR, default 'google_sheets')
- record_type (VARCHAR, 'sale', 'lead', 'call', etc.)
- amount (DECIMAL, optional)
- status (VARCHAR, optional)
- record_data (JSONB, all other fields)
- created_at, updated_at (TIMESTAMPS)

UNIQUE CONSTRAINT: (project_id, source, record_id)
```

### Updated `google_sheets_sync_configs` Columns
```sql
- sync_mode (VARCHAR, 'daily_aggregate' | 'individual_records')
- unique_id_column (VARCHAR, required for individual_records)
- record_type (VARCHAR, required for individual_records)
- amount_column (VARCHAR, optional)
- status_column (VARCHAR, optional)
- auto_aggregate (BOOLEAN, generate daily totals from individual records)
```

## 🔍 How to Use Individual Records Mode

### In Your Spreadsheet:
```
| Date       | Close ID | Amount | Status  | Customer    |
|------------|----------|--------|---------|-------------|
| 2024-01-15 | SALE001  | 2500   | closed  | John Doe    |
| 2024-01-15 | SALE002  | 3200   | closed  | Jane Smith  |
| 2024-01-15 | SALE003  | 1800   | pending | Bob Johnson |
```

### Configuration:
- **Sync Mode**: Individual Records
- **Record Type**: sale
- **Unique ID Column**: B (Close ID)
- **Date Column**: A (Date)
- **Amount Column**: C (Amount)
- **Status Column**: D (Status)

### Result:
**3 separate records** stored instead of 1 aggregated record!

## 🛡️ Security & Permissions

- ✅ **Row Level Security** enabled
- ✅ Users can only see their own project records
- ✅ Proper foreign key constraints
- ✅ Optimized indexes for performance

## 🔧 Helper Functions Added

1. **`get_project_individual_records()`**
   - Get all individual records for a project
   - Filter by date range and record type

2. **`get_daily_aggregates_from_records()`**
   - Generate daily totals from individual records
   - Useful for charts and reporting

3. **`project_daily_record_aggregates` View**
   - Pre-aggregated daily metrics
   - Auto-updated when records change

## ✅ Migration Checklist

- [ ] Run `complete_database_update.sql` in Supabase SQL Editor
- [ ] Verify tables and columns exist with test queries
- [ ] Test inserting sample individual records
- [ ] Confirm multiple records per date work correctly
- [ ] Update your application code to use new sync mode
- [ ] Test with your actual sales spreadsheet

## 🎉 Next Steps

After the database migration:

1. **Update UI Components** (already prepared)
   - Add sync mode toggle to Google Sheets setup
   - Add unique ID column mapping

2. **Test with Real Data**
   - Configure your sales spreadsheet in Individual Records mode
   - Verify all sales with unique close_ids are captured

3. **Monitor Performance**
   - Individual records table is optimized for large datasets
   - Aggregation view provides fast daily summaries

---

**Need Help?** The migration is designed to be safe and reversible. All existing data remains untouched, and new functionality is added alongside existing features.