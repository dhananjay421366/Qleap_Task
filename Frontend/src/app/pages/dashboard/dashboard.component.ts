import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, timeout } from 'rxjs/operators';
import { TaskService } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardSummary } from '../../shared/models/task.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  summary: DashboardSummary = {
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
  };
  loading = true;
  error = '';

  constructor(
    private readonly taskService: TaskService,
    private readonly toastService: ToastService,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading = true;
    this.error = '';
    this.taskService.getDashboardSummary().pipe(
      timeout({ each: 10000 }),
      finalize(() => {
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      }),
    ).subscribe({
      next: (res) => {
        const data = res?.data;
        this.summary = {
          totalTasks: Number(data?.totalTasks) || 0,
          pendingTasks: Number(data?.pendingTasks) || 0,
          inProgressTasks: Number(data?.inProgressTasks) || 0,
          completedTasks: Number(data?.completedTasks) || 0,
        };
        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load dashboard data';
        this.toastService.show('Unable to load dashboard data. The backend did not respond in time.', 'error');
        this.changeDetectorRef.detectChanges();
      },
    });
  }

}
