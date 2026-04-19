import { Component } from '@angular/core';

@Component({
  selector: 'app-client-footer',
  standalone: true,
  templateUrl: './client-footer.component.html',
  styleUrls: ['./client-footer.component.scss']
})
export class ClientFooterComponent {
  currentYear = new Date().getFullYear();
}

