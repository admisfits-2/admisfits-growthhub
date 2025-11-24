/* 
 * This UI code should be inserted before the first "Column Mapping" section 
 * in GoogleSheetsOAuthSyncV4.tsx (around line 1302)
 * 
 * Add this code block right after the preview data table and before:
 * {/* Column Mapping */}
 */

{/* Sync Mode Configuration */}
{selectedSheets.size > 0 && (
  <div>
    <Label>Data Sync Mode</Label>
    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
      {/* Sync Mode Toggle */}
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="daily_aggregate"
              name="syncMode"
              value="daily_aggregate"
              checked={syncMode === 'daily_aggregate'}
              onChange={(e) => setSyncMode(e.target.value as 'daily_aggregate' | 'individual_records')}
              className="w-4 h-4"
            />
            <Label htmlFor="daily_aggregate" className="text-sm font-medium">
              Daily Aggregates
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            One row per date with summarized metrics (traditional approach)
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="individual_records"
              name="syncMode"
              value="individual_records"
              checked={syncMode === 'individual_records'}
              onChange={(e) => setSyncMode(e.target.value as 'daily_aggregate' | 'individual_records')}
              className="w-4 h-4"
            />
            <Label htmlFor="individual_records" className="text-sm font-medium">
              Individual Records
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Each row represents a unique record (sales, leads, etc.) - supports multiple entries per date
          </p>
        </div>
      </div>

      {/* Individual Records Configuration */}
      {syncMode === 'individual_records' && (
        <div className="space-y-4 pl-6 border-l-2 border-blue-200">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Record Type</Label>
            <Select value={recordType} onValueChange={setRecordType}>
              <SelectTrigger>
                <SelectValue placeholder="Select record type" />
              </SelectTrigger>
              <SelectContent>
                {recordTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Required Mappings for Individual Records</h4>
            <p className="text-xs text-blue-700 mb-2">
              When using individual records mode, you must map these required columns:
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>Date:</strong> Transaction/record date</li>
              <li>• <strong>Unique ID:</strong> Unique identifier (e.g., close_id, lead_id)</li>
              <li>• <strong>Amount (optional):</strong> Transaction value</li>
              <li>• <strong>Status (optional):</strong> Record status</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  </div>
)}