export interface Client {
  id: number;
  name: string;
  dialer_ip: string;
  dialer_user: string;
  dialer_pass: string;
  db_host: string;
  db_user: string;
  db_pass: string;
  campaigns: string;
  ingroups: string;
  created_at: string;
}

export interface CallLog {
  id: number;
  client_id: number;
  call_id: string;
  agent_id: string;
  start_time: string;
  end_time: string;
  duration: number;
  recording_path: string;
  transcript?: string | null;
  created_at: string;
}

export interface Audit {
  id: number;
  call_id: string;
  client_id: number;
  agent_id: string;
  audit_json: Record<string, unknown>;
  total_score: number;
  percentage: number;
  ranking: string;
  fatal_flag: boolean;
  created_at: string;
}
