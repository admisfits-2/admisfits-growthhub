import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Palette } from "lucide-react";

interface ColorPickerProps {
  selectedColors?: string[];
  onColorsChange?: (colors: string[]) => void;
  maxColors?: number;
  className?: string;
}

const predefinedColors = [
  // Teal variations (as requested)
  "rgb(14, 116, 144)",   // Deep teal
  "rgb(5, 150, 105)",    // Emerald
  "rgb(16, 185, 129)",   // Green
  "rgb(6, 182, 212)",    // Cyan
  "rgb(34, 197, 94)",    // Lime
  "rgb(20, 184, 166)",   // Teal
  
  // Additional colors
  "rgb(99, 102, 241)",   // Indigo
  "rgb(168, 85, 247)",   // Purple
  "rgb(236, 72, 153)",   // Pink
  "rgb(239, 68, 68)",    // Red
  "rgb(245, 158, 11)",   // Amber
  "rgb(251, 191, 36)",   // Yellow
  
  // Darker variations
  "rgb(15, 118, 110)",   // Dark teal
  "rgb(17, 94, 89)",     // Darker teal
  "rgb(55, 65, 81)",     // Dark gray
  "rgb(75, 85, 99)",     // Gray
];

const colorNames: { [key: string]: string } = {
  "rgb(14, 116, 144)": "Deep Teal",
  "rgb(5, 150, 105)": "Emerald",
  "rgb(16, 185, 129)": "Green",
  "rgb(6, 182, 212)": "Cyan",
  "rgb(34, 197, 94)": "Lime",
  "rgb(20, 184, 166)": "Teal",
  "rgb(99, 102, 241)": "Indigo",
  "rgb(168, 85, 247)": "Purple",
  "rgb(236, 72, 153)": "Pink",
  "rgb(239, 68, 68)": "Red",
  "rgb(245, 158, 11)": "Amber",
  "rgb(251, 191, 36)": "Yellow",
  "rgb(15, 118, 110)": "Dark Teal",
  "rgb(17, 94, 89)": "Darker Teal",
  "rgb(55, 65, 81)": "Dark Gray",
  "rgb(75, 85, 99)": "Gray",
};

export function ColorPicker({ 
  selectedColors = [], 
  onColorsChange, 
  maxColors = 1,
  className 
}: ColorPickerProps) {
  const handleColorToggle = (color: string) => {
    if (!onColorsChange) return;
    
    if (selectedColors.includes(color)) {
      // Remove color
      onColorsChange(selectedColors.filter(c => c !== color));
    } else {
      // Add color (respecting max limit)
      if (selectedColors.length < maxColors) {
        onColorsChange([...selectedColors, color]);
      } else if (maxColors === 1) {
        // Replace single color
        onColorsChange([color]);
      }
    }
  };

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Palette className="h-4 w-4 mr-2" />
            Colors
            {selectedColors.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedColors.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Chart Colors</h4>
            
            {selectedColors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Selected colors:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedColors.map((color, index) => (
                    <div key={color} className="flex items-center gap-1">
                      <div 
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs">{colorNames[color] || `Color ${index + 1}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {maxColors === 1 ? "Select a color:" : `Select up to ${maxColors} colors:`}
              </p>
              <div className="grid grid-cols-6 gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                      selectedColors.includes(color) 
                        ? 'border-gray-800 ring-2 ring-gray-300' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorToggle(color)}
                    title={colorNames[color] || color}
                  />
                ))}
              </div>
            </div>
            
            {maxColors > 1 && (
              <div className="text-xs text-muted-foreground">
                Selected: {selectedColors.length}/{maxColors}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}