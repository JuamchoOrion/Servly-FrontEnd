/**
 * ARQUITECTURA DE AUTENTICACIÓN - SERVLY FRONTEND
 * ===============================================
 * 
 * RESUMEN:
 * El sistema usa JWT almacenados en sessionStorage con soporte para cookies HttpOnly
 * El interceptor automáticamente adjunta el token en cada petición
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 1. FLUJO DE LOGIN
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * ENTRADA:
 * ├─ Email: usuario@ejemplo.com
 * ├─ Password: ****
 * └─ recaptchaToken: token_v2_de_google
 * 
 * PETICIÓN HTTP:
 * POST http://localhost:8081/api/auth/login
 * Headers: 
 *   - Content-Type: application/json
 *   - withCredentials: true (✅ permite enviar/recibir cookies)
 * 
 * Body:
 * {
 *   "email": "usuario@ejemplo.com",
 *   "password": "MiPassword123",
 *   "recaptchaToken": "token_aqui"
 * }
 * 
 * RESPUESTA (200 OK):
 * {
 *   "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
 *   "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
 *   "email": "usuario@ejemplo.com",
 *   "name": "Juan Pérez",
 *   "role": "ADMIN",
 *   "userId": "uuid-123",
 *   "mustChangePassword": false,
 *   "firstLoginCompleted": true
 * }
 * 
 * SET-COOKIE (Respuesta con cookies HttpOnly):
 * Set-Cookie: accessToken=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/
 * Set-Cookie: refreshToken=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/
 * 
 * GUARDADO EN FRONTEND:
 * ├─ sessionStorage.accessToken = "eyJhbGciOiJIUzUxMiJ9..."
 * ├─ sessionStorage.refreshToken = "eyJhbGciOiJIUzUxMiJ9..."
 * └─ sessionStorage.user = { email, name, role, userId... }
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 2. ALMACENAMIENTO DE TOKENS
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * ACCESO TOKEN:
 * └─ Ubicación: sessionStorage.accessToken
 * └─ Duración: 24 horas
 * └─ Propósito: Autenticar peticiones a la API
 * └─ Tipo: Bearer Token en header Authorization
 * 
 * REFRESH TOKEN:
 * └─ Ubicación: sessionStorage.refreshToken
 * └─ Duración: 7 días
 * └─ Propósito: Obtener nuevo accessToken cuando expira
 * └─ Operación: POST /api/auth/refresh
 * 
 * COOKIES HTTPONLY (Servidor):
 * ├─ accessToken (HttpOnly, Secure, SameSite=Strict)
 * └─ refreshToken (HttpOnly, Secure, SameSite=Strict)
 * └─ Propósito: Backup automático del navegador
 * └─ Nota: No accesible desde JavaScript
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 3. INTERCEPTOR DE AUTENTICACIÓN
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * Ubicación: src/app/core/interceptors/auth.interceptor.ts
 * 
 * INTERCEPTA TODAS LAS PETICIONES:
 * 1. Obtiene el accessToken de sessionStorage
 * 2. Si existe, lo adjunta en el header Authorization: Bearer {token}
 * 3. Activa withCredentials: true (para enviar/recibir cookies)
 * 4. Detecta respuestas con error 401 (Token expirado)
 * 5. Automáticamente intenta refrescar el token
 * 6. Si refresh falla, redirige a /login
 * 
 * EJEMPLO DE PETICIÓN CON INTERCEPTOR:
 * GET http://localhost:8081/api/item-categories
 * Headers:
 *   - Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
 *   - Content-Type: application/json
 *   - Cookie: accessToken=eyJ...; refreshToken=eyJ...
 * 
 * RESPUESTA:
 * [
 *   { "id": 1, "name": "Alimentos", "description": "...", "active": true },
 *   { "id": 2, "name": "Bebidas", "description": "...", "active": true }
 * ]
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 4. REFRESH AUTOMÁTICO DE TOKEN
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * ESCENARIO: El accessToken expiró (24 horas)
 * 
 * PASO 1: Usuario intenta acceder a /categories
 * ├─ GET http://localhost:8081/api/item-categories
 * └─ Response: 401 Unauthorized (Token expirado)
 * 
 * PASO 2: Interceptor detecta 401 y obtiene refreshToken
 * ├─ POST http://localhost:8081/api/auth/refresh
 * ├─ Body: { "refreshToken": "eyJ..." }
 * └─ Response: { "accessToken": "nuevo_token", "refreshToken": "nuevo_refresh" }
 * 
 * PASO 3: Actualizar tokens en sessionStorage
 * ├─ sessionStorage.accessToken = "nuevo_token"
 * └─ sessionStorage.refreshToken = "nuevo_refresh"
 * 
 * PASO 4: Reintentar la petición original
 * ├─ GET http://localhost:8081/api/item-categories (con nuevo token)
 * └─ Response: 200 OK [categorías...]
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 5. MÉTODOS DEL AUTH SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * login(email, password, recaptchaToken): Observable<LoginResponseDTO>
 * └─ POST /api/auth/login
 * └─ Guarda tokens en sessionStorage
 * └─ Actualiza BehaviorSubject de usuario actual
 * 
 * refreshToken(refreshToken): Observable<LoginResponseDTO>
 * └─ POST /api/auth/refresh
 * └─ Usado por interceptor automáticamente
 * └─ Retorna nuevo accessToken y refreshToken
 * 
 * getAccessToken(): string | null
 * └─ Obtiene token de sessionStorage
 * └─ Usado por interceptor en cada petición
 * 
 * getRefreshToken(): string | null
 * └─ Obtiene refresh token de sessionStorage
 * └─ Usado cuando accessToken expira
 * 
 * getCurrentUser(): CurrentUser | null
 * └─ Retorna usuario actual desde BehaviorSubject
 * └─ Incluye roles para control de acceso
 * 
 * setTokens(accessToken, refreshToken): void
 * └─ Guarda tokens en sessionStorage
 * └─ Llamado automáticamente en login
 * 
 * logout(): Observable<void>
 * └─ POST /api/auth/logout
 * └─ Limpia sessionStorage
 * └─ Redirige a /login
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 6. GUARDS DE PROTECCIÓN
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * AUTH GUARD:
 * ├─ Verifica si usuario está autenticado
 * ├─ Si NO tiene usuario → Redirige a /login
 * └─ Aplicado en TODAS las rutas protegidas
 * 
 * Ejemplo:
 * {
 *   path: 'inventory',
 *   loadComponent: () => import('./inventory').then(m => m.InventoryComponent),
 *   canActivate: [authGuard]  ← ✅ Solo usuarios autenticados
 * }
 * 
 * ROLE GUARD:
 * ├─ Verifica si usuario tiene rol específico
 * ├─ Roles permitidos: ADMIN, STOREKEEPER, STAFF, etc.
 * ├─ Si NO tiene rol → Redirige a /access-denied
 * └─ Aplicado en rutas específicas
 * 
 * Ejemplo:
 * {
 *   path: 'categories',
 *   loadComponent: () => import('./categories').then(m => m.ItemCategoriesComponent),
 *   canActivate: [authGuard, roleGuard(['ADMIN', 'STOREKEEPER'])]  ← ✅ Solo admin/store
 * }
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 7. EJEMPLOS DE USO EN COMPONENTES
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * ACCEDER AL USUARIO ACTUAL:
 * 
 * constructor(private authService: AuthService) {}
 * 
 * ngOnInit() {
 *   const user = this.authService.getCurrentUser();
 *   if (user?.roles.includes('ADMIN')) {
 *     // Mostrar opciones de administrador
 *   }
 * }
 * 
 * CREAR PETICIÓN HTTP CON TOKEN AUTOMÁTICO:
 * 
 * constructor(private http: HttpClient) {}
 * 
 * getCategories() {
 *   // El interceptor automáticamente adjunta:
 *   // Authorization: Bearer {token}
 *   // withCredentials: true (envía cookies)
 *   return this.http.get('/api/item-categories');
 * }
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 8. SEGURIDAD
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * ✅ PROTECCIONES IMPLEMENTADAS:
 * 
 * 1. JWT en Header:
 *    └─ Authorization: Bearer {token}
 *    └─ No expuesto en URL
 *    └─ Solo en peticiones HTTPS
 * 
 * 2. Cookies HttpOnly:
 *    └─ No accesible desde JavaScript
 *    └─ Automáticamente enviadas por el navegador
 *    └─ Secure flag (solo HTTPS)
 *    └─ SameSite=Strict (protege contra CSRF)
 * 
 * 3. sessionStorage:
 *    └─ Se limpia al cerrar el navegador
 *    └─ No persiste en disco
 *    └─ Accesible solo desde mismo origen
 * 
 * 4. Rate Limiting:
 *    └─ Máximo 5 intentos fallidos de login
 *    └─ Bloqueo de 15 minutos después
 *    └─ Error 429 Too Many Requests
 * 
 * 5. reCAPTCHA v2:
 *    └─ Protege contra bots
 *    └─ Validación en servidor
 *    └─ Token verificado antes de login
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 9. CONEXIÓN CON MÓDULO DE CATEGORÍAS
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * FLUJO COMPLETO:
 * 
 * 1. Usuario en Inventory (http://localhost:4200/inventory)
 * 2. Click en "Gestión de Categorías" en dropdown
 * 3. Router navega a /categories
 * 4. ItemCategoriesComponent se carga
 * 5. OnInit:
 *    ├─ Verifica permisos (ADMIN o STOREKEEPER)
 *    └─ Llama a getAllCategories()
 * 6. ItemCategoryService llama a GET /api/item-categories
 * 7. Interceptor automáticamente:
 *    ├─ Obtiene token de sessionStorage
 *    ├─ Adjunta en Authorization header
 *    ├─ Activa withCredentials (envía cookies)
 *    └─ Si 401 → Refresh automático
 * 8. Backend recibe petición con token válido
 * 9. Backend responde con lista de categorías
 * 10. Component muestra tabla
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

