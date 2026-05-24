// resolver ensures API call completes before SSR renders HTML
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { BlogPost } from './blog.interfaces'; // CHANGED: typed resolver instead of any

export const blogPostResolver: ResolveFn<BlogPost> = (route) => {
  // CHANGED: was ResolveFn<any>
  const api = inject(ApiService);
  return api.get<BlogPost>(`blog/${route.paramMap.get('slug')}`); // CHANGED: was get<any>
};
