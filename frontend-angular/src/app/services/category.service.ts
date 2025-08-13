import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Category, CreateCategoryRequest, UpdateCategoryRequest, CategoryFilters } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = 'http://localhost:3001';
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Obtener todas las categorías
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`).pipe(
      tap(categories => {
        // Ordenar por el campo order si existe
        const sortedCategories = categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        this.categoriesSubject.next(sortedCategories);
      }),
      catchError(this.handleError)
    );
  }

  // Crear nueva categoría
  createCategory(categoryData: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, categoryData).pipe(
      tap(newCategory => {
        const currentCategories = this.categoriesSubject.value;
        this.categoriesSubject.next([...currentCategories, newCategory]);
      }),
      catchError(this.handleError)
    );
  }

  // Actualizar categoría existente
  updateCategory(id: number, updateData: UpdateCategoryRequest): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/categories/${id}`, updateData).pipe(
      tap(updatedCategory => {
        const currentCategories = this.categoriesSubject.value;
        const updatedCategories = currentCategories.map(cat => 
          cat.id === id ? { ...cat, ...updatedCategory } : cat
        );
        this.categoriesSubject.next(updatedCategories);
      }),
      catchError(this.handleError)
    );
  }

  // Eliminar categoría
  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categories/${id}`).pipe(
      tap(() => {
        const currentCategories = this.categoriesSubject.value;
        const filteredCategories = currentCategories.filter(cat => cat.id !== id);
        this.categoriesSubject.next(filteredCategories);
      }),
      catchError(this.handleError)
    );
  }

  // Reordenar categorías
  reorderCategories(categoryIds: number[]): Observable<any> {
    const reorderData = categoryIds.map((id, index) => ({ id, order: index }));
    console.log('Sending reorder data:', { categories: reorderData });
    return this.http.put(`${this.apiUrl}/categories/reorder`, { categories: reorderData }).pipe(
      tap(() => {
        const currentCategories = this.categoriesSubject.value;
        const reorderedCategories = categoryIds.map(id => 
          currentCategories.find(cat => cat.id === id)
        ).filter(Boolean) as Category[];
        this.categoriesSubject.next(reorderedCategories);
      }),
      catchError(this.handleError)
    );
  }

  // Buscar categorías
  searchCategories(filters: CategoryFilters): Observable<Category[]> {
    let url = `${this.apiUrl}/categories`;
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.active !== undefined) params.append('active', filters.active.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.http.get<Category[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  // Obtener categoría por ID
  getCategoryById(id: number): Observable<Category | null> {
    return this.categories$.pipe(
      map(categories => categories.find(cat => cat.id === id) || null)
    );
  }

  // Obtener categorías activas (con tareas)
  getActiveCategories(): Observable<Category[]> {
    return this.categories$.pipe(
      map(categories => categories.filter(cat => (cat.taskCount || 0) > 0))
    );
  }

  // Actualizar contador de tareas para una categoría
  updateTaskCount(categoryId: number, taskCount: number): void {
    const currentCategories = this.categoriesSubject.value;
    const updatedCategories = currentCategories.map(cat => 
      cat.id === categoryId ? { ...cat, taskCount } : cat
    );
    this.categoriesSubject.next(updatedCategories);
  }

  // Obtener categoría por nombre
  getCategoryByName(name: string): Category | undefined {
    return this.categoriesSubject.value.find(cat => 
      cat.name.toLowerCase() === name.toLowerCase()
    );
  }

  // Verificar si existe una categoría
  categoryExists(name: string, excludeId?: number): boolean {
    return this.categoriesSubject.value.some(cat => 
      cat.name.toLowerCase() === name.toLowerCase() && cat.id !== excludeId
    );
  }

  // Obtener el siguiente orden disponible
  getNextOrder(): number {
    const currentCategories = this.categoriesSubject.value;
    if (currentCategories.length === 0) return 0;
    return Math.max(...currentCategories.map(cat => cat.order || 0)) + 1;
  }

  // Limpiar cache
  clearCache(): void {
    this.categoriesSubject.next([]);
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
    
    console.error('CategoryService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}


