export interface GeneralEntity {
    StandardZone: string;
    ID: number;
    NDVI: number;
    NDWI: number;
    GLI: number;
    Precipitation: number;
    Soilmoiture: number; 
    GeoWGS84: string; 
    Lat: number;
    Lon: number;
    Date: string; 
  }
  
  export interface GeneralResponse {
    [key: string]: GeneralEntity[];
  }
  
  export interface StandardEntity {
    StandardDefaultZone: string | null | undefined;
    StandardRange: string;
    ID: number;
    NDVI: number;
    NDWI: number;
    GLI: number;
    Precipitation: number;
    Soilmoiture: number;
    StandardZone: string;
  }

  export interface MergedEntity extends GeneralEntity, StandardEntity {}
  