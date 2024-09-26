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
    const fetchIncrementally = async () => {
      const fetchedData: Record<string, GeneralResponse> = {};

      for (const [key, url] of Object.entries(apiEndpoints)) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch from ${url}: ${response.statusText}`);
          }
          const responseData: GeneralResponse = await response.json();
          fetchedData[key] = responseData;

          // อัปเดตข้อมูลใน state หลังจากดึงข้อมูลแต่ละครั้ง
          setData((prevData) => ({ ...prevData, [key]: responseData }));
        } catch (err) {
          const errorMessage = (err as Error).message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
          setError(errorMessage);
        }
      }

      setLoading(false);
    };

    fetchIncrementally(); 
  }, []);

  return (
    <CacheContext.Provider value={{ data, loading, error }}>
      {children}
    </CacheContext.Provider>
  );
};

export default StoreCache;
