import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { auditTime, debounceTime, distinctUntilChanged, finalize, takeUntil, timeout } from 'rxjs/operators';
import { TaskService } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { Task, TaskFilters, TaskPagination } from '../../shared/models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
})
export class TaskListComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  loading = true;
  deleting = false;
  error = '';

  search = '';
  status: TaskFilters['status'] = '';
  priority: TaskFilters['priority'] = '';
  page = 1;
  pageSize = 10;
  pagination: TaskPagination = {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
  };
  paginationTotalKnown = false;

  pendingDeleteId: number | null = null;
  pendingDeleteTitle = '';

  private readonly searchChanges$ = new Subject<string>();
  private readonly filterChanges$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private requestSequence = 0;

  constructor(
    private readonly taskService: TaskService,
    private readonly toastService: ToastService,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChanges$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadTasks());
    this.filterChanges$
      .pipe(auditTime(250), takeUntil(this.destroy$))
      .subscribe(() => this.loadTasks());
    this.loadTasks();
  }

  loadTasks(): void {
    const requestId = ++this.requestSequence;
    this.loading = true;
    this.error = '';

    this.taskService.getTasks(this.currentFilters()).pipe(
      timeout({ each: 10000 }),
      takeUntil(this.destroy$),
      finalize(() => {
        if (requestId === this.requestSequence) {
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        }
      }),
    ).subscribe({
      next: (response) => {
        if (requestId !== this.requestSequence) return;
        this.loading = false;

        // Support both the current paginated API and older deployments that
        // return only { data, count }.
        const tasks = Array.isArray(response?.data) ? response.data : [];
        const serverPagination = response?.pagination;
        const hasNextPage = Boolean(serverPagination?.hasNextPage ?? tasks.length === this.pageSize);
        const total = Number(serverPagination?.total ?? (hasNextPage ? this.page * this.pageSize + 1 : response?.count ?? tasks.length));
        const pageSize = Number(serverPagination?.pageSize ?? this.pageSize);
        const page = Number(serverPagination?.page ?? this.page);
        const totalPages = Number(serverPagination?.totalPages ?? (hasNextPage ? page + 1 : Math.max(page, Math.ceil(total / pageSize))));

        this.tasks = tasks;
        this.page = page;
        this.pageSize = pageSize;
        this.paginationTotalKnown = serverPagination?.total !== undefined;
        this.pagination = {
          page,
          pageSize,
          total,
          totalPages,
          hasNextPage,
        };
        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        if (requestId !== this.requestSequence) return;
        this.error = 'Failed to load tasks';
        this.toastService.show('Unable to load tasks. The backend did not respond in time.', 'error');
        this.changeDetectorRef.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchChanges$.complete();
    this.filterChanges$.complete();
  }

  onSearchChange(value: string): void {
    this.search = value.trim().slice(0, 150);
    this.page = 1;
    this.searchChanges$.next(this.search);
  }

  onFilterChange(): void {
    this.page = 1;
    this.filterChanges$.next();
  }

  goToPage(page: number): void {
    if (this.loading || page < 1 || page > this.pagination.totalPages || page === this.page) return;
    this.page = page;
    this.filterChanges$.next();
  }

  changePageSize(value: string): void {
    const nextPageSize = Number(value);
    if (![10, 25, 50, 100].includes(nextPageSize)) return;
    this.pageSize = nextPageSize;
    this.page = 1;
    this.filterChanges$.next();
  }

  deleteTask(id: number | undefined): void {
    if (!id || this.deleting) return;
    const task = this.tasks.find((item) => item.id === id);
    this.pendingDeleteId = id;
    this.pendingDeleteTitle = task?.title || 'this task';
  }

  cancelDelete(): void {
    if (this.deleting) return;
    this.pendingDeleteId = null;
    this.pendingDeleteTitle = '';
  }

  confirmDelete(): void {
    if (!this.pendingDeleteId || this.deleting) return;
    const id = this.pendingDeleteId;
    this.deleting = true;

    this.taskService.deleteTask(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.show('Task deleted successfully.');
        this.deleting = false;
        this.cancelDelete();
        if (this.page > 1 && this.tasks.length === 1) this.page--;
        this.filterChanges$.next();
      },
      error: () => {
        this.deleting = false;
        this.toastService.show('Failed to delete task.', 'error');
      },
    });
  }

  getPriorityClass(priority: string): string {
    return priority.toLowerCase();
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(' ', '-');
  }

  trackTask(_: number, task: Task): number | undefined {
    return task.id;
  }

  private currentFilters(): TaskFilters {
    return {
      search: this.search,
      status: this.status,
      priority: this.priority,
      page: this.page,
      pageSize: this.pageSize,
    };
  }
}
