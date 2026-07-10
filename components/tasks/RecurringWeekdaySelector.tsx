"use client";

import { RecurringDayChip } from "./RecurringDayChip";

interface RecurringWeekdaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

const DAY_STYLES = [
  {
    dayName: "Sun",
    value: 0,
    activeClass: "border-red-200 bg-red-50/40 dark:border-red-800 dark:bg-red-950/20 text-red-600 dark:text-red-400",
    iconClass: "text-red-500",
    badgeClass: "bg-red-500 text-white",
  },
  {
    dayName: "Mon",
    value: 1,
    activeClass: "border-green-200 bg-green-50/40 dark:border-green-800 dark:bg-green-950/20 text-green-600 dark:text-green-400",
    iconClass: "text-green-500",
    badgeClass: "bg-green-500 text-white",
  },
  {
    dayName: "Tue",
    value: 2,
    activeClass: "border-orange-200 bg-orange-50/40 dark:border-orange-800 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400",
    iconClass: "text-orange-500",
    badgeClass: "bg-orange-500 text-white",
  },
  {
    dayName: "Wed",
    value: 3,
    activeClass: "border-purple-200 bg-purple-50/40 dark:border-purple-800 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400",
    iconClass: "text-purple-500",
    badgeClass: "bg-purple-500 text-white",
  },
  {
    dayName: "Thu",
    value: 4,
    activeClass: "border-blue-200 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400",
    iconClass: "text-blue-500",
    badgeClass: "bg-blue-500 text-white",
  },
  {
    dayName: "Fri",
    value: 5,
    activeClass: "border-cyan-200 bg-cyan-50/40 dark:border-cyan-800 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400",
    iconClass: "text-cyan-500",
    badgeClass: "bg-cyan-500 text-white",
  },
  {
    dayName: "Sat",
    value: 6,
    activeClass: "border-pink-200 bg-pink-50/40 dark:border-pink-800 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400",
    iconClass: "text-pink-500",
    badgeClass: "bg-pink-500 text-white",
  },
];

export function RecurringWeekdaySelector({
  selectedDays,
  onChange,
}: RecurringWeekdaySelectorProps) {
  function handleDayToggle(value: number) {
    if (selectedDays.includes(value)) {
      onChange(selectedDays.filter((d) => d !== value));
    } else {
      onChange([...selectedDays, value]);
    }
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
      {DAY_STYLES.map((day) => {
        const isSelected = selectedDays.includes(day.value);
        return (
          <RecurringDayChip
            key={day.value}
            dayName={day.dayName}
            dayValue={day.value}
            selected={isSelected}
            onClick={() => handleDayToggle(day.value)}
            activeClass={day.activeClass}
            iconClass={day.iconClass}
            badgeClass={day.badgeClass}
          />
        );
      })}
    </div>
  );
}
