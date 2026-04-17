import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';
import {
  Product,
  Category,
  Recipe,
  CreateProductRequest,
  UpdateProductRequest,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  PaginatedProductResponse
} from '../dtos/product.dto';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly API_URL = environment.apiUrl;

  // Endpoints públicos (sin autenticación)
  private readonly ACTIVE_PRODUCTS_ENDPOINT = `${this.API_URL}/api/products/active`;
  private readonly MENU_PRODUCTS_ENDPOINT = `${this.API_URL}/api/menu/products`;

  // Endpoints privados (requieren autenticación - ADMIN)
  private readonly ADMIN_CATEGORIES_ENDPOINT = `${this.API_URL}/api/admin/product-categories`;
  private readonly STAFF_PRODUCTS_ENDPOINT = `${this.API_URL}/api/admin/products`;
  private readonly RECIPES_ENDPOINT = `${this.API_URL}/api/admin/recipes`;

  // Cache para categorías
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  categories$ = this.categoriesSubject.asObservable();

  // Cache para recetas
  private recipesSubject = new BehaviorSubject<Recipe[]>([]);
  recipes$ = this.recipesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCategories();
  }

  /**
   * Carga categorías y recetas al inicializar el servicio
   */
  private loadCategories(): void {
    this.getCategories().subscribe();
    this.getRecipes().subscribe();
  }

  /**
   * Obtiene todas las categorías (requiere autenticación ADMIN)
   * GET /api/admin/product-categories/active
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.ADMIN_CATEGORIES_ENDPOINT}/active`).pipe(
      tap(categories => {
        this.categoriesSubject.next(categories);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Crea una nueva categoría (requiere autenticación ADMIN)
   * POST /api/admin/product-categories
   */
  createCategory(category: { name: string; description: string; active?: boolean }): Observable<Category> {
    return this.http.post<Category>(this.ADMIN_CATEGORIES_ENDPOINT, category).pipe(
      tap(newCategory => {
        const currentCategories = this.categoriesSubject.value;
        this.categoriesSubject.next([...currentCategories, newCategory]);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene productos activos (sin autenticación)
   * GET /api/products/active
   */
  getActiveProducts(): Observable<Product[]> {
    return this.http.get<any>(this.ACTIVE_PRODUCTS_ENDPOINT).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene todos los productos con paginación (sin autenticación)
   * GET /api/menu/products?page=0&size=10
   * Retorna un array directo de productos
   */
  getProducts(page: number = 0, size: number = 10): Observable<PaginatedProductResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<Product[]>(this.MENU_PRODUCTS_ENDPOINT, { params }).pipe(
      map((products: Product[]) => {
        // El backend retorna un array directo, no una estructura paginada
        // Simulamos la paginación del lado del cliente
        return {
          content: products,
          pageNumber: page,
          pageSize: size,
          totalElements: products.length,
          totalPages: Math.ceil(products.length / size),
          isLast: (page + 1) * size >= products.length
        };
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene un producto por ID (sin autenticación)
   * GET /api/menu/products/{id}
   */
  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.MENU_PRODUCTS_ENDPOINT}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo producto (requiere autenticación)
   * POST /api/staff/products
   */
  createProduct(product: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.STAFF_PRODUCTS_ENDPOINT, product).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo producto con imagen (requiere autenticación)
   * POST /api/admin/products/with-image
   * Envía FormData con campos: name, description, price, categoryId, recipeId, active, image
   */
  createProductWithImage(
    data: {
      name: string;
      description: string;
      price: number;
      categoryId: number;
      recipeId?: number;
      active?: boolean;
    },
    imageFile?: File
  ): Observable<Product> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('price', data.price.toString());
    formData.append('categoryId', data.categoryId.toString());
    if (data.recipeId) {
      formData.append('recipeId', data.recipeId.toString());
    }
    if (data.active !== undefined) {
      formData.append('active', data.active.toString());
    }
    if (imageFile) {
      formData.append('image', imageFile, imageFile.name);
    }

    return this.http.post<Product>(`${this.API_URL}/api/admin/products/with-image`, formData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un producto existente (requiere autenticación)
   * PUT /api/staff/products/{id}
   */
  updateProduct(id: number, product: Partial<CreateProductRequest>): Observable<Product> {
    return this.http.put<Product>(`${this.STAFF_PRODUCTS_ENDPOINT}/${id}`, product).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un producto con nueva imagen (requiere autenticación)
   * PUT /api/admin/products/{id}/with-image
   * Envía FormData con campos a actualizar e imagen opcional
   */
  updateProductWithImage(
    id: number,
    data: {
      name?: string;
      description?: string;
      price?: number;
      categoryId?: number;
      recipeId?: number;
      active?: boolean;
    },
    imageFile?: File
  ): Observable<Product> {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.price) formData.append('price', data.price.toString());
    if (data.categoryId) formData.append('categoryId', data.categoryId.toString());
    if (data.recipeId) formData.append('recipeId', data.recipeId.toString());
    if (data.active !== undefined) formData.append('active', data.active.toString());
    if (imageFile) {
      formData.append('image', imageFile, imageFile.name);
    }

    return this.http.put<Product>(
      `${this.API_URL}/api/admin/products/${id}/with-image`,
      formData
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un producto (requiere autenticación)
   * DELETE /api/staff/products/{id}
   */
  deleteProduct(id: number): Observable<any> {
    return this.http.delete<any>(`${this.STAFF_PRODUCTS_ENDPOINT}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene todas las categorías (requiere autenticación ADMIN)
   * GET /api/admin/product-categories
   */
  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.ADMIN_CATEGORIES_ENDPOINT).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene una categoría por ID (requiere autenticación ADMIN)
   * GET /api/admin/product-categories/{id}
   */
  getCategoryById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.ADMIN_CATEGORIES_ENDPOINT}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza una categoría (requiere autenticación ADMIN)
   * PUT /api/admin/product-categories/{id}
   */
  updateCategory(id: number, category: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.ADMIN_CATEGORIES_ENDPOINT}/${id}`, category).pipe(
      tap(updated => {
        const current = this.categoriesSubject.value;
        const index = current.findIndex(c => c.id === id);
        if (index !== -1) {
          current[index] = updated;
          this.categoriesSubject.next([...current]);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Elimina una categoría (requiere autenticación ADMIN)
   * DELETE /api/admin/product-categories/{id}
   */
  deleteCategory(id: number): Observable<any> {
    return this.http.delete<any>(`${this.ADMIN_CATEGORIES_ENDPOINT}/${id}`).pipe(
      tap(() => {
        const current = this.categoriesSubject.value;
        this.categoriesSubject.next(current.filter(c => c.id !== id));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene todas las recetas (requiere autenticación ADMIN)
   * GET /api/admin/recipes
   */
  getRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(this.RECIPES_ENDPOINT).pipe(
      tap(recipes => {
        this.recipesSubject.next(recipes);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene una receta por ID (requiere autenticación ADMIN)
   * GET /api/admin/recipes/{id}
   */
  getRecipeById(id: number): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.RECIPES_ENDPOINT}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea una nueva receta (requiere autenticación ADMIN)
   * POST /api/admin/recipes
   */
  createRecipe(recipe: CreateRecipeRequest): Observable<Recipe> {
    return this.http.post<Recipe>(this.RECIPES_ENDPOINT, recipe).pipe(
      tap(newRecipe => {
        const currentRecipes = this.recipesSubject.value;
        this.recipesSubject.next([...currentRecipes, newRecipe]);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza una receta (requiere autenticación ADMIN)
   * PUT /api/admin/recipes/{id}
   */
  updateRecipe(id: number, recipe: UpdateRecipeRequest): Observable<Recipe> {
    return this.http.put<Recipe>(`${this.RECIPES_ENDPOINT}/${id}`, recipe).pipe(
      tap(updated => {
        const current = this.recipesSubject.value;
        const index = current.findIndex(r => r.id === id);
        if (index !== -1) {
          current[index] = updated;
          this.recipesSubject.next([...current]);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Elimina una receta (requiere autenticación ADMIN)
   * DELETE /api/admin/recipes/{id}
   */
  deleteRecipe(id: number): Observable<any> {
    return this.http.delete<any>(`${this.RECIPES_ENDPOINT}/${id}`).pipe(
      tap(() => {
        const current = this.recipesSubject.value;
        this.recipesSubject.next(current.filter(r => r.id !== id));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Maneja errores HTTP
   */
  private handleError(error: any) {
    console.error('Product Service Error:', error);
    return throwError(() => error);
  }
}
