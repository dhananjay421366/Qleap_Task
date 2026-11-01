export interface Task {
  id?: number;
  title: string;
  description?: string;
  assigned_to: string;
  priority: 'Low' | 'Medium' | 'High';
  due_date: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  created_at?: string;
}

export type TaskPayload = Omit<Task, 'id' | 'created_at'>;

export interface TaskFilters {
  search?: string;
  status?: Task['status'] | '';
  priority?: Task['priority'] | '';
  page: number;
  pageSize: number;
}

export interface TaskPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface TaskListResponse extends ApiResponse<Task[]> {
  count: number;
  pagination: TaskPagination;
}

export interface TaskMutationResponse extends ApiResponse<Task | undefined> {
  message?: string;
}

export interface DashboardSummary {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
}
