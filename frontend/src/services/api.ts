import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Types — matched to backend responses

export interface HealthResponse {
  status: string
  timestamp: number
}

export interface VersionResponse {
  version: string
  name: string
}

export interface InterfaceAddress {
  family?: number
  address: string
  netmask: string
}

export interface NetworkInterface {
  name: string
  addresses: InterfaceAddress[]
  is_up: boolean
}

export interface SystemStatus {
  cpu_percent: number
  memory_percent: number
  memory_used: number
  memory_total: number
  disk_percent: number
  disk_used: number
  disk_total: number
  uptime: number
}

export interface UploadedFile {
  id: string
  filename: string
  original_filename: string
  file_size: number
  file_format: string
  packet_count: number
  duration: number
  source_file_id?: string | null
  filter_expression?: string | null
  uploaded_at: string
  updated_at: string
}

export interface FilterValidationResponse {
  ok: boolean
  error?: string
}

export interface ProtocolInfo {
  name: string
  count: number
  percentage: number
}

export interface TalkerInfo {
  src: string
  dst: string
  count: number
  percentage: number
}

export interface FileAnalysis {
  file_id: string
  filename: string
  file_size: number
  file_format: string
  packet_count: number
  duration: number
  start_time: string | null
  end_time: string | null
  data_rate: number
  protocols: ProtocolInfo[]
  top_talkers: TalkerInfo[]
  packet_size_distribution: Record<string, number>
  analysis_limited: boolean
}

export interface ReplayRequest {
  file_id: string
  interface: string
  speed: number
  speed_unit: 'multiplier' | 'pps'
  continuous: boolean
}

export interface ReplayStatus {
  replay_id?: string
  file_id?: string
  filename?: string
  interface?: string
  speed: number
  speed_unit: string
  continuous: boolean
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'stopped'
  packets_sent: number
  bytes_sent: number
  total_packets: number
  progress_percent: number
  elapsed_time: number
  loop_count: number
  error?: string | null
  started_at?: string | null
}

export interface HistoryItem {
  id: string
  file_id: string
  filename: string
  interface: string
  speed: number
  speed_unit: string
  continuous: boolean
  status: string
  packets_sent: number
  bytes_sent: number
  duration: number
  loop_count: number
  error?: string | null
  started_at: string
  finished_at?: string | null
}

export interface HistoryResponse {
  items: HistoryItem[]
  total: number
  limit: number
  offset: number
}

export interface ConfigProfile {
  id: string
  name: string
  description: string
  interface: string
  speed: number
  speed_unit: string
  continuous: boolean
  created_at: string
  updated_at: string
}

// System
export const getHealth = () => api.get<HealthResponse>('/health').then(r => r.data)
export const getVersion = () => api.get<VersionResponse>('/version').then(r => r.data)
export const getInterfaces = () => api.get<{ interfaces: NetworkInterface[] }>('/interfaces').then(r => r.data.interfaces)
export const getSystemStatus = () => api.get<SystemStatus>('/system/status').then(r => r.data)

// Files
export const uploadFile = (file: File, onProgress?: (pct: number) => void) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<UploadedFile>('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  }).then(r => r.data)
}
export const listFiles = () => api.get<{ files: UploadedFile[] }>('/files').then(r => r.data.files)
export const getFile = (id: string) => api.get<UploadedFile>(`/files/${id}`).then(r => r.data)
export const getFileAnalysis = (id: string) => api.get<FileAnalysis>(`/files/${id}/analysis`).then(r => r.data)
export const downloadFile = (id: string) => {
  window.open(`/api/files/${id}/download`, '_blank')
}
export const deleteFile = (id: string) => api.delete(`/files/${id}`).then(r => r.data)
export const filterFile = (id: string, body: { bpf_filter: string; name?: string }) =>
  api.post<UploadedFile>(`/files/${id}/filter`, body).then(r => r.data)
export const validateFilter = (body: { file_id: string; bpf_filter: string }) =>
  api.post<FilterValidationResponse>('/files/validate-filter', body).then(r => r.data)

// Replay
export const startReplay = (req: ReplayRequest) => api.post('/replay/start', req).then(r => r.data)
export const stopReplay = () => api.post('/replay/stop').then(r => r.data)
export const getReplayStatus = () => api.get<ReplayStatus>('/replay/status').then(r => r.data)

// History
export const getHistory = (params?: { limit?: number; offset?: number; search?: string; status?: string; sort?: string; order?: string }) =>
  api.get<HistoryResponse>('/history', { params }).then(r => r.data)
export const getHistoryItem = (id: string) => api.get<HistoryItem>(`/history/${id}`).then(r => r.data)
export const deleteHistoryItem = (id: string) => api.delete(`/history/${id}`).then(r => r.data)
export const exportHistory = () => {
  window.open('/api/history/export', '_blank')
}

// Profiles
export const getProfiles = () => api.get<{ profiles: ConfigProfile[] }>('/profiles').then(r => r.data.profiles)
export const createProfile = (data: Omit<ConfigProfile, 'id' | 'created_at' | 'updated_at'>) => api.post<ConfigProfile>('/profiles', data).then(r => r.data)
export const updateProfile = (id: string, data: Partial<ConfigProfile>) => api.put<ConfigProfile>(`/profiles/${id}`, data).then(r => r.data)
export const deleteProfile = (id: string) => api.delete(`/profiles/${id}`).then(r => r.data)

export default api
