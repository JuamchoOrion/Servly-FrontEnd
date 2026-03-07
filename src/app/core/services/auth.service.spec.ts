import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, CurrentUser } from './auth.service';
import { LoginRequestDTO } from '../dtos/login-request.dto';
import { LoginResponseDTO } from '../dtos/login-response.dto';
import { environment } from '../../../enviroments/enviroment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockLoginResponse: LoginResponseDTO = {
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['ADMIN'],
    mustChangePassword: false
  };

  const mockUser: CurrentUser = {
    email: 'test@example.com',
    name: 'Test User',
    roles: ['ADMIN'],
    mustChangePassword: false
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('login()', () => {
    it('should perform login and store tokens', (done) => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
        recaptchaToken: 'mock-token'
      };

      service.login(credentials.email, credentials.password, credentials.recaptchaToken).subscribe({
        next: (response) => {
          expect(response).toEqual(mockLoginResponse);
          expect(service.getAccessToken()).toBe('mock-access-token');
          expect(service.getRefreshToken()).toBe('mock-refresh-token');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.login}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockLoginResponse);
    });

    it('should update currentUser on successful login', (done) => {
      service.login('test@example.com', 'password', 'token').subscribe({
        next: () => {
          const currentUser = service.getCurrentUser();
          expect(currentUser).toEqual(mockUser);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.login}`);
      req.flush(mockLoginResponse);
    });

    it('should set isAuthenticated to true on successful login', (done) => {
      service.login('test@example.com', 'password', 'token').subscribe({
        next: () => {
          expect(service.isAuthenticated()).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.login}`);
      req.flush(mockLoginResponse);
    });

    it('should handle 401 error (invalid credentials)', (done) => {
      service.login('test@example.com', 'wrongpassword', 'token').subscribe({
        error: (error) => {
          expect(error.message).toContain('Email o contraseña incorrectos');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.login}`);
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 403 error (account disabled)', (done) => {
      service.login('disabled@example.com', 'password', 'token').subscribe({
        error: (error) => {
          expect(error.message).toContain('Cuenta deshabilitada');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.login}`);
      req.flush({ message: 'Account disabled' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 429 error (rate limit)', (done) => {
      service.login('test@example.com', 'password', 'token').subscribe({
        error: (error) => {
          expect(error.message).toContain('Demasiados intentos');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.login}`);
      req.flush({ message: 'Too many requests' }, { status: 429, statusText: 'Too Many Requests' });
    });

    it('should handle 500 error (server error)', (done) => {
      service.login('test@example.com', 'password', 'token').subscribe({
        error: (error) => {
          expect(error.message).toContain('Error del servidor');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.login}`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('logout()', () => {
    beforeEach(() => {
      sessionStorage.setItem(environment.auth.tokenKey, 'mock-token');
      sessionStorage.setItem(environment.auth.userKey, JSON.stringify(mockUser));
    });

    it('should clear session and make logout request', (done) => {
      service.logout().subscribe({
        next: () => {
          expect(service.isAuthenticated()).toBe(false);
          expect(service.getAccessToken()).toBeNull();
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.logout}`);
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should clear storage even if logout fails', (done) => {
      service.logout().subscribe({
        error: () => {
          expect(service.isAuthenticated()).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.logout}`);
      req.error(new ProgressEvent('error'), { status: 500 });
    });
  });

  describe('refreshToken()', () => {
    beforeEach(() => {
      sessionStorage.setItem(environment.auth.refreshTokenKey, 'mock-refresh-token');
    });

    it('should refresh access token', (done) => {
      const newResponse: LoginResponseDTO = {
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['ADMIN'],
        mustChangePassword: false
      };

      service.refreshToken('mock-refresh-token').subscribe({
        next: () => {
          expect(service.getAccessToken()).toBe('new-access-token');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.refresh}`);
      req.flush(newResponse);
    });

    it('should logout if refresh fails', (done) => {
      service.refreshToken('invalid-token').subscribe({
        error: () => {
          expect(service.isAuthenticated()).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}${environment.auth.endpoints.refresh}`);
      req.flush({ message: 'Invalid token' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('hasRole()', () => {
    it('should return true if user has role', () => {
      service.setCurrentUser(mockUser);
      expect(service.hasRole('ADMIN')).toBe(true);
    });

    it('should return false if user does not have role', () => {
      service.setCurrentUser(mockUser);
      expect(service.hasRole('STOREKEEPER')).toBe(false);
    });

    it('should return false if no user is logged in', () => {
      expect(service.hasRole('ADMIN')).toBe(false);
    });
  });

  describe('hasAnyRole()', () => {
    it('should return true if user has any of the specified roles', () => {
      service.setCurrentUser(mockUser);
      expect(service.hasAnyRole('STOREKEEPER', 'ADMIN')).toBe(true);
    });

    it('should return false if user has none of the specified roles', () => {
      service.setCurrentUser(mockUser);
      expect(service.hasAnyRole('STOREKEEPER', 'CASHIER')).toBe(false);
    });
  });

  describe('getCurrentUser()', () => {
    it('should return current user', () => {
      service.setCurrentUser(mockUser);
      expect(service.getCurrentUser()).toEqual(mockUser);
    });

    it('should return null if no user logged in', () => {
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('isAuthenticated()', () => {
    it('should return true if user is logged in', () => {
      service.setCurrentUser(mockUser);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false if no user is logged in', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});

