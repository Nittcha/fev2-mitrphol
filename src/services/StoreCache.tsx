"use client";

import React, { useState, useEffect, ReactNode } from 'react';
import CacheContext from '@/context/CacheContext';
import { GeneralResponse } from '@/types/type';

interface StoreCacheProps {
  children: ReactNode;
}

const StoreCache: React.FC<StoreCacheProps> = ({ children }) => {
  const [data, setData] = useState<Record<string, GeneralResponse>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  const apiEndpoints: Record<string, string> = {
    sb: `${baseUrl}/sb/`,
    mac: `${baseUrl}/mac/`,
    mks: `${baseUrl}/mks/`,
    mpdc: `${baseUrl}/mpdc/`,
    mpl: `${baseUrl}/mpl/`,
    mpv: `${baseUrl}/mpv/`,
    mpk: `${baseUrl}/mpk/`,
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const fetchPromises = Object.entries(apiEndpoints).map(
          async ([key, url]) => {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch from ${url}: ${response.statusText}`);
            }
            const responseData: GeneralResponse = await response.json();
            return { key, data: responseData };
          }
        );

        const results = await Promise.all(fetchPromises);
        const fetchedData: Record<string, GeneralResponse> = {};

        results.forEach(({ key, data }) => {
          fetchedData[key] = data;
        });

        setData(fetchedData);
        setLoading(false);
      } catch (err) {
        const errorMessage = (err as Error).message || 'An unknown error occurred';
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchAllData(); 
  }, []);

  return (
    <CacheContext.Provider value={{ data, loading, error }}>
      {children}
    </CacheContext.Provider>
  );
};

export default StoreCache;
