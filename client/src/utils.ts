export const DateUtility = {
  getAllDatesFromStart(startDate: Date): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(start);
    while (currentDate <= today) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  },
  
  formatDate(date: Date): string {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  },
  
  formatDateRange(dates: Date[]): string {
    if (dates.length === 0) return '';
    const start = dates[0];
    const end = dates[dates.length - 1];
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  },
  
  getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  },
  
  getDayNumber(date: Date): number {
    return date.getDate();
  },
  
  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  },

  getWeekStart(date: Date): Date {
    const dayOfWeek = date.getDay();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }
};

export function getGrade(percentage: number): { letter: string; class: string } {
  if (percentage >= 90) return { letter: 'A+', class: 'grade-A-plus' };
  if (percentage >= 85) return { letter: 'A', class: 'grade-A' };
  if (percentage >= 80) return { letter: 'A-', class: 'grade-A-minus' };
  if (percentage >= 77) return { letter: 'B+', class: 'grade-B-plus' };
  if (percentage >= 73) return { letter: 'B', class: 'grade-B' };
  if (percentage >= 70) return { letter: 'B-', class: 'grade-B-minus' };
  if (percentage >= 67) return { letter: 'C+', class: 'grade-C-plus' };
  if (percentage >= 63) return { letter: 'C', class: 'grade-C' };
  if (percentage >= 60) return { letter: 'C-', class: 'grade-C-minus' };
  if (percentage >= 57) return { letter: 'D+', class: 'grade-D-plus' };
  if (percentage >= 53) return { letter: 'D', class: 'grade-D' };
  if (percentage >= 50) return { letter: 'D-', class: 'grade-D-minus' };
  return { letter: 'F', class: 'grade-F' };
}

export function generateId(): string {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
