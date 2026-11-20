import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api('/categories').then((d) => d.categories),
    staleTime: 10 * 60 * 1000,
  });
}

// Seller's shop (one per seller in the MVP)
export function useMyShop(enabled = true, options = {}) {
  return useQuery({
    ...options,
    queryKey: ['my-shops'],
    queryFn: () => api('/seller/shops').then((d) => d.shops[0] ?? null),
    enabled,
  });
}
