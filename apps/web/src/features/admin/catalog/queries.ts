import { useQuery } from '@tanstack/react-query';
import type { CategoryDTO, ProductDTO, SupplierDTO } from '@quickbill/shared';
import type { PackshotProduct } from '@/components/packshot';
import { api } from '@/lib/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryDTO[]>('/catalog/categories'),
    staleTime: 5 * 60_000,
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get<SupplierDTO[]>('/suppliers'),
    staleTime: 60_000,
  });
}

/** Categories grouped by department, for <optgroup> pickers. */
export function groupByDepartment(categories: CategoryDTO[]) {
  const groups = new Map<string, CategoryDTO[]>();
  for (const c of categories) groups.set(c.department, [...(groups.get(c.department) ?? []), c]);
  return [...groups.entries()];
}

/** Adapts an admin product to the packshot drawing, which needs the department. */
export function toPackshot(
  product: ProductDTO,
  categories: CategoryDTO[] | undefined,
): PackshotProduct {
  return {
    name: product.name,
    brand: product.brand,
    unit: product.unit,
    imageUrl: product.imageUrl,
    category: product.category.name,
    department: categories?.find((c) => c.id === product.category.id)?.department ?? '',
  };
}
