export interface DeletedTask {
  id: number;
  text: string;
  completed: number;
  inProgress: number;
  categories?: any[];
  deletedAt: Date;
  originalId?: number;
}

export interface RestoreTaskRequest {
  taskId: number;
  restoreToOriginal?: boolean;
}

export interface DeletePermanentlyRequest {
  taskId: number;
}

