export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponseDto {
  token: string;
  refreshToken: string;
  roles: string[];
}

export interface RefreshDto {
  refreshToken: string;
}
