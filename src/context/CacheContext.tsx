"use client"

import React from 'react';
import { GeneralResponse } from '@/types/type';

interface CacheContextType {
  data: Record<string, GeneralResponse>;
  loading: boolean;
  error: string | null;
}

const CacheContext = React.createContext<CacheContextType>({
  data: {},
  loading: true,
  error: null,
});

export default CacheContext;