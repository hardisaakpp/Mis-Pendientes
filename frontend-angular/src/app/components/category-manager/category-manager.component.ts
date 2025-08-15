import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';

@Component({
  selector: 'app-category-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './category-manager.component.html',
  styleUrls: ['./category-manager.component.css']
})
export class CategoryManagerComponent implements OnInit, OnDestroy {
  categories: Category[] = [];
  filteredCategories: Category[] = [];
  isAddingCategory = false;
  editingCategoryId: number | null = null;
  searchTerm = '';
  isLoading = false;
  errorMessage = '';
  
  // Formularios
  addCategoryForm: FormGroup;
  editCategoryForm: FormGroup;
  
  // Drag & Drop
  draggedCategory: Category | null = null;
  isDraggingOverTrash = false;
  
  // Sistema de notificaciones
  showConfirmDialog = false;
  categoryToDelete: Category | null = null;
  confirmMessage = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private categoryService: CategoryService,
    private fb: FormBuilder
  ) {
    this.addCategoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      color: ['#6366f1'],
      icon: ['📋']
    });

    this.editCategoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      color: ['#6366f1'],
      icon: ['📋']
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Cargar categorías
  private loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.categoryService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
          this.filteredCategories = [...categories];
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = 'Error al cargar las categorías: ' + error.message;
          this.isLoading = false;
        }
      });
  }

  // Configurar búsqueda con debounce
  private setupSearch(): void {
    // Implementaremos la búsqueda en el siguiente paso
  }

  // Agregar nueva categoría
  async addCategory(): Promise<void> {
    if (this.addCategoryForm.invalid) return;

    const formValue = this.addCategoryForm.value;
    const newCategory: CreateCategoryRequest = {
      name: formValue.name.trim(),
      color: formValue.color,
      icon: formValue.icon
    };

    // Verificar si ya existe
    if (this.categoryService.categoryExists(newCategory.name)) {
      this.errorMessage = 'Ya existe una categoría con ese nombre';
      return;
    }

    this.isAddingCategory = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(this.categoryService.createCategory(newCategory));
      this.addCategoryForm.reset({
        name: '',
        color: '#6366f1',
        icon: '📋'
      });
      this.isAddingCategory = false;
      this.errorMessage = '';
    } catch (error: any) {
      this.errorMessage = 'Error al crear la categoría: ' + error.message;
      this.isAddingCategory = false;
    }
  }

  // Iniciar edición de categoría
  startEditCategory(category: Category): void {
    this.editingCategoryId = category.id;
    this.editCategoryForm.patchValue({
      name: category.name,
      color: category.color || '#6366f1',
      icon: category.icon || '📋'
    });
  }

  // Guardar edición de categoría
  async saveEditCategory(): Promise<void> {
    if (this.editCategoryForm.invalid || !this.editingCategoryId) return;

    const formValue = this.editCategoryForm.value;
    const updateData: UpdateCategoryRequest = {
      name: formValue.name.trim(),
      color: formValue.color,
      icon: formValue.icon
    };

    // Verificar si ya existe (excluyendo la categoría actual)
    if (this.categoryService.categoryExists(updateData.name!, this.editingCategoryId)) {
      this.errorMessage = 'Ya existe una categoría con ese nombre';
      return;
    }

    try {
      await firstValueFrom(this.categoryService.updateCategory(this.editingCategoryId, updateData));
      this.cancelEdit();
      this.errorMessage = '';
    } catch (error: any) {
      this.errorMessage = 'Error al actualizar la categoría: ' + error.message;
    }
  }

  // Cancelar edición
  cancelEdit(): void {
    this.editingCategoryId = null;
    this.editCategoryForm.reset();
    this.errorMessage = '';
  }

  // Eliminar categoría
  async deleteCategory(category: Category): Promise<void> {
    // Verificar si la categoría tiene tareas
    if (category.taskCount && category.taskCount > 0) {
      this.errorMessage = `No se puede eliminar la categoría "${category.name}" porque tiene ${category.taskCount} tareas asociadas.`;
      return;
    }

    try {
      await firstValueFrom(this.categoryService.deleteCategory(category.id));
      
      // Mostrar mensaje de éxito
      this.showSuccessMessage(`Categoría "${category.name}" eliminada correctamente`);
      
      // Recargar categorías
      this.loadCategories();
    } catch (error: any) {
      this.errorMessage = 'Error al eliminar la categoría: ' + error.message;
    }
  }

  // Drag & Drop para reordenar categorías
  onDragStart(event: DragEvent, category: Category): void {
    this.draggedCategory = category;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', category.id.toString());
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, targetCategory: Category): void {
    event.preventDefault();
    if (!this.draggedCategory || this.draggedCategory.id === targetCategory.id) {
      return;
    }

    this.reorderCategories(this.draggedCategory, targetCategory);
    this.draggedCategory = null;
  }

  onDragEnd(): void {
    this.draggedCategory = null;
    this.isDraggingOverTrash = false;
  }

  // Drag & Drop para eliminar categorías (nueva funcionalidad)
  onDragOverTrash(event: DragEvent): void {
    event.preventDefault();
    if (this.draggedCategory && event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
      this.isDraggingOverTrash = true;
    }
  }

  onDragLeaveTrash(event: DragEvent): void {
    // Verificar si realmente salimos del área de la papelera
    const target = event.relatedTarget as HTMLElement;
    if (!target || !target.closest('.trash-icon')) {
      this.isDraggingOverTrash = false;
    }
  }

  onDropOnTrash(event: DragEvent): void {
    event.preventDefault();
    if (this.draggedCategory) {
      // Verificar si la categoría tiene tareas antes de eliminar
      if (this.draggedCategory.taskCount && this.draggedCategory.taskCount > 0) {
        this.errorMessage = `No se puede eliminar la categoría "${this.draggedCategory.name}" porque tiene ${this.draggedCategory.taskCount} tareas asociadas.`;
        this.draggedCategory = null;
        this.isDraggingOverTrash = false;
        return;
      }
      
      // Mostrar diálogo de confirmación personalizado
      this.showDeleteConfirmation(this.draggedCategory);
      this.draggedCategory = null;
      this.isDraggingOverTrash = false;
    }
  }

  // Mostrar diálogo de confirmación de eliminación
  private showDeleteConfirmation(category: Category): void {
    this.categoryToDelete = category;
    this.confirmMessage = `¿Estás seguro de que quieres eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`;
    this.showConfirmDialog = true;
  }

  // Confirmar eliminación
  confirmDelete(): void {
    if (this.categoryToDelete) {
      this.deleteCategory(this.categoryToDelete);
      this.hideConfirmDialog();
    }
  }

  // Cancelar eliminación
  cancelDelete(): void {
    this.hideConfirmDialog();
  }

  // Ocultar diálogo de confirmación
  private hideConfirmDialog(): void {
    this.showConfirmDialog = false;
    this.categoryToDelete = null;
    this.confirmMessage = '';
  }

  // Reordenar categorías
  private async reorderCategories(draggedCategory: Category, targetCategory: Category): Promise<void> {
    const currentOrder = this.categories.map(cat => cat.id);
    const draggedIndex = currentOrder.indexOf(draggedCategory.id);
    const targetIndex = currentOrder.indexOf(targetCategory.id);

    // Remover la categoría arrastrada
    currentOrder.splice(draggedIndex, 1);
    // Insertar en la nueva posición
    currentOrder.splice(targetIndex, 0, draggedCategory.id);

    try {
      await firstValueFrom(this.categoryService.reorderCategories(currentOrder));
    } catch (error: any) {
      this.errorMessage = 'Error al reordenar las categorías: ' + error.message;
    }
  }

  // Filtrar categorías
  filterCategories(): void {
    if (!this.searchTerm.trim()) {
      this.filteredCategories = [...this.categories];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredCategories = this.categories.filter(category =>
      category.name.toLowerCase().includes(searchLower) ||
      category.icon?.includes(searchLower)
    );
  }

  // Limpiar búsqueda
  clearSearch(): void {
    this.searchTerm = '';
    this.filterCategories();
  }

  // Obtener color de fondo para la categoría
  getCategoryBackground(category: Category): string {
    return category.color || '#6366f1';
  }

  // Obtener color de texto contrastante
  getContrastColor(backgroundColor: string): string {
    // Convertir hex a RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calcular luminancia
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  // Validar formulario
  isFormValid(form: FormGroup): boolean {
    return form.valid && form.dirty;
  }

  // Obtener mensaje de error para un campo
  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }

  // TrackBy para optimizar el rendimiento de la lista
  trackByCategoryId(index: number, category: Category): number {
    return category.id;
  }

  // Método mejorado para eliminar categoría
  private showSuccessMessage(message: string): void {
    // Por ahora usamos console.log, pero podrías implementar un sistema de notificaciones
    console.log(message);
    
    // Opcional: Mostrar un mensaje temporal en la interfaz
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }
}

