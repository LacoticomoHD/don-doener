import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { ShopFeature, ShopSummary } from '@/types';

import { isOpenNow } from './openingHours';

/** Gemeinsame Filter für Karte und Liste. Besonderheiten sind UND-verknüpft. */
interface FilterContextValue {
  features: ShopFeature[];
  openNow: boolean;
  ratedOnly: boolean;
  toggleFeature: (f: ShopFeature) => void;
  setOpenNow: (v: boolean) => void;
  setRatedOnly: (v: boolean) => void;
  reset: () => void;
  activeCount: number;
  matches: (shop: ShopSummary) => boolean;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<ShopFeature[]>([]);
  const [openNow, setOpenNow] = useState(false);
  const [ratedOnly, setRatedOnly] = useState(false);

  const toggleFeature = useCallback(
    (f: ShopFeature) => setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])),
    []
  );

  const value = useMemo<FilterContextValue>(
    () => ({
      features,
      openNow,
      ratedOnly,
      toggleFeature,
      setOpenNow,
      setRatedOnly,
      reset: () => {
        setFeatures([]);
        setOpenNow(false);
        setRatedOnly(false);
      },
      activeCount: features.length + (openNow ? 1 : 0) + (ratedOnly ? 1 : 0),
      matches: (shop) => {
        if (openNow && !isOpenNow(shop.opening_hours)) return false;
        if (ratedOnly && shop.stats.rating_count === 0) return false;
        return features.every((f) => shop.features.includes(f));
      },
    }),
    [features, openNow, ratedOnly, toggleFeature]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters außerhalb von FilterProvider');
  return ctx;
}
