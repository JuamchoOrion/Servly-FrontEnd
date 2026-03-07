export interface CreateItemCategoryRequest {
  name: string;
  description: string;
}

export interface UpdateItemCategoryRequest {
  name: string;
  description: string;
}

export interface ItemCategoryResponse {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

