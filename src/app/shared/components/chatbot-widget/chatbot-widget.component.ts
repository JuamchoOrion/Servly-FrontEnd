import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../services/chatbot.service';
import { ChatbotMessage, ChatbotResponse, RecipeChatResponse } from '../../../core/dtos/chatbot.dto';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.scss']
})
export class ChatbotWidgetComponent implements OnInit {
  isOpen = false;
  inputPregunta = '';
  messageHistory: ChatbotMessage[] = [];
  currentResponse: ChatbotResponse | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(
    private chatbotService: ChatbotService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.chatbotService.messageHistory$.subscribe(history => {
      this.messageHistory = history;
      this.cdr.detectChanges();
    });

    this.chatbotService.loading$.subscribe(loading => {
      this.isLoading = loading;
      this.cdr.detectChanges();
    });
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => {
        const input = document.getElementById('chatbot-input') as HTMLInputElement;
        input?.focus();
      }, 100);
    }
  }

  closeChat(): void {
    this.isOpen = false;
  }

  enviarPregunta(): void {
    const pregunta = this.inputPregunta.trim();

    if (!pregunta) {
      this.error = 'Por favor, ingresa una pregunta';
      return;
    }

    this.error = null;
    this.chatbotService.enviarConsulta(pregunta).subscribe({
      next: (response: ChatbotResponse) => {
        this.currentResponse = response;
        this.inputPregunta = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al enviar consulta:', err);
        this.error = 'No se pudo procesar tu pregunta. Intenta de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  limpiarHistorial(): void {
    if (confirm('¿Estás seguro de que deseas limpiar el historial?')) {
      this.chatbotService.clearHistory();
      this.currentResponse = null;
      this.inputPregunta = '';
    }
  }

  hasResults(): boolean {
    return this.currentResponse !== null && this.currentResponse.total > 0;
  }

  getDisponibilidad(receta: RecipeChatResponse): string {
    return receta.disponible ? '✓ Disponible' : '⚠️ Faltan ingredientes';
  }

  // ← SE ELIMINÓ @HostListener('keydown.enter') — causaba doble envío

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const container = document.querySelector('.chatbot-container');

    if (this.isOpen && container && !container.contains(target)) {
      this.closeChat();
    }
  }
}
