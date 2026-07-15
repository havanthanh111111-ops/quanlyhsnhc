/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SchoolWeek {
  weekNumber: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  formattedStartDate: string; // DD/MM
  formattedEndDate: string; // DD/MM
  label: string; // e.g. "Tuần 35 (22/06 - 28/06)"
}

/**
 * Gets the configured starting Monday of Week 1 and total weeks from localStorage,
 * or returns standard defaults.
 */
export function getWeekConfig() {
  const startDate = localStorage.getItem('schoolYearStartDate') || '2025-10-27';
  const totalWeeks = parseInt(localStorage.getItem('totalSchoolWeeks') || '37', 10);
  return { startDate, totalWeeks };
}

/**
 * Saves the week configuration to localStorage.
 */
export function saveWeekConfig(startDate: string, totalWeeks: number) {
  localStorage.setItem('schoolYearStartDate', startDate);
  localStorage.setItem('totalSchoolWeeks', totalWeeks.toString());
  // Dispatch a storage event so other components can react if necessary
  window.dispatchEvent(new Event('storage'));
}

/**
 * Dynamically generates all school weeks starting from Monday of Week 1.
 */
export function generateWeeks(startDateStr: string, totalWeeks: number): SchoolWeek[] {
  const weeks: SchoolWeek[] = [];
  const baseDate = new Date(startDateStr);
  
  // Ensure we start on Monday of that week
  const day = baseDate.getDay();
  const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  const monday = new Date(baseDate.setDate(diff));

  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = new Date(monday.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

    const startYear = weekStart.getFullYear();
    const startMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
    const startDay = String(weekStart.getDate()).padStart(2, '0');

    const endYear = weekEnd.getFullYear();
    const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
    const endDay = String(weekEnd.getDate()).padStart(2, '0');

    const startDateStrYMD = `${startYear}-${startMonth}-${startDay}`;
    const endDateStrYMD = `${endYear}-${endMonth}-${endDay}`;

    const formattedStartDate = `${startDay}/${startMonth}`;
    const formattedEndDate = `${endDay}/${endMonth}`;

    weeks.push({
      weekNumber: i + 1,
      startDate: startDateStrYMD,
      endDate: endDateStrYMD,
      formattedStartDate,
      formattedEndDate,
      label: `Tuần ${i + 1} (${formattedStartDate} - ${formattedEndDate})`
    });
  }

  return weeks;
}

/**
 * Checks if a given date (YYYY-MM-DD) falls within a week's date range.
 */
export function isDateInWeek(dateStr: string, week: SchoolWeek): boolean {
  const date = new Date(dateStr);
  const start = new Date(week.startDate);
  const end = new Date(week.endDate);
  
  // Normalize times to midnight for accurate comparison
  date.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return date >= start && date <= end;
}
