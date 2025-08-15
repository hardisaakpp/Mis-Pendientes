import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { DeletedTask } from '../../models/deleted-task.model';
import { RecycleBinService } from '../../services/recycle-bin.service';
import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';

@Component({
  selector: 'app-recycle-bin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recycle-bin.component.html',
  styleUrls: ['./recycle-bin.component.css']
})
export class RecycleBinComponent implements OnInit, OnDestroy {
  // Estado de la papelera
  isOpen = false;
  deletedTasks: DeletedTask[] = [];
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  filteredTasks: DeletedTask[] = [];
  
  // Estadísticas
  stats = {
    total: 0,
    oldest: null as Date | null,
    newest: null as Date | null
  };
  
  // Estado de las operaciones
  isRestoring = false;
  isDeleting = false;
  isEmptying = false;
  
  // Posición y tamaño de la ventana
  windowPosition = { x: 100, y: 100 };
  isDragging = false;
  dragOffset = { x: 0, y: 0 };
  isResizing = false;
  resizeStart = { x: 0, y: 0, width: 0, height: 0 };
  windowSize = { width: 500, height: 600 };
  
  // Drag & Drop para categorías
  isDraggingOverCategory = false;
  draggedCategory: Category | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private recycleBinService: RecycleBinService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.loadDeletedTasks();
    this.loadStats();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Cargar tareas eliminadas
  private loadDeletedTasks(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.recycleBinService.getDeletedTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.deletedTasks = tasks;
          this.filteredTasks = [...tasks];
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Error al cargar las tareas eliminadas: ' + error.message;
          this.isLoading = false;
        }
      });
  }

  // Cargar estadísticas
  private loadStats(): void {
    this.recycleBinService.getRecycleBinStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
        }
      });
  }

  // Configurar atajos de teclado
  private setupKeyboardShortcuts(): void {
    // Implementaremos los atajos de teclado en el siguiente paso
  }

  // Abrir/cerrar la papelera
  toggleRecycleBin(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadDeletedTasks();
      this.loadStats();
    }
  }

  // Cerrar la papelera
  closeRecycleBin(): void {
    this.isOpen = false;
  }

  // Buscar tareas
  searchTasks(): void {
    if (!this.searchTerm.trim()) {
      this.filteredTasks = [...this.deletedTasks];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredTasks = this.deletedTasks.filter(task =>
      task.text.toLowerCase().includes(searchLower)
    );
  }

  // Limpiar búsqueda
  clearSearch(): void {
    this.searchTerm = '';
    this.filteredTasks = [...this.deletedTasks];
  }

  // Restaurar tarea
  async restoreTask(task: DeletedTask): Promise<void> {
    if (this.isRestoring) return;

    this.isRestoring = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(this.recycleBinService.restoreTask({
        taskId: task.id,
        restoreToOriginal: true
      }));
      
      // La tarea se removerá automáticamente del cache local
      this.errorMessage = '';
    } catch (error: any) {
      this.errorMessage = 'Error al restaurar la tarea: ' + error.message;
    } finally {
      this.isRestoring = false;
    }
  }

  // Eliminar permanentemente
  async deletePermanently(task: DeletedTask): Promise<void> {
    if (this.isDeleting) return;

    if (!confirm(`¿Estás seguro de que quieres eliminar permanentemente "${task.text}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(this.recycleBinService.deletePermanently({
        taskId: task.id
      }));
      
      // La tarea se removerá automáticamente del cache local
      this.errorMessage = '';
    } catch (error: any) {
      this.errorMessage = 'Error al eliminar permanentemente: ' + error.message;
    } finally {
      this.isDeleting = false;
    }
  }

  // Vaciar papelera
  async emptyRecycleBin(): Promise<void> {
    if (this.isEmptying) return;

    if (!confirm('¿Estás seguro de que quieres vaciar toda la papelera? Esta acción no se puede deshacer.')) {
      return;
    }

    this.isEmptying = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(this.recycleBinService.emptyRecycleBin());
      
      // La lista se limpiará automáticamente
      this.errorMessage = '';
    } catch (error: any) {
      this.errorMessage = 'Error al vaciar la papelera: ' + error.message;
    } finally {
      this.isEmptying = false;
    }
  }

  // Drag & Drop para la ventana
  onMouseDown(event: MouseEvent, action: 'drag' | 'resize'): void {
    event.preventDefault();
    
    if (action === 'drag') {
      this.isDragging = true;
      this.dragOffset = {
        x: event.clientX - this.windowPosition.x,
        y: event.clientY - this.windowPosition.y
      };
    } else if (action === 'resize') {
      this.isResizing = true;
      this.resizeStart = {
        x: event.clientX,
        y: event.clientY,
        width: this.windowSize.width,
        height: this.windowSize.height
      };
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.windowPosition = {
        x: event.clientX - this.dragOffset.x,
        y: event.clientY - this.dragOffset.y
      };
    } else if (this.isResizing) {
      const deltaX = event.clientX - this.resizeStart.x;
      const deltaY = event.clientY - this.resizeStart.y;
      
      this.windowSize = {
        width: Math.max(400, this.resizeStart.width + deltaX),
        height: Math.max(300, this.resizeStart.height + deltaY)
      };
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
  }

  // Drag & Drop para categorías (nueva funcionalidad)
  onDragOverCategory(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
      this.isDraggingOverCategory = true;
    }
  }

  onDragLeaveCategory(event: DragEvent): void {
    // Verificar si realmente salimos del área de la papelera
    const target = event.relatedTarget as HTMLElement;
    if (!target || !target.closest('.trash-icon, .recycle-bin-window')) {
      this.isDraggingOverCategory = false;
    }
  }

  onDropCategory(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOverCategory = false;
    
    // Obtener el ID de la categoría desde el dataTransfer
    if (event.dataTransfer) {
      const categoryId = event.dataTransfer.getData('text/plain');
      if (categoryId) {
        this.deleteCategoryById(parseInt(categoryId));
      }
    }
  }

  // Eliminar categoría por ID
  private async deleteCategoryById(categoryId: number): Promise<void> {
    try {
      // Obtener información de la categoría antes de eliminar
      const category = await firstValueFrom(this.categoryService.getCategoryById(categoryId));
      
      if (!category) {
        this.errorMessage = 'Categoría no encontrada';
        return;
      }

      // Verificar si la categoría tiene tareas
      if (category.taskCount && category.taskCount > 0) {
        this.errorMessage = `No se puede eliminar la categoría "${category.name}" porque tiene ${category.taskCount} tareas asociadas.`;
        return;
      }

      // Confirmar eliminación
      if (confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`)) {
        await firstValueFrom(this.categoryService.deleteCategory(categoryId));
        
        // Mostrar mensaje de confirmación
        this.showSuccessMessage(`Categoría "${category.name}" eliminada correctamente`);
        
        // Cerrar la papelera si está abierta
        if (this.isOpen) {
          this.closeRecycleBin();
        }
      }
    } catch (error: any) {
      this.errorMessage = 'Error al eliminar la categoría: ' + error.message;
    }
  }

  // Mostrar mensaje de éxito
  private showSuccessMessage(message: string): void {
    // Por ahora usamos console.log, pero podrías implementar un sistema de notificaciones
    console.log(message);
    
    // Opcional: Mostrar un mensaje temporal en la interfaz
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }

  // Formatear fecha
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Obtener tiempo transcurrido
  getTimeAgo(date: Date): string {
    const now = new Date();
    const deletedDate = new Date(date);
    const diffMs = now.getTime() - deletedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'hace un momento';
    }
  }

  // Limpiar mensaje de error
  clearError(): void {
    this.errorMessage = '';
  }

  // TrackBy para optimizar el rendimiento
  trackByTaskId(index: number, task: DeletedTask): number {
    return task.id;
  }
}

