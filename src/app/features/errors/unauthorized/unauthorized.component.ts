import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss']
})
export class UnauthorizedComponent {

  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
