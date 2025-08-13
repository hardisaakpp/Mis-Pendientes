import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { DeletedTask, RestoreTaskRequest, DeletePermanentlyRequest } from '../models/deleted-task.model';

@Injectable({
  providedIn: 'root'
})
export class RecycleBinService {
  private apiUrl = 'http://localhost:3001';
  private deletedTasksSubject = new BehaviorSubject<DeletedTask[]>([]);
  public deletedTasks$ = this.deletedTasksSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Obtener todas las tareas eliminadas
  getDeletedTasks(): Observable<DeletedTask[]> {
    return this.http.get<DeletedTask[]>(`${this.apiUrl}/deleted-tasks`).pipe(
      tap(deletedTasks => {
        // Ordenar por fecha de eliminación (más recientes primero)
        const sortedTasks = deletedTasks.sort((a, b) => 
          new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
        );
        this.deletedTasksSubject.next(sortedTasks);
      }),
      catchError(this.handleError)
    );
  }

  // Mover tarea a la papelera (eliminar de forma segura)
  moveToRecycleBin(taskId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/tasks/${taskId}/delete`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // Restaurar tarea desde la papelera
  restoreTask(restoreData: RestoreTaskRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/deleted-tasks/restore`, restoreData).pipe(
      tap(() => {
        // Remover la tarea restaurada de la lista local
        const currentTasks = this.deletedTasksSubject.value;
        const updatedTasks = currentTasks.filter(task => task.id !== restoreData.taskId);
        this.deletedTasksSubject.next(updatedTasks);
      }),
      catchError(this.handleError)
    );
  }

  // Eliminar permanentemente una tarea
  deletePermanently(deleteData: DeletePermanentlyRequest): Observable<any> {
    return this.http.delete(`${this.apiUrl}/deleted-tasks/${deleteData.taskId}`).pipe(
      tap(() => {
        // Remover la tarea eliminada permanentemente de la lista local
        const currentTasks = this.deletedTasksSubject.value;
        const updatedTasks = currentTasks.filter(task => task.id !== deleteData.taskId);
        this.deletedTasksSubject.next(updatedTasks);
      }),
      catchError(this.handleError)
    );
  }

  // Vaciar toda la papelera
  emptyRecycleBin(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/deleted-tasks/empty`).pipe(
      tap(() => {
        // Limpiar la lista local
        this.deletedTasksSubject.next([]);
      }),
      catchError(this.handleError)
    );
  }

  // Obtener estadísticas de la papelera
  getRecycleBinStats(): Observable<{ total: number; oldest: Date | null; newest: Date | null }> {
    return this.http.get<{ total: number; oldest: Date | null; newest: Date | null }>(`${this.apiUrl}/deleted-tasks/stats`).pipe(
      catchError(this.handleError)
    );
  }

  // Buscar tareas eliminadas
  searchDeletedTasks(query: string): Observable<DeletedTask[]> {
    return this.http.get<DeletedTask[]>(`${this.apiUrl}/deleted-tasks/search?q=${encodeURIComponent(query)}`).pipe(
      catchError(this.handleError)
    );
  }

  // Obtener tareas eliminadas por categoría
  getDeletedTasksByCategory(categoryId: number): Observable<DeletedTask[]> {
    return this.http.get<DeletedTask[]>(`${this.apiUrl}/deleted-tasks/category/${categoryId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Obtener tareas eliminadas por fecha
  getDeletedTasksByDate(date: Date): Observable<DeletedTask[]> {
    const dateString = date.toISOString().split('T')[0];
    return this.http.get<DeletedTask[]>(`${this.apiUrl}/deleted-tasks/date/${dateString}`).pipe(
      catchError(this.handleError)
    );
  }

  // Obtener tareas eliminadas en un rango de fechas
  getDeletedTasksByDateRange(startDate: Date, endDate: Date): Observable<DeletedTask[]> {
    const startString = startDate.toISOString().split('T')[0];
    const endString = endDate.toISOString().split('T')[0];
    return this.http.get<DeletedTask[]>(`${this.apiUrl}/deleted-tasks/date-range?start=${startString}&end=${endString}`).pipe(
      catchError(this.handleError)
    );
  }

  // Limpiar cache local
  clearCache(): void {
    this.deletedTasksSubject.next([]);
  }

  // Obtener tareas eliminadas del cache local
  getDeletedTasksFromCache(): DeletedTask[] {
    return this.deletedTasksSubject.value;
  }

  // Manejo de errores
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      errorMessage = `Código de error: ${error.status}\nMensaje: ${error.message}`;
    }
    
    console.error('RecycleBinService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

