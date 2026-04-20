import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { ChatbotMessage, ChatbotResponse } from '../../core/dtos/chatbot.dto';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly N8N_URL = 'https://mayaxxy.app.n8n.cloud/webhook/da6ef6e3-e05c-4cee-81ff-40cf374ef1ed/chat';
  private sessionId = `mesa-${Date.now()}`;

  private messageHistorySubject = new BehaviorSubject<ChatbotMessage[]>([]);
  public messageHistory$ = this.messageHistorySubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadMessageHistory();
  }

  enviarConsulta(pregunta: string): Observable<ChatbotResponse> {
    this.loadingSubject.next(true);

    const body = {
      chatInput: pregunta.trim(),
      sessionId: this.sessionId
    };

    return new Observable(observer => {
      this.http.post<any>(this.N8N_URL, body).subscribe({
        next: (response) => {
          const chatbotResponse: ChatbotResponse = {
            output: response.output ?? '',
            recetas: response.recetas ?? [],
            total: response.total ?? 0,
            disponibles: response.disponibles ?? 0,
            noDisponibles: response.noDisponibles ?? 0
          };

          const message: ChatbotMessage = {
            id: Date.now().toString(),
            pregunta: pregunta,
            respuestaIA: response.output ?? '',
            timestamp: new Date()
          };

          this.addMessageToHistory(message);
          this.loadingSubject.next(false);
          observer.next(chatbotResponse);
          observer.complete();
        },
        error: (error) => {
          console.error('❌ [ChatbotService] ERROR:', error);
          this.loadingSubject.next(false);
          observer.error(error);
        }
      });
    });
  }

  private addMessageToHistory(message: ChatbotMessage): void {
    const currentHistory = this.messageHistorySubject.value;
    const updatedHistory = [...currentHistory, message];
    this.messageHistorySubject.next(updatedHistory);
    this.saveMessageHistory(updatedHistory);
  }

  getMessageHistory(): ChatbotMessage[] {
    return this.messageHistorySubject.value;
  }

  clearHistory(): void {
    this.messageHistorySubject.next([]);
    try {
      localStorage.removeItem('servly_chatbot_history');
    } catch {
      console.error('No se pudo limpiar el historial del chatbot');
    }
  }

  private saveMessageHistory(history: ChatbotMessage[]): void {
    try {
      localStorage.setItem('servly_chatbot_history', JSON.stringify(history));
    } catch {
      console.error('No se pudo guardar el historial del chatbot');
    }
  }

  private loadMessageHistory(): void {
    try {
      const stored = localStorage.getItem('servly_chatbot_history');
      if (stored) {
        const history = JSON.parse(stored) as ChatbotMessage[];
        this.messageHistorySubject.next(history);
      }
    } catch {
      console.error('No se pudo cargar el historial del chatbot');
    }
  }
}
