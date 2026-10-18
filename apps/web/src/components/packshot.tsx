import {
  Baby,
  Bean,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Droplet,
  EggFried,
  Flame,
  Gift,
  Leaf,
  Milk,
  Pill,
  Popcorn,
  Soup,
  Sparkles,
  SprayCan,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

// Products without photography get a drawn "packshot": the pack is coloured by
// department, carries the brand like a label would, and shows the pack size.

interface DepartmentStyle {
  pack: string;
  tint: string;
}

const DEPARTMENTS: Record<string, DepartmentStyle> = {
  Fresh: { pack: '#2f855a', tint: '#e8f4ed' },
  'Food & Groceries': { pack: '#b7770a', tint: '#fdf3dc' },
  'Snacks & Beverages': { pack: '#c2412d', tint: '#fbece9' },
  'Health & Personal Care': { pack: '#0f6b73', tint: '#e7f3f4' },
  'Home & Kitchen': { pack: '#5b3b7a', tint: '#f0eaf6' },
};
const FALLBACK: DepartmentStyle = { pack: '#4a4860', tint: '#eeeef2' };

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Dairy & Eggs': Milk,
  Bakery: Croissant,
  'Fruits & Vegetables': Leaf,
  'Atta, Rice & Staples': Wheat,
  'Dals & Pulses': Bean,
  'Oils & Ghee': Droplet,
  'Spices & Masalas': Flame,
  'Breakfast, Spreads & Sauces': EggFried,
  'Instant Food': Soup,
  'Snacks & Namkeen': Popcorn,
  'Biscuits & Chocolates': Cookie,
  'Tea & Coffee': Coffee,
  'Juices & Soft Drinks': CupSoda,
  'Sweets & Dry Fruits': Gift,
  'Health & Wellness': Pill,
  'Personal Care': Sparkles,
  'Baby Care': Baby,
  'Home Care': SprayCan,
  'Household Essentials': CookingPot,
};

export function departmentStyle(department: string): DepartmentStyle {
  return DEPARTMENTS[department] ?? FALLBACK;
}

export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Sparkles;
}

/** "Amul Taaza Toned Milk" by Amul reads as "Taaza Toned Milk" under the brand label. */
function shortName(name: string, brand: string | null): string {
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
    const rest = name.slice(brand.length).trim();
    if (rest.length > 2) return rest;
  }
  return name;
}

export interface PackshotProduct {
  name: string;
  brand: string | null;
  unit: string;
  imageUrl?: string | null;
  department: string;
  category: string;
}

export function Packshot({
  product,
  size = 'md',
  className,
}: {
  product: PackshotProduct;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const style = departmentStyle(product.department);
  const Icon = categoryIcon(product.category);

  if (product.imageUrl && !imageFailed) {
    return (
      <div className={cn('overflow-hidden', className)} style={{ background: style.tint }}>
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  if (size === 'xs' || size === 'sm') {
    return (
      <div
        className={cn('grid place-items-center', className)}
        style={{ background: style.tint, color: style.pack }}
        role="img"
        aria-label={product.name}
      >
        <Icon className={size === 'xs' ? 'size-4' : 'size-6'} strokeWidth={1.75} />
      </div>
    );
  }

  const large = size === 'lg';
  return (
    <div
      className={cn('relative grid place-items-center overflow-hidden', className)}
      style={{ background: style.tint }}
      role="img"
      aria-label={`${product.name}, ${product.unit}`}
    >
      <div
        className={cn(
          'relative flex flex-col justify-between overflow-hidden text-white',
          large ? 'h-[72%] w-[56%] rounded-[18px] p-6' : 'h-[74%] w-[60%] rounded-xl p-3',
        )}
        style={{
          background: `linear-gradient(160deg, ${style.pack} 0%, color-mix(in oklab, ${style.pack} 82%, black) 100%)`,
          boxShadow: `0 18px 30px -18px color-mix(in oklab, ${style.pack} 70%, black)`,
        }}
      >
        {/* Crimped seal along the top of the pack */}
        <div
          className="absolute inset-x-0 top-0 h-2 opacity-35"
          style={{
            background:
              'repeating-linear-gradient(90deg, rgb(255 255 255 / 0.9) 0 2px, transparent 2px 5px)',
          }}
        />
        <Icon
          className={cn(
            'absolute opacity-[0.16]',
            large ? '-right-6 -bottom-6 size-40' : '-right-3 -bottom-3 size-20',
          )}
          strokeWidth={1.5}
        />
        <div className="relative">
          {product.brand && (
            <p
              className={cn('truncate font-bold opacity-90', large ? 'text-base' : 'text-[11px]')}
              style={{ fontStretch: '75%' }}
            >
              {product.brand}
            </p>
          )}
          <p
            className={cn(
              'line-clamp-3 font-bold',
              large ? 'mt-1 text-3xl leading-[1.05]' : 'mt-0.5 text-[15px] leading-[1.08]',
            )}
            style={{ fontStretch: '78%' }}
          >
            {shortName(product.name, product.brand)}
          </p>
        </div>
        <span
          className={cn(
            'relative self-start rounded-full bg-white/95 font-semibold',
            large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]',
          )}
          style={{ color: style.pack }}
        >
          {product.unit}
        </span>
      </div>
    </div>
  );
}
