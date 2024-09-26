"use client";

import { useContext, useState, useEffect, useCallback, useMemo } from "react";
import CacheContext from "@/context/CacheContext";
import Sidebar from "@/components/SideBar";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useLoadScript,
} from "@react-google-maps/api";
import { GeneralEntity, StandardEntity } from "@/types/type";

const Map = () => {
  const { data, loading: dataLoading, error } = useContext(CacheContext);
  const [selectedZone, setSelectedZone] = useState<string>("sb");
  const [selectedMarker, setSelectedMarker] = useState<GeneralEntity | null>(
    null
  );
  const [markersToShow, setMarkersToShow] = useState<GeneralEntity[]>([]);
  const [loadingMarkers, setLoadingMarkers] = useState<boolean>(false);
  const [selectedRange, setSelectedRange] = useState<string>("Tillering");
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([
    "NDVI",
    "NDWI",
    "GLI",
    "Precipitation",
    "Soilmoiture",
  ]);

  const [selectedYear, setSelectedYear] = useState<string>("2023");


  const [isDefaultStandard, setIsDefaultStandard] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableStandard, setEditableStandard] = useState<StandardEntity | null>(null);
  const [standard, setStandard] = useState<StandardEntity[]>([]);
  const [standardForSelectedRange, setStandardForSelectedRange] = useState<
    StandardEntity | undefined
  >(undefined);


  const [greaterCount, setGreaterCount] = useState<number>(0);
  const [lessCount, setLessCount] = useState<number>(0);
  const [equalCount, setEqualCount] = useState<number>(0);

  const [mapCenter, setMapCenter] = useState({
    lat: 13.736717,
    lng: 100.523186,
  });
  const [mapZoom] = useState(8);

  const base_url = process.env.NEXT_PUBLIC_BASE_URL;

  const batchSize = 80000;

  const mapContainerStyle = {
    width: "100%",
    height: "600px",
  };

  const dateRanges = useMemo(
    () => ({
      Emergence: { start: "01-01", end: "02-28" },
      Tillering: { start: "03-01", end: "04-30" },
      StemElongation: { start: "06-01", end: "09-30" },
      Maturity: { start: "10-01", end: "12-31" },
    }),
    []
  );

 const refreshStandard = async () => {
  try {
    const url = `${base_url}/standard/`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && Array.isArray(data.standard_entities)) {
      setStandard(data.standard_entities); 
      const matchedStandard = data.standard_entities.find(
        (s: StandardEntity) =>
          normalizeZoneName(s.StandardZone).toLowerCase() ===
          normalizeZoneName(selectedRange).toLowerCase()
      );
      setStandardForSelectedRange(matchedStandard || null);
      setEditableStandard(matchedStandard || null);
      setIsDefaultStandard(false); 
      console.log('Matched Standard after refresh:', matchedStandard);
    } else {
      console.error("Unexpected data format:", data);
    }
  } catch (err) {
    console.error("Failed to refresh standard data", err);
  }
};


