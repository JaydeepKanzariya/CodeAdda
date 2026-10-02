export type LabLanguage = 'sql' | 'mongodb' | 'redis';
export type EngineMode = 'browser' | 'real';

export interface QuerySuccess {
  ok: true;
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  durationMs: number;
  notice?: string;
}

export interface QueryFailure {
  ok: false;
  error: { message: string; position?: number; code?: string };
}

export type QueryResult = QuerySuccess | QueryFailure;

export interface Dataset {
  name: string;
  source: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
  isForeign: boolean;
  references?: string;
  /** From COMMENT ON COLUMN. */
  description?: string;
  /** Upper-case display form, e.g. SERIAL, VARCHAR(100), DECIMAL(10,2). */
  displayType?: string;
}

export interface TableInfo {
  name: string;
  description?: string;
  rowCount: number;
  columns: ColumnInfo[];
  sampleQuery: string;
}

export interface Relationship {
  from: string;
  column: string;
  to: string;
  toColumn: string;
  kind: 'many-to-one' | 'self-reference';
  /** From COMMENT ON CONSTRAINT. */
  description?: string;
}

export interface SchemaInfo {
  tables: TableInfo[];
  relationships: Relationship[];
}

export interface RunOptions {
  timeoutMs?: number;
}

export interface Engine {
  readonly kind: LabLanguage;
  readonly mode: EngineMode;
  /** Remember the dataset and reset the sandbox to it. */
  setup(dataset: Dataset): Promise<void>;
  run(query: string, opts?: RunOptions): Promise<QueryResult>;
  /** Restore the sandbox to the last dataset passed to setup(). */
  reset(): Promise<void>;
  /** Read state for `state` checks. */
  snapshot(query: string): Promise<QueryResult>;
  describe(): Promise<SchemaInfo>;
  dispose(): Promise<void>;
}

export type CheckMode = 'rows-unordered' | 'rows-ordered' | 'state' | 'custom';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ItemKind = 'lesson' | 'problem';

export type StepTone = 'focus' | 'kept' | 'removed';
export type StepCell = string | number | boolean | null;
export interface StepTable { label?: string; columns: string[]; rows: StepCell[][] }
export type StepHighlight =
  | { table: string; tone: StepTone; row: number }
  | { table: string; tone: StepTone; column: string }
  | { table: string; tone: StepTone; cell: [number, string] };
export interface StepNote { title: string; text?: string; tone: StepTone | 'info' }
export interface Step {
  label: string;
  caption: string;
  show?: string[];
  highlight: StepHighlight[];
  dim: { table: string; rows: number[] }[];
  labels: Record<string, string>;
  notes: StepNote[];
}
export interface StepScript { tables: Record<string, StepTable>; steps: Step[] }

export interface LessonItem {
  kind: ItemKind;
  id: string;
  title: string;
  chapter: string;
  order: number;
  dataset?: string;
  setup?: string;
  check: CheckMode;
  checkQuery?: string;
  difficulty?: Difficulty;
  body: string;
  task: string;
  hints: string[];
  example?: string;
  context?: string;
  tables?: string;
  steps?: StepScript;
  stepsError?: string;
  solution: string;
  path: string;
}

export interface ContentError {
  path: string;
  message: string;
}

export interface Chapter {
  title: string;
  items: LessonItem[];
}

/** A named band of chapters ("Beginner", …) that starts at chapter `from` and runs until the next level. */
export interface LabLevel {
  title: string;
  from: string;
}

export interface Lab {
  id: string;
  title: string;
  subtitle: string;
  language: LabLanguage;
  sidebarTitle?: string;
  sidebarSubtitle?: string;
  problemsSubtitle?: string;
  levels?: LabLevel[];
  lessons: Chapter[];
  problems: Chapter[];
  datasets: Record<string, string>;
  errors: ContentError[];
}
