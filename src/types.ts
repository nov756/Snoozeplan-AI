export interface ScheduleItem {
  id: string;
  title: string;
  start: string; // Format "HH:mm"
  end: string;   // Format "HH:mm"
  category: 'akademik' | 'eksternal' | 'sosial' | 'biologis';
  reminderMinutes?: number; // Minutes before start, e.g. 15, 30, 60, or 0 (on time). -1 is none.
  reminderFired?: boolean;
}

export interface TodoItem {
  id: string;
  task: string;
  completed: boolean;
}

export interface OptimizationResponse {
  success: boolean;
  schedules: ScheduleItem[];
  todos: TodoItem[];
  energyScore: number;
  sleepDurationHours: number;
  conflictText: string | null;
  coachingTip: string;
}
