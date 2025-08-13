export interface Category {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
  taskCount?: number;
}

export interface CreateCategoryRequest {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  color?: string;
  icon?: string;
  order?: number;
}

export interface CategoryFilters {
  search?: string;
  active?: boolean;
}


