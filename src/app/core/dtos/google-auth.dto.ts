/**
 * DTO para autenticación con Google
 */
export interface GoogleAuthRequestDTO {
  tokenId: string;
}

export interface GoogleAuthResponseDTO {
  token: string;
  refreshToken: string;
  email: string;
  name: string;
  picture?: string;
  roles: string[];
  mustChangePassword: boolean;
}

