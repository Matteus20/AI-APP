
export type AgeGroup = 'child' | 'teen' | 'young-adult' | 'adult' | 'senior';

export interface UserProfile {
  name: string;
  age: number;
  ageGroup: AgeGroup;
  height: number;
  weight: number;
  goalWeight: number;
  goalType: 'lose' | 'gain';
  language: string;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  type: 'exercise' | 'habit' | 'food';
  completed: boolean;
}

export interface FoodItem {
  name: string;
  category: 'permitted' | 'prohibited';
  reason: string;
}

export interface WeeklyCheckIn {
  date: string;
  weight: number;
  height: number;
  feedback: string;
}

export interface AppState {
  user: UserProfile | null;
  tasks: DailyTask[];
  checkIns: WeeklyCheckIn[];
  foodGuide: FoodItem[];
  theme: 'light' | 'dark';
  points: number;
}
