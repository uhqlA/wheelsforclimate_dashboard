import React, { useRef, useEffect, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {
  Style,
  Icon,
  Fill,
  Stroke,
  Circle as CircleStyle,
  Text,
} from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import Overlay from 'ol/Overlay';
import { Coordinate } from 'ol/coordinate';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';

import routesGeoJSON from '../components/Data/Daystar_route'; // Adjust path as necessary

type MapType = 'osm' | 'openstreet' | 'satellite' | 'terrain' | 'dark';

interface GeoJSONData {
  type: string;
  features: any[];
}

interface SelectedFeature {
  properties: { [key: string]: any };
  coordinates: [number, number];
  geometry: any;
}

const MapComponent: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const vectorLayerRef = useRef<VectorLayer<any> | null>(null);
  const geoJsonSourceRef = useRef<VectorSource | null>(null);
  const geoJsonLayerRef = useRef<VectorLayer<any> | null>(null);
  const routesSourceRef = useRef<VectorSource | null>(null);
  const routesLayerRef = useRef<VectorLayer<any> | null>(null);
  const overlayRef = useRef<Overlay | null>(null);

  const [currentMapType, setCurrentMapType] = useState<MapType>('osm');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [showApiLayer, setShowApiLayer] = useState(true);
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiDataLoaded, setApiDataLoaded] = useState(false);
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedFeature | null>(null);
  const [popupPosition, setPopupPosition] = useState<Coordinate | null>(null);

  // Define base map sources
  const mapSources = {
    osm: new OSM(),
    openstreet: new XYZ({
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    }),
    satellite: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    }),
    terrain: new XYZ({
      url: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
    }),
    dark: new XYZ({
      url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    }),
  };

  // Fetch GeoJSON data from API
  const fetchGeoJsonData = async () => {
    setIsLoading(true);
    setError(null);
    setApiError(null);
    setApiDataLoaded(false);
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/rest_places_coordinates/geojson/',
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: GeoJSONData = await response.json();
      setGeoJsonData(data);
      setApiDataLoaded(true);
      console.log('GeoJSON data loaded:', data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      setApiError(errorMessage);
      console.error('Error fetching GeoJSON data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Add GeoJSON features to map
  const addGeoJsonToMap = () => {
    if (!geoJsonData || !mapObj.current || !geoJsonSourceRef.current) return;

    try {
      const format = new GeoJSON();
      const features = format.readFeatures(geoJsonData, {
        featureProjection: 'EPSG:3857', // Web Mercator projection
        dataProjection: 'EPSG:4326', // WGS84 (lat/lon)
      });

      // Clear existing features
      geoJsonSourceRef.current.clear();

      // Add new features
      geoJsonSourceRef.current.addFeatures(features);

      // Fit view to show all features if there are any
      if (features.length > 0) {
        const extent = geoJsonSourceRef.current.getExtent();
        mapObj.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 16,
        });
      }

      console.log(`Added ${features.length} features to map`);
    } catch (err) {
      console.error('Error adding GeoJSON to map:', err);
      setError('Error processing GeoJSON data');
    }
  };

  // Add routes to map
  const addRoutesToMap = () => {
    if (!routesGeoJSON || !mapObj.current || !routesSourceRef.current) return;

    try {
      const format = new GeoJSON();
      const routeFeatures = format.readFeatures(routesGeoJSON, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326',
      });

      // Clear existing route features
      routesSourceRef.current.clear();

      // Style each route feature
      routeFeatures.forEach((feature) => {
        feature.setStyle(
          new Style({
            stroke: new Stroke({
              color: 'blue',
              width: 4,
            }),
          }),
        );
      });

      // Add route features
      routesSourceRef.current.addFeatures(routeFeatures);

      console.log(`Added ${routeFeatures.length} route features to map`);
    } catch (err) {
      console.error('Error adding routes to map:', err);
    }
  };

  // Create style for GeoJSON features
  const createGeoJsonStyle = () => {
    return new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: '#6B8E23' }),
        stroke: new Stroke({ color: '#fff', width: 2 }),
      }),
      fill: new Fill({ color: 'rgba(255, 107, 107, 0.3)' }),
      stroke: new Stroke({ color: '#ff6b6b', width: 2 }),
      text: new Text({
        font: '12px Calibri,sans-serif',
        fill: new Fill({ color: '#000' }),
        stroke: new Stroke({ color: '#fff', width: 3 }),
        offsetY: -25,
      }),
    });
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      mapObj.current?.updateSize();
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Toggle API layer visibility
  useEffect(() => {
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.setVisible(showApiLayer);
    }
  }, [showApiLayer]);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapObj.current && popupRef.current) {
      // Vector source for current location marker
      vectorSourceRef.current = new VectorSource();
      vectorLayerRef.current = new VectorLayer({
        source: vectorSourceRef.current,
      });

      // Vector source for GeoJSON data
      geoJsonSourceRef.current = new VectorSource();
      geoJsonLayerRef.current = new VectorLayer({
        source: geoJsonSourceRef.current,
        visible: showApiLayer,
        style: (feature) => {
          const style = createGeoJsonStyle();
          // Add feature name as text if available
          const name = feature.get('name') || feature.get('title') || '';
          if (name) {
            style.getText()?.setText(name);
          }
          return style;
        },
      });

      // Vector source for routes
      routesSourceRef.current = new VectorSource();
      routesLayerRef.current = new VectorLayer({
        source: routesSourceRef.current,
      });

      // Create popup overlay
      overlayRef.current = new Overlay({
        element: popupRef.current,
        autoPan: {
          animation: {
            duration: 250,
          },
        },
        positioning: 'bottom-center',
        stopEvent: false,
        offset: [0, -10],
      });

      mapObj.current = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({ source: mapSources[currentMapType] }),
          routesLayerRef.current, // Routes layer (bottom)
          geoJsonLayerRef.current, // GeoJSON layer (middle)
          vectorLayerRef.current, // Current location marker on top
        ],
        overlays: [overlayRef.current],
        view: new View({
          center: fromLonLat([36.8219, -1.2921]), // Default center (Nairobi)
          zoom: 10,
        }),
      });

      // Add click handler for feature selection
      mapObj.current.on('click', (event) => {
        const feature = mapObj.current!.forEachFeatureAtPixel(
          event.pixel,
          (feature) => {
            // Only handle GeoJSON features (not current location marker or routes)
            if (geoJsonSourceRef.current?.hasFeature(feature)) {
              return feature;
            }
            return null;
          },
        );

        if (feature) {
          const geometry = feature.getGeometry();
          const properties = feature.getProperties();

          // Remove geometry from properties to avoid circular references
          const cleanProperties = { ...properties };
          delete cleanProperties.geometry;

          let coordinates: [number, number];

          if (geometry instanceof Point) {
            const coords = geometry.getCoordinates();
            coordinates = toLonLat(coords) as [number, number];
          } else {
            coordinates = [0, 0]; // fallback
          }

          setSelectedFeature({
            properties: cleanProperties,
            coordinates,
            geometry: geometry,
          });

          setPopupPosition(event.coordinate);
          overlayRef.current?.setPosition(event.coordinate);
        } else {
          // Close popup when clicking elsewhere
          closePopup();
        }
      });

      // Request current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lon = position.coords.longitude;
            const lat = position.coords.latitude;
            const coords = fromLonLat([lon, lat]);

            const marker = new Feature({
              geometry: new Point(coords),
            });

            marker.setStyle(
              new Style({
                image: new Icon({
                  src: 'https://img.icons8.com/emoji/512w/person-biking.png',
                  scale: 0.25,
                }),
              }),
            );

            vectorSourceRef.current?.addFeature(marker);
            // Don't automatically center on current location if we have GeoJSON data
            if (!geoJsonData) {
              mapObj.current?.getView().animate({ center: coords, zoom: 14 });
            }
          },
          (err) => console.error('Geolocation error:', err),
        );
      }

      // Fetch GeoJSON data on map initialization
      fetchGeoJsonData();

      // Add routes to map
      addRoutesToMap();
    }

    return () => {
      mapObj.current?.setTarget(undefined);
      mapObj.current = null;
    };
  }, []);

  // Add GeoJSON data to map when it's loaded
  useEffect(() => {
    if (geoJsonData && mapObj.current) {
      addGeoJsonToMap();
    }
  }, [geoJsonData]);

  // Change basemap source when selected
  useEffect(() => {
    if (mapObj.current) {
      const baseLayer = mapObj.current.getLayers().item(0) as TileLayer<any>;
      baseLayer.setSource(mapSources[currentMapType]);
    }
  }, [currentMapType]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const getMapTypeDisplayName = (mapType: MapType) => {
    const names: Record<MapType, string> = {
      osm: 'OSM Default',
      openstreet: 'OpenStreet',
      satellite: 'Satellite',
      terrain: 'Terrain',
      dark: 'Dark',
    };
    return names[mapType];
  };

  const refreshData = () => {
    fetchGeoJsonData();
  };

  const closePopup = () => {
    setSelectedFeature(null);
    setPopupPosition(null);
    overlayRef.current?.setPosition(undefined);
  };

  const formatPropertyValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';

    // Handle different data types
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }

    // Format coordinates
    if (
      key.toLowerCase().includes('coord') ||
      key.toLowerCase().includes('lat') ||
      key.toLowerCase().includes('lng') ||
      key.toLowerCase().includes('lon')
    ) {
      if (typeof value === 'number') {
        return value.toFixed(6);
      }
    }

    // Format dates
    if (
      key.toLowerCase().includes('date') ||
      key.toLowerCase().includes('time')
    ) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString();
        }
      } catch {
        // Continue to default formatting
      }
    }

    return String(value);
  };

  const formatPropertyKey = (key: string): string => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <>
      <Breadcrumb pageName="Activities" />

      <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-9">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Route Map: From DayStar Nairobi Campus, Valley Road to DayStar
              Main Campus Athiriver
            </h2>
            {/* {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                Loading data...
              </div>
            )} */}
            {/* {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                Error: {error}
              </div>
            )}
            {geoJsonData && !isLoading && (
              <div className="text-sm text-green-600 dark:text-green-400">
                {geoJsonData.features?.length || 0} places loaded
              </div>
            )} */}
          </div>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '70vh',
          position: 'relative',
          backgroundColor: '#000',
        }}
      >
        {/* Top right buttons */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            padding: '10px',
          }}
        >
          <button
            onClick={toggleFullscreen}
            style={{
              color: '#fff',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>

          <button
            onClick={() => setShowLayersMenu(!showLayersMenu)}
            style={{
              color: '#fff',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {showLayersMenu ? 'Hide Layers' : 'Show Layers'}
          </button>

          {showLayersMenu && (
            <div
              style={{
                background: '#fff',
                padding: '10px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                minWidth: '160px',
              }}
            >
              {/* Base Map Types */}
              <div style={{ marginBottom: '15px' }}>
                <h4
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  Base Map
                </h4>
                {Object.keys(mapSources).map((key) => (
                  <div key={key} style={{ marginBottom: '5px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                      }}
                    >
                      <input
                        type="radio"
                        value={key}
                        checked={currentMapType === key}
                        onChange={() => setCurrentMapType(key as MapType)}
                      />
                      {getMapTypeDisplayName(key as MapType)}
                    </label>
                  </div>
                ))}
              </div>

              {/* Layer Controls */}
              <div
                style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}
              >
                <h4
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  Layers
                </h4>
                <div style={{ marginBottom: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showApiLayer}
                      onChange={(e) => setShowApiLayer(e.target.checked)}
                      style={{ marginRight: '5px' }}
                    />
                    Show API Layer
                  </label>
                </div>

                {/* API Status Indicators */}
                {apiError && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#dc2626',
                      marginTop: '5px',
                    }}
                  >
                    Error: {apiError}
                  </div>
                )}
                {apiDataLoaded && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#16a34a',
                      marginTop: '5px',
                    }}
                  >
                    ✓ API data loaded
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '100%',
          }}
        />

        {/* Popup for feature details */}
        <div
          ref={popupRef}
          style={{
            display: selectedFeature ? 'block' : 'none',
            position: 'absolute',
            background: 'white',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '16px',
            minWidth: '300px',
            maxWidth: '400px',
            maxHeight: '60vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            fontSize: '14px',
            zIndex: 1000,
          }}
        >
          {selectedFeature && (
            <>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '8px',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: '#1f2937',
                    fontSize: '16px',
                    fontWeight: '600',
                    maxWidth: '250px',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedFeature.properties.name ||
                    selectedFeature.properties.title ||
                    selectedFeature.properties.label ||
                    'Place Details'}
                </h3>
                <button
                  onClick={closePopup}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLButtonElement).style.backgroundColor =
                      '#f3f4f6')
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLButtonElement).style.backgroundColor =
                      'transparent')
                  }
                >
                  ×
                </button>
              </div>

              {/* Coordinates */}
              <div
                style={{
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: '#6b7280',
                }}
              >
                <strong>Coordinates:</strong>{' '}
                {selectedFeature.coordinates[1].toFixed(6)},{' '}
                {selectedFeature.coordinates[0].toFixed(6)}
              </div>

              {/* Properties */}
              <div>
                {Object.entries(selectedFeature.properties)
                  .filter(
                    ([key, value]) =>
                      key !== 'name' &&
                      key !== 'title' &&
                      key !== 'label' &&
                      value !== null &&
                      value !== undefined &&
                      value !== '',
                  )
                  .map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        marginBottom: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: '600',
                          color: '#374151',
                          fontSize: '12px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {formatPropertyKey(key)}:
                      </span>
                      <span
                        style={{
                          color: '#6b7280',
                          wordBreak: 'break-word',
                          fontSize: '13px',
                          paddingLeft: '8px',
                          lineHeight: '1.4',
                        }}
                      >
                        {formatPropertyValue(key, value)}
                      </span>
                    </div>
                  ))}

                {Object.keys(selectedFeature.properties).filter(
                  (key) =>
                    key !== 'name' &&
                    key !== 'title' &&
                    key !== 'label' &&
                    selectedFeature.properties[key] !== null &&
                    selectedFeature.properties[key] !== undefined &&
                    selectedFeature.properties[key] !== '',
                ).length === 0 && (
                  <div
                    style={{
                      color: '#6b7280',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      padding: '12px',
                    }}
                  >
                    No additional details available
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default MapComponent;
