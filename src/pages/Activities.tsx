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

interface DailyRecapData {
  id: string;
  latitude: string;
  longitude: string;
  date: string;
  country: string;
  mood_emoji: string;
  distance_covered: string;
  average_speed: string;
  cycling_hours: string;
  breakdowns_encountered: number;
  number_of_breakdowns: number;
  charging_stops: number;
  elevation_gains: number;
  road_quality: number;
  total_people_interacted: number;
  community_events: number;
  women_reached: number;
  youth_reached: number;
  marginalized_persons: number;
  community_feedback_score: number;
  climate_messages: number;
  public_messaging_reach: number;
  audience_questions: number;
  [key: string]: any; // Allow for additional properties
}

interface SelectedFeature {
  properties: DailyRecapData;
  coordinates: [number, number];
  geometry: any;
  source: 'daily-recaps'; // Track the source of the feature
}

const MapComponent: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const vectorLayerRef = useRef<VectorLayer<any> | null>(null);
  const dailyRecapsSourceRef = useRef<VectorSource | null>(null);
  const dailyRecapsLayerRef = useRef<VectorLayer<any> | null>(null);
  const routesSourceRef = useRef<VectorSource | null>(null);
  const routesLayerRef = useRef<VectorLayer<any> | null>(null);
  const overlayRef = useRef<Overlay | null>(null);

  const [currentMapType, setCurrentMapType] = useState<MapType>('osm');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [showDailyRecapsLayer, setShowDailyRecapsLayer] = useState(true);
  const [dailyRecapsData, setDailyRecapsData] = useState<DailyRecapData[]>([]);
  const [isDailyRecapsLoading, setIsDailyRecapsLoading] = useState(false);
  const [dailyRecapsError, setDailyRecapsError] = useState<string | null>(null);
  const [dailyRecapsLoaded, setDailyRecapsLoaded] = useState(false);
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

  // Fetch Daily Recaps data from API
  const fetchDailyRecapsData = async () => {
    setIsDailyRecapsLoading(true);
    setDailyRecapsError(null);
    setDailyRecapsLoaded(false);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/daily-recaps/');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDailyRecapsData(data.results);
      setDailyRecapsLoaded(true);
      console.log('Daily Recaps data loaded:', data.results);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch daily recaps data';
      setDailyRecapsError(errorMessage);
      console.error('Error fetching Daily Recaps data:', err);
    } finally {
      setIsDailyRecapsLoading(false);
    }
  };

  // Add Daily Recaps data to map
  const addDailyRecapsToMap = () => {
    if (!dailyRecapsData || !mapObj.current || !dailyRecapsSourceRef.current)
      return;

    try {
      // Clear existing features
      dailyRecapsSourceRef.current.clear();

      const features = dailyRecapsData
        .map((recap, index) => {
          if (!recap.latitude || !recap.longitude) {
            console.warn(`Daily recap ${index} missing coordinates:`, recap);
            return null;
          }

          const coords = fromLonLat([
            parseFloat(recap.longitude),
            parseFloat(recap.latitude),
          ]);
          const feature = new Feature({
            geometry: new Point(coords),
            ...recap, // Include all recap properties
            dataSource: 'daily-recaps',
            originalIndex: index,
          });

          return feature;
        })
        .filter((feature) => feature !== null);

      // Add features to the source
      dailyRecapsSourceRef.current.addFeatures(features);

      console.log(`Added ${features.length} daily recap features to map`);

      // Fit view to show all features if this is the first time loading
      if (features.length > 0) {
        const extent = dailyRecapsSourceRef.current.getExtent();
        mapObj.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 16,
        });
      }
    } catch (err) {
      console.error('Error adding Daily Recaps to map:', err);
      setDailyRecapsError('Error processing Daily Recaps data');
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

  // Create style for Daily Recaps features
  const createDailyRecapsStyle = () => {
    return new Style({
      image: new CircleStyle({
        radius: 10,
        fill: new Fill({ color: '#FF4500' }), // Orange color
        stroke: new Stroke({ color: '#fff', width: 2 }),
      }),
      text: new Text({
        font: '12px Calibri,sans-serif',
        fill: new Fill({ color: '#000' }),
        stroke: new Stroke({ color: '#fff', width: 3 }),
        offsetY: -30,
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

  // Toggle Daily Recaps layer visibility
  useEffect(() => {
    if (dailyRecapsLayerRef.current) {
      dailyRecapsLayerRef.current.setVisible(showDailyRecapsLayer);
    }
  }, [showDailyRecapsLayer]);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapObj.current && popupRef.current) {
      // Vector source for current location marker
      vectorSourceRef.current = new VectorSource();
      vectorLayerRef.current = new VectorLayer({
        source: vectorSourceRef.current,
      });

      // Vector source for Daily Recaps data
      dailyRecapsSourceRef.current = new VectorSource();
      dailyRecapsLayerRef.current = new VectorLayer({
        source: dailyRecapsSourceRef.current,
        visible: showDailyRecapsLayer,
        style: (feature) => {
          const style = createDailyRecapsStyle();
          // Add feature identifier as text if available
          const text =
            feature.get('date') || `Recap ${feature.get('id') || ''}`;
          if (text) {
            style.getText()?.setText(text.toString());
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
          dailyRecapsLayerRef.current, // Daily Recaps layer
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
            if (dailyRecapsSourceRef.current?.hasFeature(feature)) {
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

          let coordinates: [number, number] = [0, 0];
          if (geometry instanceof Point) {
            const coords = geometry.getCoordinates();
            coordinates = toLonLat(coords) as [number, number];
          }

          setSelectedFeature({
            properties: cleanProperties,
            coordinates,
            geometry: geometry,
            source: 'daily-recaps',
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
            // Don't automatically center on current location if we have other data
            if (!dailyRecapsData.length) {
              mapObj.current?.getView().animate({ center: coords, zoom: 14 });
            }
          },
          (err) => console.error('Geolocation error:', err),
        );
      }

      // Fetch API data on map initialization
      fetchDailyRecapsData();

      // Add routes to map
      addRoutesToMap();
    }

    return () => {
      mapObj.current?.setTarget(undefined);
      mapObj.current = null;
    };
  }, []);

  // Add Daily Recaps data to map when it's loaded
  useEffect(() => {
    if (dailyRecapsData.length > 0 && mapObj.current) {
      addDailyRecapsToMap();
    }
  }, [dailyRecapsData]);

  // Fit map to show all data when dataset is loaded
  useEffect(() => {
    if (mapObj.current && dailyRecapsData.length > 0) {
      const extent = dailyRecapsSourceRef.current?.getExtent();
      if (extent) {
        mapObj.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 16,
        });
      }
    }
  }, [dailyRecapsData]);

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
    fetchDailyRecapsData();
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

  // Function to render data cards for the selected feature
  const renderDataCards = () => {
    if (!selectedFeature) return null;

    const recap = selectedFeature.properties;
    const metrics = [
      {
        title: 'Cycling Metrics',
        items: [
          { label: 'Distance Covered (km)', value: recap.distance_covered },
          { label: 'Average Speed (km/h)', value: recap.average_speed },
          { label: 'Cycling Hours', value: recap.cycling_hours },
          { label: 'Elevation Gains', value: recap.elevation_gains },
          { label: 'Road Quality (1-5)', value: recap.road_quality },
        ],
      },
      {
        title: 'Community Engagement',
        items: [
          { label: 'People Interacted', value: recap.total_people_interacted },
          { label: 'Community Events', value: recap.community_events },
          { label: 'Women Reached', value: recap.women_reached },
          { label: 'Youth Reached', value: recap.youth_reached },
          { label: 'Marginalized Persons', value: recap.marginalized_persons },
          {
            label: 'Feedback Score (1-5)',
            value: recap.community_feedback_score,
          },
        ],
      },
      {
        title: 'Climate Messaging',
        items: [
          { label: 'Climate Messages', value: recap.climate_messages },
          {
            label: 'Public Messaging Reach',
            value: recap.public_messaging_reach,
          },
          { label: 'Audience Questions', value: recap.audience_questions },
        ],
      },
      {
        title: 'Equipment & Logistics',
        items: [
          {
            label: 'Breakdowns Encountered',
            value: recap.breakdowns_encountered,
          },
          { label: 'Number of Breakdowns', value: recap.number_of_breakdowns },
          { label: 'Charging Stops', value: recap.charging_stops },
        ],
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
          >
            <h4 className="font-bold text-lg mb-2 text-blue-600 dark:text-blue-400">
              {metric.title}
            </h4>
            <div className="space-y-2">
              {metric.items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    {item.label}:
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {item.value || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
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
            {isDailyRecapsLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                Loading data...
              </div>
            )}
            {dailyRecapsData.length > 0 && !isDailyRecapsLoading && (
              <div className="text-sm text-green-600 dark:text-green-400">
                {dailyRecapsData.length} locations loaded
              </div>
            )}
          </div>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
            disabled={isDailyRecapsLoading}
          >
            {isDailyRecapsLoading ? 'Loading...' : 'Refresh Data'}
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
                minWidth: '200px',
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
                  Data Layers
                </h4>

                {/* Daily Recaps Layer */}
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
                      checked={showDailyRecapsLayer}
                      onChange={(e) =>
                        setShowDailyRecapsLayer(e.target.checked)
                      }
                    />
                    Daily Recaps
                    <span
                      style={{
                        backgroundColor: '#FF4500',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: '1px solid #fff',
                      }}
                    ></span>
                  </label>
                </div>

                {/* Status Indicators */}
                <div style={{ marginTop: '10px', fontSize: '12px' }}>
                  {dailyRecapsError && (
                    <div style={{ color: '#dc2626', marginBottom: '5px' }}>
                      Daily Recaps Error: {dailyRecapsError}
                    </div>
                  )}
                  {dailyRecapsLoaded && (
                    <div style={{ color: '#16a34a' }}>
                      ✓ Daily Recaps loaded ({dailyRecapsData.length})
                    </div>
                  )}
                </div>
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
            border: '2px solid #FF4500',
            borderRadius: '8px',
            padding: '16px',
            minWidth: '300px',
            maxWidth: '600px',
            maxHeight: '80vh',
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
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: '#1f2937',
                      fontSize: '18px',
                      fontWeight: '600',
                      maxWidth: '250px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {selectedFeature.properties.date} -{' '}
                    {selectedFeature.properties.country}
                  </h3>
                  <div
                    style={{
                      fontSize: '24px',
                      marginTop: '4px',
                    }}
                  >
                    {selectedFeature.properties.mood_emoji}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#FF4500',
                      fontWeight: '500',
                      marginTop: '2px',
                    }}
                  >
                    Daily Recap
                  </div>
                </div>
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

              {/* Data Cards */}
              {renderDataCards()}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default MapComponent;
