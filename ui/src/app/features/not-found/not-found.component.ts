import { Component, inject, OnInit, RESPONSE_INIT } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PageTitleService } from '../../core/services/page-title.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
})
export class NotFoundComponent implements OnInit {
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  // === ADDED: inject page title service for dynamic SEO tags ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===

  constructor() {
    if (this.responseInit) {
      this.responseInit.status = 404;
    }
  }

  ngOnInit(): void {
    // === ADDED: update dynamic page title for the browser tab ===
    this.pageTitle.setTitle('NOT_FOUND.TITLE');
    // === END ADDED ===
  }
}
