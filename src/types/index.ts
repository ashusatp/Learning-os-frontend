export interface User {
  id: string;
  email: string;
  name: string;
  auth_provider: string | null;
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  ai_enabled: boolean;
  ai_requests_today: number;
  plan: string;
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

export interface SubtopicFile {
  id: string;
  subtopic_id: string;
  folder_id: string | null;
  name: string;
  original_name: string;
  content_type: string;
  size: number;
  created_at: string;
}

export interface SubtopicFolder {
  id: string;
  subtopic_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
}

export interface FolderContents {
  folders: SubtopicFolder[];
  files: SubtopicFile[];
}

export type QuestionType =
  | "SINGLE_MCQ"
  | "MULTI_MCQ"
  | "NUMERICAL"
  | "TRUE_FALSE"
  | "SUBJECTIVE";

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export interface QuestionOption {
  id: string;
  question_id: string;
  text_html: string;
  is_correct: boolean;
  order: number;
  created_at: string;
}

export interface Question {
  id: string;
  subtopic_id: string;
  question_type: QuestionType;
  text_html: string;
  explanation_html: string | null;
  difficulty: DifficultyLevel;
  marks: number;
  negative_marks: number;
  numerical_answer: number | null;
  numerical_tolerance: number | null;
  answer_html: string | null;
  is_pyq: boolean;
  tags: string[];
  order: number;
  options: QuestionOption[];
  created_at: string;
  updated_at: string;
}

export type MistakeType =
  | "CONCEPTUAL"
  | "SILLY"
  | "CALCULATION"
  | "MISREAD"
  | "TIME_PRESSURE"
  | "OTHER";

export interface Mistake {
  id: string;
  subtopic_id: string;
  question_id: string | null;
  mistake_type: MistakeType;
  description_html: string;
  correction_html: string | null;
  tags: string[];
  is_resolved: boolean;
  resolved_at: string | null;
  revision_count: number;
  last_revised_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubtopicStats {
  mastery_level: MasteryLevel;
  confidence_level: number;
  revision_count: number;
  last_revised_at: string | null;
  question_count: number;
  total_mistakes: number;
  unresolved_mistakes: number;
  resolved_mistakes: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

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
  notes_html: string | null;
  sketch_data_url: string | null;
  whiteboard_data_url: string | null;
  files: SubtopicFile[];
  created_at: string;
  updated_at: string;
}
