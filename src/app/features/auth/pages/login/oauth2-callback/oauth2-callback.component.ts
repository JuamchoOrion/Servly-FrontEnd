import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';

/**
 * OAuth2CallbackComponent
 *
 * Maneja el callback del flujo OAuth2 de Google.
 * El backend redirige a esta ruta con los siguientes query parameters:
 * - accessToken: JWT token de acceso
 * - refreshToken: JWT token de refresco
 * - email: Email del usuario
 * - name: Nombre completo del usuario
 * - role: Rol del usuario (ej: ADMIN, STOREKEEPER)
 * - error: (opcional) Código de error si falló la autenticación
 */
@Component({
  selector: 'app-oauth2-callback',
  standalone: true,
  imports: [],
  templateUrl: './oauth2-callback.component.html',
  styleUrls: ['./oauth2-callback.component.scss']
})
export class OAuth2CallbackComponent implements OnInit {

  // Estado del procesamiento
  isProcessing = true;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    console.log('🔵 [OAuth2Callback] Componente inicializado');
  }

  ngOnInit(): void {
    console.log('🔵 [OAuth2Callback] ngOnInit() ejecutado');
    this.handleCallback();
  }

  /**
   * Procesa el callback OAuth2 del backend
   *
   * Pasos:
   * 1. Leer query parameters
   * 2. Usar AuthService.processGoogleCallback() para validar y guardar
   * 3. Verificar que los tokens se guardaron correctamente
   * 4. Redirigir según rol del usuario
   */
  private handleCallback(): void {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [OAuth2Callback] handleCallback() iniciado');
    console.log('═══════════════════════════════════════════════════════════');

    this.route.queryParams.subscribe(params => {
      console.log('🔵 [OAuth2Callback] Query params recibidos:', params);

      // Extraer parámetros para logging detallado
      const accessToken = params['accessToken'];
      const refreshToken = params['refreshToken'];
      const email = params['email'];
      const name = params['name'];
      const role = params['role'];
      const error = params['error'];

      console.log('🔵 [OAuth2Callback] accessToken detectado:', accessToken ? '✅ SÍ (' + accessToken.substring(0, 30) + '...)' : '❌ NO');
      console.log('🔵 [OAuth2Callback] refreshToken detectado:', refreshToken ? '✅ SÍ (' + refreshToken.substring(0, 30) + '...)' : '❌ NO');
      console.log('🔵 [OAuth2Callback] email detectado:', email || '❌ NO');
      console.log('🔵 [OAuth2Callback] name detectado:', name || '❌ NO');
      console.log('🔵 [OAuth2Callback] role detectado:', role || '❌ NO');
      console.log('🔵 [OAuth2Callback] error detectado:', error || '❌ SIN ERROR');

      // Verificar si hay error del backend
      if (error) {
        console.error('❌ [OAuth2Callback] Error recibido del backend:', error);
        this.handleOAuth2Error(error);
        return;
      }

      // Verificar parámetros requeridos ANTES de llamar al servicio
      if (!accessToken || !refreshToken || !email) {
        console.error('❌ [OAuth2Callback] Parámetros requeridos faltantes!');
        console.error('  - accessToken:', accessToken ? '✅' : '❌');
        console.error('  - refreshToken:', refreshToken ? '✅' : '❌');
        console.error('  - email:', email ? '✅' : '❌');
        this.handleMissingTokens();
        return;
      }

      console.log('🔵 [OAuth2Callback] Parámetros validados, llamando a processGoogleCallback()...');

      // Usar el método centralizado del AuthService
      const result = this.authService.processGoogleCallback(params);

      console.log('🔵 [OAuth2Callback] Resultado de processGoogleCallback:', result);

      if (result.success) {
        // VERIFICAR QUE LOS TOKENS SE GUARDARON CORRECTAMENTE
        const savedToken = this.authService.getAccessToken();
        const savedRefreshToken = this.authService.getRefreshToken();
        const savedUser = this.authService.getCurrentUser();

        console.log('🔵 [OAuth2Callback] VERIFICACIÓN POST-GUARDADO:');
        console.log('  - accessToken en sessionStorage:', savedToken ? '✅ SÍ' : '❌ NO');
        console.log('  - refreshToken en sessionStorage:', savedRefreshToken ? '✅ SÍ' : '❌ NO');
        console.log('  - user en sessionStorage:', savedUser ? '✅ SÍ' : '❌ NO');
        console.log('  - user.role:', savedUser?.roles);

        if (!savedToken || !savedRefreshToken) {
          console.error('❌ [OAuth2Callback] ERROR CRÍTICO: Los tokens NO se guardaron en sessionStorage!');
          console.error('  Esto indica un problema en AuthService.setTokens()');
          this.handleMissingTokens();
          return;
        }

        console.log('✅ [OAuth2Callback] Tokens guardados correctamente, preparando redirección...');
        console.log('✅ [OAuth2Callback] Rol del usuario:', role);
        console.log('🔵 [OAuth2Callback] savedUser.roles:', savedUser?.roles);

        this.isProcessing = false;

        // Usar el método centralizado de redirección por rol del AuthService
        console.log('🔵 [OAuth2Callback] Ejecutando authService.redirectUserByRole() con role:', role);
        console.log('🔵 [OAuth2Callback] savedUser.roles[0]:', savedUser?.roles?.[0]);

        // Pasar el rol desde savedUser que es más confiable
        const roleToUse = savedUser?.roles?.[0] || role;
        console.log('🔵 [OAuth2Callback] roleToUse:', roleToUse);

        this.authService.redirectUserByRole(roleToUse);
      } else {
        console.error('❌ [OAuth2Callback] Proceso fallido:', result.error);
        this.handleOAuth2Error(result.error || 'unknown_error');
      }
    });
  }

  /**
   * Maneja error de OAuth2 recibido del backend
   */
  private handleOAuth2Error(error: string): void {
    console.error('❌ [OAuth2Callback] handleOAuth2Error:', error);

    this.isProcessing = false;
    this.errorMessage = this.getErrorMessage(error);

    // Redirigir al login con parámetro de error después de 3 segundos
    setTimeout(() => {
      console.log('🔵 [OAuth2Callback] Redirigiendo a /login con error');
      this.router.navigate(['/login'], {
        queryParams: { error: 'oauth2_failed' },
        replaceUrl: true
      });
    }, 3000);
  }

  /**
   * Maneja caso de tokens faltantes
   */
  private handleMissingTokens(): void {
    console.error('❌ [OAuth2Callback] handleMissingTokens');

    this.isProcessing = false;
    this.errorMessage = 'No se recibieron los tokens de autenticación del servidor';

    setTimeout(() => {
      this.router.navigate(['/login'], {
        queryParams: { error: 'missing_tokens' },
        replaceUrl: true
      });
    }, 3000);
  }

  /**
   * Maneja caso de email faltante
   */
  private handleMissingEmail(): void {
    console.error('❌ [OAuth2Callback] handleMissingEmail');

    this.isProcessing = false;
    this.errorMessage = 'No se recibió el email del usuario';

    setTimeout(() => {
      this.router.navigate(['/login'], {
        queryParams: { error: 'missing_email' },
        replaceUrl: true
      });
    }, 3000);
  }

  /**
   * Obtiene mensaje de error amigable según el código
   */
  private getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      'user_not_found': 'Usuario no encontrado en el sistema',
      'invalid_token': 'Token de autenticación inválido',
      'expired_code': 'El código de autorización expiró',
      'invalid_scope': 'Permisos insuficientes',
      'access_denied': 'Acceso denegado por Google',
      'temporarily_unavailable': 'Servicio temporalmente no disponible',
      'oauth2_failed': 'Error en la autenticación con Google'
    };

    return errorMessages[error] || 'Error en la autenticación con Google';
  }
}
