"use client";

import * as React from "react";
import { addDays, format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  className?: string;
  onRangeChange?: (range: { from: Date; to: Date } | undefined) => void;
}

export function DateRangePicker({
  className,
  onRangeChange,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [showCustom, setShowCustom] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const presets = [
    { label: "Hari Ini", getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
    { label: "Kemarin", getRange: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
    { label: "Minggu Ini", getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
    { label: "Bulan Ini", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: "Tahun Ini", getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  ];


  const handleSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if (newDate?.from && newDate?.to) {
      onRangeChange?.({ from: newDate.from, to: newDate.to });
      // Don't auto-close for custom to let user see selection
    }
  };

  const setPreset = (getRange: () => { from: Date; to: Date }) => {
    const range = getRange();
    setDate(range);
    onRangeChange?.(range);
    setOpen(false); // Close on preset select
    setShowCustom(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) setShowCustom(false);
      }}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full md:w-[280px] justify-between text-left font-bold text-[11px] uppercase tracking-wider bg-card h-10 rounded-xl border-border/40 transition-all hover:border-foreground/40 px-4 shadow-sm",
              !date && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-3 truncate">
              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
              <span className="truncate">
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "dd MMM", { locale: id })} -{" "}
                      {format(date.to, "dd MMM yyyy", { locale: id })}
                    </>
                  ) : (
                    format(date.from, "dd MMM yyyy", { locale: id })
                  )
                ) : (
                  <span>Pilih Tanggal</span>
                )}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 opacity-30" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-2 rounded-2xl overflow-hidden shadow-2xl border border-border/20 bg-card" align="end">
          {!showCustom ? (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 px-3 py-3">Pilih Periode</p>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  className="justify-start font-bold text-[11px] h-10 px-3 rounded-xl transition-all uppercase tracking-tight hover:bg-primary/10 hover:text-primary group"
                  onClick={() => setPreset(preset.getRange)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="justify-between font-bold text-[11px] h-10 px-3 rounded-xl transition-all uppercase tracking-tight hover:bg-primary/10 hover:text-primary group"
                onClick={() => setShowCustom(true)}
              >
                <span>kustom</span>
                <ChevronDown className="h-3 w-3 -rotate-90 opacity-40" />
              </Button>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center gap-2 p-2 border-b mb-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowCustom(false)}>
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Pilih Manual</span>
               </div>
               <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={1}
                locale={id}
                className="p-1"
              />
              <div className="p-2 pt-0">
                <Button className="w-full h-9 text-[10px] font-bold uppercase tracking-wider rounded-xl" onClick={() => setOpen(false)}>
                  Terapkan
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

