import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  DashboardSummary,
  Task,
  TaskFilters,
  TaskListResponse,
  TaskMutationResponse,
  TaskPayload,
} from '../../shared/models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTasks(filters: TaskFilters): Observable<TaskListResponse> {
    let params = new HttpParams();

    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.priority) params = params.set('priority', filters.priority);
    params = params.set('page', filters.page);
    params = params.set('pageSize', filters.pageSize);

    return this.http.get<TaskListResponse>(`${this.apiUrl}/tasks`, { params });
  }

  getTaskById(id: number): Observable<ApiResponse<Task>> {
    return this.http.get<ApiResponse<Task>>(`${this.apiUrl}/tasks/${id}`);
  }

  createTask(task: TaskPayload): Observable<TaskMutationResponse> {
    return this.http.post<TaskMutationResponse>(`${this.apiUrl}/tasks`, task);
  }

  updateTask(id: number, task: TaskPayload): Observable<TaskMutationResponse> {
    return this.http.put<TaskMutationResponse>(`${this.apiUrl}/tasks/${id}`, task);
  }

  deleteTask(id: number): Observable<ApiResponse<undefined>> {
    return this.http.delete<ApiResponse<undefined>>(`${this.apiUrl}/tasks/${id}`);
  }

  getDashboardSummary(): Observable<ApiResponse<DashboardSummary>> {
    return this.http.get<ApiResponse<DashboardSummary>>(`${this.apiUrl}/dashboard/summary`);
  }
}
