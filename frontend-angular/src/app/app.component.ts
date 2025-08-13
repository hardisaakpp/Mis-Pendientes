import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { CategoryManagerComponent } from './components/category-manager/category-manager.component';
import { RecycleBinComponent } from './components/recycle-bin/recycle-bin.component';
import { RecycleBinService } from './services/recycle-bin.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoryManagerComponent, RecycleBinComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  animations: [
    trigger('taskAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class AppComponent implements OnInit {
  title = 'Mis Pendientes';
  apiUrl = 'http://localhost:3001';
  tasks: Array<{ id: number; text: string; completed: number; inProgress: number; categories?: any[] }> = [];
  newTaskText = '';
  isLoading = false;
  isAddingTask = false;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private recycleBinService: RecycleBinService
  ) {}

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.http.get<any[]>(`${this.apiUrl}/tasks`).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading tasks:', error);
        this.errorMessage = 'Error al cargar las tareas. Por favor, intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  addTask() {
    const text = this.newTaskText.trim();
    if (!text || this.isAddingTask) return;
    
    this.isAddingTask = true;
    this.errorMessage = '';
    
    const body = { text, completed: 0, inProgress: 0, categories: [] };
    
    this.http.post(`${this.apiUrl}/tasks`, body).subscribe({
      next: () => {
        this.newTaskText = '';
        this.loadTasks();
        this.isAddingTask = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error adding task:', error);
        this.errorMessage = 'Error al agregar la tarea. Por favor, intenta de nuevo.';
        this.isAddingTask = false;
      }
    });
  }

  toggleComplete(task: any) {
    const body = { 
      ...task, 
      completed: task.completed ? 0 : 1, 
      inProgress: 0, 
      categories: (task.categories || []).map((c: any) => c.id) 
    };
    
    this.http.put(`${this.apiUrl}/tasks/${task.id}`, body).subscribe({
      next: () => this.loadTasks(),
      error: (error: HttpErrorResponse) => {
        console.error('Error updating task:', error);
        this.errorMessage = 'Error al actualizar la tarea. Por favor, intenta de nuevo.';
      }
    });
  }

  clearError() {
    this.errorMessage = '';
  }

  get pendingTasksCount(): number {
    return this.tasks.filter(t => !t.completed).length;
  }

  get completedTasksCount(): number {
    return this.tasks.filter(t => t.completed).length;
  }

  get pendingTasks(): Array<{ id: number; text: string; completed: number; inProgress: number; categories?: any[] }> {
    return this.tasks.filter(t => !t.completed);
  }

  get completedTasks(): Array<{ id: number; text: string; completed: number; inProgress: number; categories?: any[] }> {
    return this.tasks.filter(t => t.completed);
  }

  // Eliminar tarea (mover a papelera)
  async deleteTask(task: any): Promise<void> {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${task.text}"? La tarea se moverá a la papelera.`)) {
      return;
    }

    try {
      // Mover la tarea a la papelera
      await this.recycleBinService.moveToRecycleBin(task.id).toPromise();
      
      // Remover la tarea de la lista local
      this.tasks = this.tasks.filter(t => t.id !== task.id);
      
      // Limpiar mensaje de error si existe
      this.errorMessage = '';
    } catch (error: any) {
      this.errorMessage = 'Error al eliminar la tarea: ' + error.message;
    }
  }
}
