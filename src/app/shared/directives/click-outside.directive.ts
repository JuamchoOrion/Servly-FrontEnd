import { Directive, EventEmitter, HostListener, ElementRef, Output } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onClick(event: MouseEvent | TouchEvent): void {
    const clickedElement = event.target as HTMLElement;

    // Verificar si el click fue fuera del elemento
    if (!this.elementRef.nativeElement.contains(clickedElement)) {
      this.clickOutside.emit();
    }
  }
}



