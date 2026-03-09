import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  showContactModal = false;
  email = 'servly41@gmail.com';

  openContactModal(): void {
    this.showContactModal = true;
  }

  closeContactModal(): void {
    this.showContactModal = false;
  }

  copyEmail(): void {
    navigator.clipboard.writeText(this.email).then(() => {
      alert('Email copiado al portapapeles');
    });
  }

  sendEmail(): void {
    window.location.href = `mailto:${this.email}`;
  }
}

