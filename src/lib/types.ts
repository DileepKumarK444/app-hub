export type Project = {
  id: string;
  name: string;
  description: string;
  /** Absolute path, or starting with ~ (expanded at runtime). */
  path: string;
  stack: string[];
  tags: string[];
  /** Port the app should listen on. null = not a web app. */
  port: number | null;
  /** Shell command that starts the app. {port} is replaced with `port`. null = nothing to run. */
  command: string | null;
  /** One-off setup command, shown in the Run tab. */
  installCommand: string | null;
  /** Optional free-text hint shown in the Run tab (prerequisites etc.). */
  notes: string | null;
  /** Override for the Open button. Defaults to http://localhost:{port}. */
  url: string | null;
  /** Disabled apps are hidden from the main grid and cannot be started. */
  enabled: boolean;
};

export type RunStatus = 'running' | 'starting' | 'external' | 'stopped';

export type ProjectView = Project & {
  status: RunStatus;
  pid: number | null;
  startedAt: number | null;
  openUrl: string | null;
  pathExists: boolean;
};

export type ProjectInput = Partial<Omit<Project, 'id'>> & { name: string; path: string };

export type Detected = {
  name: string;
  description: string;
  path: string;
  stack: string[];
  command: string | null;
  installCommand: string | null;
  port: number | null;
  scripts: Record<string, string>;
  readmeExcerpt: string;
};

export type Details = {
  readme: string;
  scripts: Record<string, string>;
  files: string[];
};
