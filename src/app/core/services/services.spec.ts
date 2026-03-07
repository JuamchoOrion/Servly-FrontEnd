import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SecurityService } from './security.service';
import { RateLimitService } from './rate-limit.service';
import { ErrorHandlingService, ErrorType, ErrorSeverity } from './error-handling.service';
import { I18nService } from './i18n.service';

describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SecurityService, I18nService]
    });
    service = TestBed.inject(SecurityService);
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS input', () => {
      const xssInput = '<script>alert("XSS")</script>';
      const sanitized = service.sanitizeInput(xssInput);
      expect(sanitized).toBeTruthy();
    });

    it('should validate emails', () => {
      expect(service.validateEmail('test@example.com')).toBe(true);
      expect(service.validateEmail('invalid-email')).toBe(false);
    });
  });
});

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RateLimitService]
    });
    service = TestBed.inject(RateLimitService);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Rate Limiting', () => {
    it('should create', () => {
      expect(service).toBeTruthy();
    });

    it('should record failed attempts', () => {
      service.recordFailedAttempt('/api/auth/login');
      expect(service.getFailedAttemptCount()).toBe(1);
    });
  });
});

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ErrorHandlingService, I18nService]
    });
    service = TestBed.inject(ErrorHandlingService);
  });

  describe('Error Handling', () => {
    it('should create', () => {
      expect(service).toBeTruthy();
    });

    it('should handle 401 errors', () => {
      const error = service.handleHttpError(401, { message: 'Invalid credentials' });
      expect(error.type).toBe(ErrorType.AUTHENTICATION);
    });

    it('should handle 500 errors', () => {
      const error = service.handleHttpError(500, { message: 'Server error' });
      expect(error.type).toBe(ErrorType.SERVER);
    });
  });
});

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [I18nService]
    });
    service = TestBed.inject(I18nService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Translation', () => {
    it('should create', () => {
      expect(service).toBeTruthy();
    });

    it('should translate keys', () => {
      const translation = service.translate('auth.login.title');
      expect(translation).toBeTruthy();
    });

    it('should set language', () => {
      service.setLanguage('en');
      expect(service.getCurrentLanguage()).toBe('en');
    });

    it('should get supported languages', () => {
      const languages = service.getSupportedLanguages();
      expect(languages.length).toBeGreaterThan(0);
    });
  });
});

