"use client";
import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, parseISODate, toISODate } from "@/lib/utils";

interface DatePickerProps extends Omit<React.ComponentProps<"button">, "onChange" | "value"> {
  value?: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: Date;
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", minDate, className, ...rest }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseISODate(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          {...rest}
          type="button"
          variant="outline"
          className={cn("w-full justify-start px-3 text-left font-normal", !selected && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-1" />
          {selected
            ? new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(selected)
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            if (d) {
              onChange(toISODate(d));
              setOpen(false);
            }
          }}
          disabled={minDate ? { before: minDate } : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
