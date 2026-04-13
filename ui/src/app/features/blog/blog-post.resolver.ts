// resolver ensures API call completes before SSR renders HTML
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

export const blogPostResolver: ResolveFn<any> = (route) => {
  const api = inject(ApiService);
  return api.get<any>(`blog/${route.paramMap.get('slug')}`);
};
