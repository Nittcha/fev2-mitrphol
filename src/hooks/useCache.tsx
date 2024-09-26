"use client";

import { useContext } from 'react';
import CacheContext from '@/context/CacheContext';
import { GeneralEntity } from '@/types/type';

interface UseGeneralReturn {
  Entities: GeneralEntity[] | undefined;
  loading: boolean;
  error: string | null;
}

export const useGeneral = (zone: string): UseGeneralReturn => {
  const { data, loading, error } = useContext(CacheContext);
  const General = data[zone];

  
  const Entities = General ? General[zone] : undefined;

  return { Entities, loading, error };
};
