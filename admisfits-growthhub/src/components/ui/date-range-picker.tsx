import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

interface DateRangePickerProps {
  date?: DateRange;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  date, 
  onDateChange, 
  className 
}) => {
  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = new Date(e.target.value);
    if (!isNaN(newFrom.getTime())) {
      onDateChange({
        from: newFrom,
        to: date?.to
      });
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = new Date(e.target.value);
    if (!isNaN(newTo.getTime())) {
      onDateChange({
        from: date?.from,
        to: newTo
      });
    }
  };

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <div className="flex-1">
        <Label htmlFor="from-date" className="sr-only">From Date</Label>
        <Input
          id="from-date"
          type="date"
          value={date?.from ? format(date.from, 'yyyy-MM-dd') : ''}
          onChange={handleFromChange}
          placeholder="Start date"
        />
      </div>
      <span className="text-gray-500">to</span>
      <div className="flex-1">
        <Label htmlFor="to-date" className="sr-only">To Date</Label>
        <Input
          id="to-date"
          type="date"
          value={date?.to ? format(date.to, 'yyyy-MM-dd') : ''}
          onChange={handleToChange}
          placeholder="End date"
        />
      </div>
    </div>
  );
};