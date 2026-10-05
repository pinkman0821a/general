import type { ReactNode } from 'react';
import { ContextoCatalogoAccesorios, useCatalogo } from './useCatalogoAccesorios';

export function CatalogoAccesoriosProveedor({ children }: { children: ReactNode }) {
  const catalogo = useCatalogo();
  return <ContextoCatalogoAccesorios.Provider value={catalogo}>{children}</ContextoCatalogoAccesorios.Provider>;
}
