import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-carousel',
  standalone: true,
  template: `
    <div class="carousel">
      <div class="carousel__track" [style.transform]="'translateX(-' + currentIndex() * 100 + '%)'">
        @for (img of images; track img; let i = $index) {
          <div class="carousel__slide">
            <img [src]="img" [alt]="'Image ' + (i + 1)" />
          </div>
        }
      </div>

      @if (images.length > 1) {
        <button class="carousel__btn carousel__btn--prev" (click)="prev()">‹</button>
        <button class="carousel__btn carousel__btn--next" (click)="next()">›</button>

        <div class="carousel__dots">
          @for (img of images; track img; let i = $index) {
            <span
              class="carousel__dot"
              [class.carousel__dot--active]="i === currentIndex()"
              (click)="goTo(i)">
            </span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .carousel {
      position: relative;
      overflow: hidden;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .carousel__track {
      display: flex;
      transition: transform 0.4s ease;
    }
    .carousel__slide {
      min-width: 100%;
    }
    .carousel__slide img {
      width: 100%;
      height: 300px;
      object-fit: cover;
      display: block;
    }
    .carousel__btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: none;
      font-size: 2rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border-radius: 4px;
      line-height: 1;
      transition: background 0.2s;
    }
    .carousel__btn:hover { background: rgba(0, 0, 0, 0.8); }
    .carousel__btn--prev { left: 8px; }
    .carousel__btn--next { right: 8px; }
    .carousel__dots {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 6px;
    }
    .carousel__dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      transition: background 0.2s;
    }
    .carousel__dot--active { background: white; }
  `],
})
export class CarouselComponent {
  @Input() images: string[] = [];
  currentIndex = signal(0);

  prev(): void {
    const i = this.currentIndex();
    this.currentIndex.set(i === 0 ? this.images.length - 1 : i - 1);
  }

  next(): void {
    const i = this.currentIndex();
    this.currentIndex.set(i === this.images.length - 1 ? 0 : i + 1);
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
  }
}
