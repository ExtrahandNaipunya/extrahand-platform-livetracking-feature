'use client';

import { useJsApiLoader, Libraries } from '@react-google-maps/api';
import React, { createContext, useContext, ReactNode } from 'react';

interface MapsContextValue {
  isLoaded: boolean;
  loadError?: Error;
}

const MapsContext = createContext<MapsContextValue>({
  isLoaded: false,
});

export const useMapsContext = () => useContext(MapsContext);

const libraries: Libraries = ['places', 'geometry'];

interface MapsProviderProps {
  children: ReactNode;
}

export function MapsProvider({ children }: MapsProviderProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  return (
    <MapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </MapsContext.Provider>
  );
}