const resetStandard = async () => {
  try {
    const url = `${base_url}/standarddefault/`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && Array.isArray(data.standarddefault_entities)) {
      const resetData = data.standarddefault_entities;

      for (const defaultStandard of resetData) {
        const standardToUpdate = {
          NDVI: defaultStandard.NDVI,
          NDWI: defaultStandard.NDWI,
          GLI: defaultStandard.GLI,
          Precipitation: defaultStandard.Precipitation,
          Soilmoiture: defaultStandard.Soilmoiture,
          StandardZone: defaultStandard.StandardDefaultZone
        };

        await fetch(`${base_url}/standard/${defaultStandard.ID}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(standardToUpdate),
        });
      }

      await refreshStandard();
      setIsDefaultStandard(true);

      console.log('Standard has been reset to default values from standarddefault.');
    } else {
      console.error("Unexpected data format from standarddefault API:", data);
    }
  } catch (err) {
    console.error("Failed to reset standard to default values", err);
  }
};

  const handleStandardUpdate = async (updatedStandard: StandardEntity) => {
    try {
      const res = await fetch(`${base_url}/standard/${updatedStandard.ID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedStandard),
      });

      if (res.ok) {
        const updatedData = await res.json();

        setStandard((prevStandards) =>
          prevStandards.map((standard) =>
            standard.ID === updatedData.id ? updatedData : standard
          )
        );

        setStandardForSelectedRange(updatedData);
        setEditableStandard(updatedData);

        console.log("Standard updated successfully:", updatedData);
        await refreshStandard();
      } else {
        console.error("Failed to update standard:", res.statusText);
      }
    } catch (err) {
      console.error("Failed to update standard data", err);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditableStandard(standardForSelectedRange || null);
  };

  const handleSaveClick = () => {
    if (editableStandard) {
      handleStandardUpdate(editableStandard);
      setIsEditing(false);
    }
  };

  const handleInputChange = (key: keyof StandardEntity, value: string) => {
    if (editableStandard) {
      setEditableStandard({ ...editableStandard, [key]: parseFloat(value) });
    }
  };


  const compareWithStandard = (
    entity: GeneralEntity,
    standard?: StandardEntity
  ) => {
    if (!standard || selectedAttributes.length === 0) return "grey";
  
    let hasGreater = false;
    let hasLess = false;
    let allEqual = true;
  
    // เปรียบเทียบค่าของแต่ละ Attribute
    for (const attr of selectedAttributes) {
      const entityValue = entity[attr as keyof GeneralEntity] as number;
      const standardValue = standard[attr as keyof StandardEntity] as number;
  
      if (entityValue > standardValue) {
        hasGreater = true;
        allEqual = false;
      } else if (entityValue < standardValue) {
        hasLess = true;
        allEqual = false;
      }
    }
  
    if (hasLess) return "red"; 
    if (hasGreater) return "green";
    if (allEqual) return "yellow";
  
    return "grey";
  };
  

  const filterByDateRange = useCallback(
    (data: GeneralEntity[], selectedRange: string, selectedYear: string) => {
      const { start, end } =
        dateRanges[selectedRange as keyof typeof dateRanges];
      const startMonth = parseInt(start.slice(0, 2));
      const endMonth = parseInt(end.slice(0, 2));

      const filteredData = data.filter((entity) => {
        const entityDate = new Date(entity.Date);
        const entityMonth = entityDate.getMonth() + 1;
        const entityYear = entityDate.getFullYear().toString();

        const isValidPrecipitation = entity.Precipitation !== 0;
        const isValidSoilMoiture = entity.Soilmoiture !== 0;

        return (
          entityYear === selectedYear &&
          entityMonth >= startMonth &&
          entityMonth <= endMonth &&
          isValidPrecipitation &&
          isValidSoilMoiture
        );
      });

      console.log(
        `Filtered data count for ${selectedRange} in ${selectedYear}:`,
        filteredData.length
      );

      return filteredData;
    },
    [dateRanges]
  );

  const calculateAverage = (
    filteredData: GeneralEntity[],
    attributes: string[]
  ) => {
    const sums: { [key: string]: number } = {};
    const counts: { [key: string]: number } = {};

    attributes.forEach((attr) => {
      sums[attr] = 0;
      counts[attr] = 0;
    });

    filteredData.forEach((entity) => {
      attributes.forEach((attr) => {
        if (entity[attr as keyof GeneralEntity] !== undefined) {
          const value = entity[attr as keyof GeneralEntity] as number;

          sums[attr] += value;
          counts[attr] += 1;
        }
      });
    });

    const averages: { [key: string]: number } = {};
    attributes.forEach((attr) => {
      averages[attr] = sums[attr] / counts[attr];
    });

    return averages;
  };

  const normalizeZoneName = (zone: string | undefined | null): string => {
    if (!zone) {
      return "";
    }
    return zone.replace(/\s+/g, "");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = isDefaultStandard ? `${base_url}/standarddefault/` : `${base_url}/standard/`;
        const res = await fetch(url);
        const data = await res.json();
  
        if (isDefaultStandard && data && Array.isArray(data.standarddefault_entities)) {
          console.log("Fetching from standarddefault");
          setStandard(data.standarddefault_entities); 
          const matchedStandard = data.standarddefault_entities.find(
            (s: StandardEntity) =>
              normalizeZoneName(s.StandardDefaultZone).toLowerCase() ===
              normalizeZoneName(selectedRange).toLowerCase()
          );
          setStandardForSelectedRange(matchedStandard || null);
          setEditableStandard(matchedStandard || null);
        } else if (!isDefaultStandard && data && Array.isArray(data.standard_entities)) {
          console.log("Fetching from standard");
          setStandard(data.standard_entities); 
          const matchedStandard = data.standard_entities.find(
            (s: StandardEntity) =>
              normalizeZoneName(s.StandardZone).toLowerCase() ===
              normalizeZoneName(selectedRange).toLowerCase()
          );
          setStandardForSelectedRange(matchedStandard || null);
          setEditableStandard(matchedStandard || null);
        } else {
          console.error("Unexpected data format:", data);
        }
      } catch (err) {
        console.error("Failed to fetch standard data", err);
      }
    };
  
    if (!isDefaultStandard) {
      fetchData();
    }
  }, [base_url, isDefaultStandard, selectedRange]); 
  


  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  useEffect(() => {
    if (dataLoading || error || !isLoaded || standard.length === 0) return;

    const selectedData: GeneralEntity[] = data[selectedZone]?.sb_entities || [];
    const filteredData = filterByDateRange(
      selectedData,
      selectedRange,
      selectedYear
    );

    const averages = calculateAverage(filteredData, selectedAttributes);

    console.log("Averages:", averages);
  }, [
    data,
    selectedZone,
    selectedRange,
    selectedAttributes,
    dataLoading,
    error,
    isLoaded,
    standard,
    filterByDateRange,
  ]);

  const handleSelectZone = (zone: string) => {
    setSelectedZone(zone);
    setMarkersToShow([]);
    setLoadingMarkers(true);
  };

  const handleSelectRange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRange(event.target.value);
    setMarkersToShow([]);
    setLoadingMarkers(true);
  };

  const handleSelectAttribute = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setSelectedAttributes((prev) =>
      event.target.checked
        ? [...prev, value]
        : prev.filter((attr) => attr !== value)
    );
    setMarkersToShow([]);
    setLoadingMarkers(true);
  };

  const memoizedMarkers = useMemo(() => {
    return markersToShow.map((entity: GeneralEntity) => {
      const markerColor = compareWithStandard(entity, standardForSelectedRange);
      const iconUrl =
        markerColor === "green"
          ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
          : markerColor === "red"
            ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
            : markerColor === "yellow"
              ? "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
              : "http://maps.google.com/mapfiles/ms/icons/grey-dot.png";

      return (
        <Marker
          key={entity.ID}
          position={{ lat: entity.Lat, lng: entity.Lon }}
          icon={{ url: iconUrl }}
          onClick={() => {
            setSelectedMarker(entity);
            setMapCenter({ lat: entity.Lat, lng: entity.Lon });
          }}
        />
      );
    });
  }, [markersToShow, standardForSelectedRange, selectedAttributes]);

  useEffect(() => {
    if (dataLoading || error || !isLoaded || standard.length === 0) return;

    const selectedData: GeneralEntity[] = (() => {
      switch (selectedZone) {
        case "sb":
          return data[selectedZone]?.sb_entities || [];
        case "mac":
          return data[selectedZone]?.mac_entities || [];
        case "mks":
          return data[selectedZone]?.mks_entities || [];
        case "mpdc":
          return data[selectedZone]?.mpdc_entities || [];
        case "mpl":
          return data[selectedZone]?.mpl_entities || [];
        case "mpv":
          return data[selectedZone]?.mpv_entities || [];
        case "mpk":
          return data[selectedZone]?.mpk_entities || [];
        default:
          return [];
      }
    })();

    const filteredData = filterByDateRange(
      selectedData,
      selectedRange,
      selectedYear
    );

    const standardForRange =
      Array.isArray(standard) && standard.length > 0
        ? standard.find(
          (s) =>
            normalizeZoneName(s.StandardZone) ===
            normalizeZoneName(selectedRange)
        )
        : undefined;

    setStandardForSelectedRange(standardForRange);

    if (filteredData.length > 0 && standardForRange) {
      setMarkersToShow([]);
      setLoadingMarkers(true);

      let currentBatchIndex = 0;
      let greater = 0;
      let less = 0;
      let equal = 0;

      const loadBatch = () => {
        const batch = filteredData.slice(
          currentBatchIndex * batchSize,
          (currentBatchIndex + 1) * batchSize
        );

        batch.forEach((entity) => {
          const color = compareWithStandard(entity, standardForRange);
          if (color === "green") greater++;
          if (color === "red") less++;
          if (color === "yellow") equal++;
        });

        setMarkersToShow((prevMarkers) => [...prevMarkers, ...batch]);

        currentBatchIndex++;

        if (currentBatchIndex * batchSize < filteredData.length) {
          setTimeout(loadBatch, 50);
        }

        setLoadingMarkers(false);
      };

      loadBatch();
      setGreaterCount(greater);
      setLessCount(less);
      setEqualCount(equal);
    } else {
      setMarkersToShow([]);
      setLoadingMarkers(false);
    }
  }, [
    data,
    selectedZone,
    selectedRange,
    dataLoading,
    error,
    isLoaded,
    standard,
    filterByDateRange,
    selectedAttributes,
  ]);

  if (dataLoading || loadError) return <div>Loading data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  const totalMarkers = greaterCount + lessCount + equalCount;
  const greaterPercent = ((greaterCount / totalMarkers) * 100).toFixed(2);
  const lessPercent = ((lessCount / totalMarkers) * 100).toFixed(2);
  const equalPercent = ((equalCount / totalMarkers) * 100).toFixed(2);

  return (
    <div className="flex h-dvh">
      <Sidebar selectedZone={selectedZone} onSelectZone={handleSelectZone} />
      <div className="flex flex-col w-full">
        {standardForSelectedRange && (
          <div className="flex flex-col items-center mt-4">
            <h2 className="text-2xl font-bold mb-4">Standard </h2>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-gray-100 p-4 rounded-lg shadow-md w-48 text-center">
                <p className="text-blue-500 font-bold">NDVI</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editableStandard?.NDVI !== undefined ? editableStandard.NDVI : standardForSelectedRange.NDVI}
                    onChange={(e) => handleInputChange("NDVI", e.target.value)}
                    className="text-center"
                  />
                ) : (
                  <p>{standardForSelectedRange.NDVI}</p>
                )}
              </div>

              <div className="bg-gray-100 p-4 rounded-lg shadow-md w-48 text-center">
                <p className="text-blue-500 font-bold">GLI</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editableStandard?.GLI !== undefined ? editableStandard.GLI : standardForSelectedRange.GLI}
                    onChange={(e) => handleInputChange("GLI", e.target.value)}
                    className="text-center"
                  />
                ) : (
                  <p>{standardForSelectedRange.GLI}</p>
                )}
              </div>

              <div className="bg-gray-100 p-4 rounded-lg shadow-md w-48 text-center">
                <p className="text-blue-500 font-bold">NDWI</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editableStandard?.NDWI !== undefined ? editableStandard.NDWI : standardForSelectedRange.NDWI}
                    onChange={(e) => handleInputChange("NDWI", e.target.value)}
                    className="text-center"
                  />
                ) : (
                  <p>{standardForSelectedRange.NDWI}</p>
                )}
              </div>

              <div className="bg-gray-100 p-4 rounded-lg shadow-md w-48 text-center">
                <p className="text-blue-500 font-bold">Precipitation</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editableStandard?.Precipitation !== undefined ? editableStandard.Precipitation : standardForSelectedRange.Precipitation}
                    onChange={(e) => handleInputChange("Precipitation", e.target.value)}
                    className="text-center"
                  />
                ) : (
                  <p>{standardForSelectedRange.Precipitation}</p>
                )}
              </div>

              <div className="bg-gray-100 p-4 rounded-lg shadow-md w-48 text-center">
                <p className="text-blue-500 font-bold">Soil Moisture</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editableStandard?.Soilmoiture !== undefined ? editableStandard.Soilmoiture : standardForSelectedRange.Soilmoiture}
                    onChange={(e) => handleInputChange("Soilmoiture", e.target.value)}
                    className="text-center"
                  />
                ) : (
                  <p>{standardForSelectedRange.Soilmoiture}</p>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={resetStandard}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Reset Default
              </button>

              {isEditing ? (
                <button
                  onClick={handleSaveClick}
                  className="bg-green-500 text-white px-4 py-2 rounded"
                >
                  Save Standard
                </button>
              ) : (
                <button
                  onClick={handleEditClick}
                  className="bg-yellow-500 text-white px-4 py-2 rounded"
                >
                  Edit Standard
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center space-x-4 space-y-2 m-4">
          <div className="flex items-center space-x-2">
            <label>Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2 py-1 rounded-lg bg-gray-100"
            >
              <option value="2023">2023</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label>Period</label>
            <select
              value={selectedRange}
              onChange={handleSelectRange}
              className="px-2 py-1 rounded-lg bg-gray-100"
            >
              <option value="Emergence">Emergence (Jan-Feb)</option>
              <option value="Tillering">Tillering (Mar-Apr)</option>
              <option value="StemElongation">Stem Elongation (Jun-Sep)</option>
              <option value="Maturity">Maturity (Oct-Dec)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label>Index</label>
            <div className="flex flex-wrap space-x-2">
              <label>
                <input
                  type="checkbox"
                  value="All"
                  checked={selectedAttributes.length === 5}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const allAttributes = [
                        "NDVI",
                        "NDWI",
                        "GLI",
                        "Precipitation",
                        "Soilmoiture",
                      ];
                      setSelectedAttributes(allAttributes);
                    } else {
                      setSelectedAttributes([]);
                    }
                    setMarkersToShow([]);
                    setLoadingMarkers(true);
                  }}
                  className="mr-1"
                />
                All
              </label>

              <label>
                <input
                  type="checkbox"
                  value="NDVI"
                  checked={selectedAttributes.includes("NDVI")}
                  onChange={handleSelectAttribute}
                  className="mr-1"
                />
                NDVI
              </label>

              <label>
                <input
                  type="checkbox"
                  value="NDWI"
                  checked={selectedAttributes.includes("NDWI")}
                  onChange={handleSelectAttribute}
                  className="mr-1"
                />
                NDWI
              </label>

              <label>
                <input
                  type="checkbox"
                  value="GLI"
                  checked={selectedAttributes.includes("GLI")}
                  onChange={handleSelectAttribute}
                  className="mr-1"
                />
                GLI
              </label>

              <label>
                <input
                  type="checkbox"
                  value="Precipitation"
                  checked={selectedAttributes.includes("Precipitation")}
                  onChange={handleSelectAttribute}
                  className="mr-1"
                />
                Precipitation
              </label>

              <label>
                <input
                  type="checkbox"
                  value="Soilmoiture"
                  checked={selectedAttributes.includes("Soilmoiture")}
                  onChange={handleSelectAttribute}
                  className="mr-1"
                />
                Soil Moisture
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <div className="bg-gray-100 p-4 rounded-lg shadow-md w-48 text-center">
            <p className="font-bold">จำนวนที่มากกว่า</p>
            <p className="text-green-500">
              {greaterCount} ({greaterPercent}%)
            </p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow-md w-48 text-center">
            <p className="font-bold">จำนวนที่น้อยกว่า</p>
            <p className="text-red-500">
              {lessCount} ({lessPercent}%)
            </p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg shadow-md w-48 text-center">
            <p className="font-bold">จำนวนที่เท่ากัน</p>
            <p>
              {equalCount} ({equalPercent}%)
            </p>
          </div>
        </div>

        <div className="w-full">
          {loadingMarkers ? (
            <div
              style={{
                textAlign: "center",
                paddingTop: "50px",
                fontSize: "24px",
              }}
            >
              Loading markers...
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={mapZoom}
              center={mapCenter}
              mapTypeId="satellite"
            >
              {memoizedMarkers}
              {selectedMarker && (
                <InfoWindow
                  position={{
                    lat: selectedMarker.Lat,
                    lng: selectedMarker.Lon,
                  }}
                  onCloseClick={() => {
                    setSelectedMarker(null);
                  }}
                >
                  <div className="text-black">
                    <p>
                      <strong>NDVI:</strong> {selectedMarker.NDVI}
                    </p>
                    <p>
                      <strong>NDWI:</strong> {selectedMarker.NDWI}
                    </p>
                    <p>
                      <strong>GLI:</strong> {selectedMarker.GLI}
                    </p>
                    <p>
                      <strong>Precipitation:</strong>{" "}
                      {selectedMarker.Precipitation}
                    </p>
                    <p>
                      <strong>Soil Moisture:</strong>{" "}
                      {selectedMarker.Soilmoiture}
                    </p>
                    <p>
                      <strong>Latitude:</strong> {selectedMarker.Lat}
                    </p>
                    <p>
                      <strong>Longitude:</strong> {selectedMarker.Lon}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>
      </div>
    </div>
  );
};

export default Map;


