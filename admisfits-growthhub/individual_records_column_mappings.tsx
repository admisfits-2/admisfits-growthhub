/* 
 * This code should be added to the column mapping section to handle individual records mode
 * Look for the section where metricMappings are displayed and add this as an additional section
 */

{/* Individual Records Required Mappings */}
{syncMode === 'individual_records' && (
  <div className="space-y-3">
    <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
      <h4 className="text-sm font-medium text-blue-900 mb-2">Individual Records Mode</h4>
      <p className="text-xs text-blue-700">
        Map the required columns for individual record tracking. Each row will be stored as a separate record.
      </p>
    </div>

    {/* Unique ID Mapping (Required) */}
    <div className="border rounded-lg p-4 bg-yellow-50">
      <div className="flex items-center gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-red-600">
              Unique ID Column *
            </Label>
            <Input
              placeholder="e.g., Close ID, Lead ID, Sale ID"
              value={uniqueIdMapping?.metricName || ''}
              onChange={(e) => setUniqueIdMapping(prev => prev ? {...prev, metricName: e.target.value} : {
                id: 'unique_id', 
                metricName: e.target.value, 
                columnLetter: '', 
                isCustom: true, 
                metricKey: 'unique_id'
              })}
            />
            <p className="text-xs text-muted-foreground">
              Must be unique for each record (e.g., close_id, lead_id)
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Column</Label>
            <Select 
              value={uniqueIdMapping?.columnLetter || ''} 
              onValueChange={(value) => setUniqueIdMapping(prev => prev ? {...prev, columnLetter: value} : {
                id: 'unique_id', 
                metricName: '', 
                columnLetter: value, 
                isCustom: true, 
                metricKey: 'unique_id'
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columnHeaders.map((header, index) => (
                  <SelectItem key={index} value={getColumnLetter(index)}>
                    {getColumnLetter(index)} - {header || 'No header'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>

    {/* Amount Mapping (Optional) */}
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">
              Amount Column (Optional)
            </Label>
            <Input
              placeholder="e.g., Sale Amount, Deal Value"
              value={amountMapping?.metricName || ''}
              onChange={(e) => setAmountMapping(prev => prev ? {...prev, metricName: e.target.value} : {
                id: 'amount', 
                metricName: e.target.value, 
                columnLetter: '', 
                isCustom: true, 
                metricKey: 'amount'
              })}
            />
            <p className="text-xs text-muted-foreground">
              Monetary value for this record
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Column</Label>
            <Select 
              value={amountMapping?.columnLetter || ''} 
              onValueChange={(value) => setAmountMapping(prev => prev ? {...prev, columnLetter: value} : {
                id: 'amount', 
                metricName: '', 
                columnLetter: value, 
                isCustom: true, 
                metricKey: 'amount'
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {columnHeaders.map((header, index) => (
                  <SelectItem key={index} value={getColumnLetter(index)}>
                    {getColumnLetter(index)} - {header || 'No header'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>

    {/* Status Mapping (Optional) */}
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">
              Status Column (Optional)
            </Label>
            <Input
              placeholder="e.g., Deal Status, Lead Status"
              value={statusMapping?.metricName || ''}
              onChange={(e) => setStatusMapping(prev => prev ? {...prev, metricName: e.target.value} : {
                id: 'status', 
                metricName: e.target.value, 
                columnLetter: '', 
                isCustom: true, 
                metricKey: 'status'
              })}
            />
            <p className="text-xs text-muted-foreground">
              Status of this record (closed, pending, etc.)
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Column</Label>
            <Select 
              value={statusMapping?.columnLetter || ''} 
              onValueChange={(value) => setStatusMapping(prev => prev ? {...prev, columnLetter: value} : {
                id: 'status', 
                metricName: '', 
                columnLetter: value, 
                isCustom: true, 
                metricKey: 'status'
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {columnHeaders.map((header, index) => (
                  <SelectItem key={index} value={getColumnLetter(index)}>
                    {getColumnLetter(index)} - {header || 'No header'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  </div>
)}