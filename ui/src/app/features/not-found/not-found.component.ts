import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="not-found">
      <h1 class="not-found__title">404</h1>
      <p class="not-found__text">Схоже, такої сторінки не існує.</p>
      <a routerLink="/" class="not-found__link">Повернутися на головну</a>
    </section>
  `,

  styles: [
    `
      .not-found {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        text-align: center;
      }
      .not-found__title {
        color: #1a365d;
        font-size: 5rem;
        margin-bottom: 1rem;
      }
      .not-found__link {
        color: #1a365d;
        border: 2px solid #1a365d;
        padding: 10px 20px;
        border-radius: 8px;
        text-decoration: none;
        transition: 0.2s;
      }
      .not-found__link:hover {
        background: #1a365d;
        color: white;
      }
    `,
  ],
})
export class NotFoundComponent {}
