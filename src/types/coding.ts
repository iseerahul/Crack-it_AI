export type Language = 'javascript' | 'python' | 'cpp' | 'java';

export type Problem = {
  id: number;
  title: string;
  difficulty: string;
  tags: string[];
  score: number;
  description: string;
  examples: Array<{ input: string; output: string }>;
  testCases: Array<{ input: Record<string, unknown>; expected: unknown }>;
  compareMode?: 'ordered' | 'unordered';
  solutions: Record<Language, string>;
};
