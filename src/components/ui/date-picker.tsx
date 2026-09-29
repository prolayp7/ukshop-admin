"use client"

import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react"

import { cn } from "@/lib/cn"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  type?: "date" | "datetime-local"
  min?: string
  max?: string
  className?: string
  placeholder?: string
  "aria-label"?: string
}

const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"))
const minutes = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"))

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date)
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function changeMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

function isBeforeLimit(date: Date, limit?: string) {
  return Boolean(limit && dateValue(date) < limit.slice(0, 10))
}

function isAfterLimit(date: Date, limit?: string) {
  return Boolean(limit && dateValue(date) > limit.slice(0, 10))
}

export function DatePicker({
  value,
  onChange,
  type = "date",
  min,
  max,
  className,
  placeholder = "Select date",
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const isDateTime = type === "datetime-local"
  const selectedDate = parseDate(value)
  const timeMatch = /T(\d{2}):(\d{2})/.exec(value)
  const selectedHour = timeMatch?.[1] ?? "09"
  const selectedMinute = timeMatch?.[2] ?? "00"
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date())

  const days = Array.from({ length: 42 }, (_, index) => {
    const first = monthStart(viewDate)
    const mondayOffset = (first.getDay() + 6) % 7
    return new Date(first.getFullYear(), first.getMonth(), index - mondayOffset + 1)
  })
  const visibleValue = selectedDate
    ? `${formatDate(selectedDate)}${isDateTime ? `, ${selectedHour}:${selectedMinute}` : ""}`
    : ""

  function chooseDate(date: Date) {
    const nextValue = dateValue(date)
    onChange(isDateTime ? `${nextValue}T${selectedHour}:${selectedMinute}` : nextValue)
    if (!isDateTime) setOpen(false)
  }

  function chooseTime(hour: string, minute: string) {
    const date = selectedDate ?? viewDate
    onChange(`${dateValue(date)}T${hour}:${minute}`)
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) setViewDate(parseDate(value) ?? new Date())
      setOpen(nextOpen)
    }}>
      <PopoverTrigger
        type="button"
        aria-label={ariaLabel}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-2.5 text-left text-[13px] text-ink-secondary outline-none transition-colors hover:bg-neutral-tint focus-visible:border-accent-strong focus-visible:ring-2 focus-visible:ring-accent-tint-border",
          className
        )}
      >
        <span className={cn("truncate", !visibleValue && "text-ink-faint")}>
          {visibleValue || placeholder}
        </span>
        {isDateTime ? <Clock3 className="h-4 w-4 shrink-0 text-ink-muted" /> : <CalendarDays className="h-4 w-4 shrink-0 text-ink-muted" />}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-70 gap-3 p-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewDate((date) => changeMonth(date, -1))}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-neutral-tint focus-visible:outline-2 focus-visible:outline-accent-strong"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold text-ink">
            {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(viewDate)}
          </p>
          <button
            type="button"
            onClick={() => setViewDate((date) => changeMonth(date, 1))}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-neutral-tint focus-visible:outline-2 focus-visible:outline-accent-strong"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ink-muted" aria-hidden="true">
          {weekdays.map((weekday) => <span key={weekday} className="py-1">{weekday}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1" role="group" aria-label="Choose a date">
          {days.map((date) => {
            const key = dateValue(date)
            const isCurrentMonth = date.getMonth() === viewDate.getMonth()
            const isSelected = selectedDate && key === dateValue(selectedDate)
            const disabled = isBeforeLimit(date, min) || isAfterLimit(date, max)
            return (
              <button
                key={key}
                type="button"
                aria-label={formatDate(date)}
                aria-pressed={Boolean(isSelected)}
                disabled={disabled}
                onClick={() => chooseDate(date)}
                className={cn(
                  "h-8 rounded-md text-xs tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-accent-strong",
                  isSelected ? "bg-ink font-semibold text-white" : "text-ink-secondary hover:bg-neutral-tint",
                  !isCurrentMonth && "text-ink-faint",
                  disabled && "cursor-not-allowed opacity-30 hover:bg-transparent"
                )}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
        {isDateTime ? <div className="flex items-center gap-2 border-t border-border pt-3">
          <Clock3 className="h-4 w-4 shrink-0 text-ink-muted" />
          <Select value={selectedHour} onValueChange={(hour) => { if (hour) chooseTime(hour, selectedMinute) }}>
            <SelectTrigger aria-label="Hour" className="h-8 min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-56 min-w-16">
              {hours.map((hour) => <SelectItem key={hour} value={hour}>{hour}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-ink-muted">:</span>
          <Select value={selectedMinute} onValueChange={(minute) => { if (minute) chooseTime(selectedHour, minute) }}>
            <SelectTrigger aria-label="Minute" className="h-8 min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-56 min-w-16">
              {minutes.map((minute) => <SelectItem key={minute} value={minute}>{minute}</SelectItem>)}
            </SelectContent>
          </Select>
        </div> : null}
        {value ? <button
          type="button"
          onClick={() => { onChange(""); setOpen(false) }}
          className="w-full border-t border-border pt-2 text-left text-xs font-medium text-ink-muted hover:text-ink"
        >
          Clear date
        </button> : null}
      </PopoverContent>
    </Popover>
  )
}