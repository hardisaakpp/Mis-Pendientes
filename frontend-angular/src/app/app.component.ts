import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Mis Pendientes (Angular)';
  apiUrl = 'http://localhost:3001';
  tasks: Array<{ id: number; text: string; completed: number; inProgress: number; categories?: any[] }> = [];
  newTaskText = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.http.get<any[]>(`${this.apiUrl}/tasks`).subscribe(tasks => {
      this.tasks = tasks;
    });
  }

  addTask() {
    const text = this.newTaskText.trim();
    if (!text) return;
    const body = { text, completed: 0, inProgress: 0, categories: [] };
    this.http.post(`${this.apiUrl}/tasks`, body).subscribe(() => {
      this.newTaskText = '';
      this.loadTasks();
    });
  }

  toggleComplete(task: any) {
    const body = { ...task, completed: task.completed ? 0 : 1, inProgress: 0, categories: (task.categories || []).map((c: any) => c.id) };
    this.http.put(`${this.apiUrl}/tasks/${task.id}`, body).subscribe(() => this.loadTasks());
  }
}
