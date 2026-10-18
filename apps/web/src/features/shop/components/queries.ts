import { useQuery } from '@tanstack/react-query';
import type { DepartmentDTO } from '@quickbill/shared';
import { api } from '@/lib/api';

export function useDepartments() {
  return useQuery({
    queryKey: ['shop', 'departments'],
    queryFn: () => api.get<DepartmentDTO[]>('/shop/departments'),
    staleTime: 10 * 60_000,
  });
}
