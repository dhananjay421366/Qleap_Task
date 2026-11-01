import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaskService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends filters and pagination to the task endpoint', () => {
    service.getTasks({ search: 'urgent', status: 'Pending', priority: 'High', page: 2, pageSize: 10 }).subscribe();

    const request = http.expectOne((req) => req.url.endsWith('/tasks'));
    expect(request.request.params.get('search')).toBe('urgent');
    expect(request.request.params.get('status')).toBe('Pending');
    expect(request.request.params.get('priority')).toBe('High');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('10');
    request.flush({ success: true, count: 0, data: [], pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0, hasNextPage: false } });
  });
});
