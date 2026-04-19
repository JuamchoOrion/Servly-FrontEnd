export interface ChatbotMessage {
  id?: string;
  pregunta: string;
  respuestaIA?: string;
  timestamp?: Date;
}

export interface RecipeChatResponse {
  id: number;
  name: string;
  description: string;
  quantity: number;
  disponible: boolean;
  ingredientesNoDisponibles: string[];
}

export interface ChatbotResponse {
  output: string;
  recetas: RecipeChatResponse[];
  total: number;
  disponibles: number;
  noDisponibles: number;
}
