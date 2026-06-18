export interface User {
  id: string;
  email: string;
  name: string;
  auth_provider: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_exam: string | null;
  target_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  goal_id: string;
  name: string;
  description: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export type MasteryLevel =
  | "NOT_STARTED"
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "MASTERED";

export interface SubTopic {
  id: string;
  topic_id: string;
  name: string;
  description: string | null;
  order: number;
  revision_count: number;
  last_revised_at: string | null;
  confidence_level: number;
  mastery_level: MasteryLevel;
  questions_solved: number;
  questions_correct: number;
  mistake_count: number;
  created_at: string;
  updated_at: string;
}
