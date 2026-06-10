export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message: string | null;
};

export type AuthUser = {
  id: number;
  email: string;
  created_at: string;
};

export type LoginData = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type Project = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: string;
};

export type GithubRepository = {
  id: number;
  project_id: number;
  owner: string;
  repo: string;
  default_branch: string | null;
  connected_at: string;
};

export type WorkflowRun = {
  github_run_id: number;
  workflow_name: string | null;
  status: string | null;
  conclusion: string | null;
  event: string | null;
  head_branch: string | null;
  head_sha: string | null;
  run_number: number | null;
  run_attempt: number | null;
  created_at: string | null;
  updated_at: string | null;
  html_url: string | null;
};

export type WorkflowLogs = {
  run_id: number;
  raw_log: string;
  error_lines: string[];
  files: { file_name: string; content: string }[];
};

export type ChangeContext = {
  repository_id: number;
  owner: string;
  repo: string;
  run_id: number;
  workflow_name: string | null;
  head_branch: string | null;
  head_sha: string;
  commit: {
    sha: string | null;
    message: string | null;
    author: string | null;
    committed_at: string | null;
    html_url: string | null;
  };
  pull_requests: {
    number: number;
    title: string | null;
    state: string | null;
    merged_at: string | null;
    html_url: string | null;
  }[];
  changed_files: {
    filename: string | null;
    status: string | null;
    additions: number;
    deletions: number;
    changes: number;
  }[];
  relevance: {
    score: number;
    reasons: string[];
    matched_keywords: string[];
  };
};

export type ActionsAnalysis = {
  category: string;
  summary: string;
  confidence: string;
  evidence: string[];
  suspected_causes: string[];
  recommended_actions: string[];
  issue_title: string;
  issue_body: string;
  matched_patterns?: string[];
  analysis_score?: number;
  engine_version?: string;
};

export type AnalysisResponse = {
  repository_id: number;
  owner: string;
  repo: string;
  run_id: number;
  analysis: ActionsAnalysis;
};

export type IssueCreateResponse = AnalysisResponse & {
  issue: {
    github_issue_id: number | null;
    number: number | null;
    title: string | null;
    state: string | null;
    html_url: string | null;
    created_at?: string | null;
  };
  report_id: number;
  duplicated: boolean;
};

export type CIAnalysisReport = {
  id: number;
  repository_id: number;
  github_run_id: number;
  category: string;
  summary: string;
  confidence: string;
  evidence: string[];
  suspected_causes: string[];
  recommended_actions: string[];
  issue_title: string;
  issue_body: string;
  github_issue_id: number | null;
  github_issue_number: number | null;
  github_issue_url: string | null;
  github_issue_state: string | null;
  matched_patterns?: string[];
  analysis_score?: number;
  engine_version?: string;
  created_at: string;
};

export type ServerLog = {
  id: number;
  project_id: number;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  source: string | null;
  raw_content: string;
  created_at: string;
};

export type ServerLogListItem = {
  id: number;
  project_id: number;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  source: string | null;
  created_at: string;
};

export type ServerLogAnalysisReport = {
  id: number;
  project_id: number;
  server_log_id: number;
  category: string;
  severity: string;
  summary: string;
  evidence: string[];
  error_groups: {
    fingerprint: string;
    severity: string;
    message: string;
    sample_line: string;
    count: number;
  }[];
  suspected_causes: string[];
  recommended_actions: string[];
  analysis_score: number | null;
  engine_version: string | null;
  created_at: string;
};
