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
  if (percentage >= 90) return { letter: 'A+', class: 'gradeAPlus' };
  if (percentage >= 85) return { letter: 'A', class: 'gradeA' };
  if (percentage >= 80) return { letter: 'A-', class: 'gradeAMinus' };
  if (percentage >= 77) return { letter: 'B+', class: 'gradeBPlus' };
  if (percentage >= 73) return { letter: 'B', class: 'gradeB' };
  if (percentage >= 70) return { letter: 'B-', class: 'gradeBMinus' };
  if (percentage >= 67) return { letter: 'C+', class: 'gradeCPlus' };
  if (percentage >= 63) return { letter: 'C', class: 'gradeC' };
  if (percentage >= 60) return { letter: 'C-', class: 'gradeCMinus' };
  if (percentage >= 57) return { letter: 'D+', class: 'gradeDPlus' };
  if (percentage >= 53) return { letter: 'D', class: 'gradeD' };
  if (percentage >= 50) return { letter: 'D-', class: 'gradeDMinus' };
  return { letter: 'F', class: 'gradeF' };
}

export function generateId(): string {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
