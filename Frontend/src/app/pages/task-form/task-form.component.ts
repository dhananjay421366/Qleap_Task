import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TaskService } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { TaskPayload } from '../../shared/models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.css'
})
export class TaskFormComponent implements OnInit {
  readonly taskForm: FormGroup;
  isEditMode = false;
  taskId: number | null = null;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private route: ActivatedRoute,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private toastService: ToastService
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['', Validators.maxLength(5000)],
      assigned_to: ['', [Validators.required, Validators.maxLength(100)]],
      priority: ['Medium', Validators.required],
      due_date: ['', Validators.required],
      status: ['Pending', Validators.required]
    });
  }

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    if (rawId === null) return;

    const parsedId = Number(rawId);
    if (!Number.isInteger(parsedId) || parsedId < 1) {
      this.error = 'Invalid task ID';
      return;
    }

    this.taskId = parsedId;
    if (this.taskId) {
      this.isEditMode = true;
      this.loadTask();
    }
  }

  loadTask(): void {
    this.loading = true;
    this.taskService.getTaskById(this.taskId!).subscribe({
      next: (res) => {
        const task = res.data;
        this.taskForm.patchValue({
          title: task.title,
          description: task.description,
          assigned_to: task.assigned_to,
          priority: task.priority,
          due_date: task.due_date?.split('T')[0],
          status: task.status
        });
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.error = 'Failed to load task';
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  onSubmit(): void {
    if (this.loading) return;
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const taskData: TaskPayload = {
      title: String(this.taskForm.value.title ?? '').trim(),
      description: String(this.taskForm.value.description ?? '').trim(),
      assigned_to: String(this.taskForm.value.assigned_to ?? '').trim(),
      priority: this.taskForm.value.priority,
      due_date: this.taskForm.value.due_date,
      status: this.taskForm.value.status,
    };

    const request = this.isEditMode
      ? this.taskService.updateTask(this.taskId!, taskData)
      : this.taskService.createTask(taskData);

    request.subscribe({
      next: () => {
        this.toastService.show(
          this.isEditMode ? 'Task updated successfully.' : 'Task created successfully.'
        );
        this.router.navigate(['/tasks']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Something went wrong';
        this.loading = false;
        this.toastService.show(this.error, 'error');
        this.changeDetectorRef.markForCheck();
      }
    });
  }
}
