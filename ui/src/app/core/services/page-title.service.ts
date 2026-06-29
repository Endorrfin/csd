import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private readonly titleService = inject(Title);
  private readonly translate = inject(TranslateService);

  setTitle(key: string, isAdmin = false): void {
    const refresh = () => {
      this.translate.get(key).subscribe((title: string) => {
        const fullTitle = isAdmin ? `${title} | Admin | CSD Fund` : `${title} | CSD Fund`;
        this.titleService.setTitle(fullTitle);
      });
    };

    refresh();
    this.translate.onLangChange.subscribe(refresh);
  }
}
