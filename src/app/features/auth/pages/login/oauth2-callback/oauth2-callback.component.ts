import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-oauth2-callback',
  standalone: true,
  imports: [],
  templateUrl: './oauth2-callback.component.html',
  styleUrls: ['./oauth2-callback.component.scss']
})
export class OAuth2CallbackComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.handleCallback();
  }

  private handleCallback(): void {
    this.route.queryParams.subscribe(params => {
      const accessToken = params['accessToken'];
      const refreshToken = params['refreshToken'];
      const email = params['email'];
      const name = params['name'];
      const role = params['role'];

      console.log('🔵 OAuth2 Callback - Tokens received:', accessToken ? '✅' : '❌');

      if (accessToken && refreshToken) {
        // ✅ Guardar tokens en sessionStorage
        this.authService.setTokens(accessToken, refreshToken);
        // ✅ Guardar datos del usuario
        this.authService.setCurrentUser({
          email: email,
          name: name,
          roles: [role],
          mustChangePassword: false
        });

        console.log('✅ Login OAuth2 exitoso, tokens guardados en sessionStorage');

        // Redirigir al dashboard limpiando la URL
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      } else {
        console.error('❌ No se recibieron tokens del backend');
        this.router.navigate(['/login'], {
          queryParams: { error: 'oauth2_failed' }
        });
      }
    });
  }
}
