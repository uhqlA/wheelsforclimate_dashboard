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
  id?: string;
  date: string;
  country: string;
  latitude: number;
  longitude: number;
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
  educational_media: number;
  interviews: number;
  photos_videos: number;
  visible_emissions: number;
  plastic_hotspots: number;
  nature_sites: number;
  climate_innovations: number;
  ebikes_in_use: number;
  power_station_eb70: number;
  power_station_ac180p: number;
  power_station_pv350: number;
  power_station_p200_75w: number;
  charging_mode: string[];
  average_battery_use: string;
  equipment_breakdowns: boolean;
  equipment_breakdown_count: number;
  riders_today: number;
  team_health_score: number;
  hydration_check: string;
  injuries_accidents: boolean;
  injury_description: string;
  team_mood: number;
  instagram_posts: number;
  tiktok_videos: number;
  linkedin_mentions: number;
  newsletter_mentions: boolean;
  media_contacts: number;
  [key: string]: any;
}

interface SelectedFeature {
  properties: { [key: string]: any };
  coordinates: [number, number];
  geometry: any;
}

interface StatsData {
  total_recaps: number;
  total_distance: number;
  avg_speed: number;
  total_people_reached: number;
  total_women_reached: number;
  total_youth_reached: number;
  avg_team_mood: number;
  avg_road_quality: number;
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
  const [stats, setStats] = useState<StatsData | null>(null);

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
      // Handle paginated response
      const results = data.results || data;
      setDailyRecapsData(Array.isArray(results) ? results : []);
      setDailyRecapsLoaded(true);
      console.log('Daily Recaps data loaded:', results);
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

  // Fetch statistics data
  const fetchStats = async () => {
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/daily-recaps/stats/',
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const statsData = await response.json();
      setStats(statsData);
      console.log('Stats data loaded:', statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
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

          const coords = fromLonLat([recap.longitude, recap.latitude]);
          const feature = new Feature({
            geometry: new Point(coords),
            ...recap,
            originalIndex: index,
          });

          return feature;
        })
        .filter((feature) => feature !== null);

      // Add features to the source
      dailyRecapsSourceRef.current.addFeatures(features);

      console.log(`Added ${features.length} daily recap features to map`);

      // Fit view to show all features
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
              color: '#3B82F6',
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
        radius: 12,
        fill: new Fill({ color: '#FF4500' }),
        stroke: new Stroke({ color: '#fff', width: 3 }),
      }),
      text: new Text({
        font: '12px Calibri,sans-serif',
        fill: new Fill({ color: '#000' }),
        stroke: new Stroke({ color: '#fff', width: 3 }),
        offsetY: -35,
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
          const text = `${feature.get('country')} - ${feature.get('date')}`;
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
          routesLayerRef.current,
          dailyRecapsLayerRef.current,
          vectorLayerRef.current,
        ],
        overlays: [overlayRef.current],
        view: new View({
          center: fromLonLat([36.8219, -1.2921]),
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

          let coordinates: [number, number];

          if (geometry instanceof Point) {
            const coords = geometry.getCoordinates();
            coordinates = toLonLat(coords) as [number, number];
          } else {
            coordinates = [0, 0];
          }

          setSelectedFeature({
            properties: cleanProperties,
            coordinates,
            geometry: geometry,
          });

          setPopupPosition(event.coordinate);
          overlayRef.current?.setPosition(event.coordinate);
        } else {
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
                  src: 'https://cdn-icons-png.flaticon.com/512/2362/2362465.png',
                  scale: 0.1,
                }),
              }),
            );

            vectorSourceRef.current?.addFeature(marker);
          },
          (err) => console.error('Geolocation error:', err),
        );
      }

      // Fetch data on map initialization
      fetchDailyRecapsData();
      fetchStats();
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
    fetchStats();
  };

  const closePopup = () => {
    setSelectedFeature(null);
    setPopupPosition(null);
    overlayRef.current?.setPosition(undefined);
  };

  const formatPropertyValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }

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

    if (
      key.toLowerCase().includes('date') ||
      key.toLowerCase().includes('time')
    ) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
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

  const getMoodEmoji = (mood: number): string => {
    const moodMap: { [key: number]: string } = {
      0: '😩',
      1: '😐',
      2: '🙂',
      3: '😄',
      4: '😍',
    };
    return moodMap[mood] || '😐';
  };

  // Stats Cards Component
  const StatsCards = () => {
    const cardData = [
      {
        title: 'Distance Covered',
        value: stats?.total_distance
          ? `${stats.total_distance.toFixed(1)} km`
          : '0 km',
        icon: '🚴‍♂️',
        color: 'bg-blue-500',
      },
      {
        title: 'Average Speed',
        value: stats?.avg_speed
          ? `${stats.avg_speed.toFixed(1)} km/h`
          : '0 km/h',
        icon: '⚡',
        color: 'bg-green-500',
      },
      {
        title: 'People Reached',
        value: stats?.total_people_reached || 0,
        icon: '👥',
        color: 'bg-purple-500',
      },
      {
        title: 'Women Reached',
        value: stats?.total_women_reached || 0,
        icon: '👩',
        color: 'bg-pink-500',
      },
      {
        title: 'Youth Reached',
        value: stats?.total_youth_reached || 0,
        icon: '🧑‍🎓',
        color: 'bg-yellow-500',
      },
      {
        title: 'Road Quality',
        value: stats?.avg_road_quality
          ? `${stats.avg_road_quality.toFixed(1)}/5`
          : '0/5',
        icon: '🛣️',
        color: 'bg-orange-500',
      },
      {
        title: 'Team Mood',
        value: stats?.avg_team_mood
          ? getMoodEmoji(Math.round(stats.avg_team_mood))
          : '😐',
        icon: '🎭',
        color: 'bg-indigo-500',
      },
      {
        title: 'Total Recaps',
        value: stats?.total_recaps || 0,
        icon: '📝',
        color: 'bg-red-500',
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cardData.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-4 border border-gray-200 dark:bg-boxdark dark:border-strokedark"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {card.value}
                </p>
              </div>
              <div
                className={`${card.color} text-white p-3 rounded-full text-xl`}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Breadcrumb pageName="Daily Recaps Map" />

      <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-9">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Daily Recaps Tracking Map
            </h2>
            {isDailyRecapsLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                Loading data...
              </div>
            )}
            {dailyRecapsData.length > 0 && !isDailyRecapsLoading && (
              <div className="text-sm text-green-600 dark:text-green-400">
                {dailyRecapsData.length} recaps loaded
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

        {/* Stats Cards */}
        <StatsCards />

        {/* Error Display */}
        {dailyRecapsError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {dailyRecapsError}
          </div>
        )}
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
                      Error: {dailyRecapsError}
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
                <div>
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
                    {selectedFeature.properties.country} -{' '}
                    {selectedFeature.properties.date}
                  </h3>
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

              {/* Key Metrics */}
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}
                >
                  Key Metrics
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Distance:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.distance_covered || 'N/A'} km
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Speed:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.average_speed || 'N/A'} km/h
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Cycling Hours:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.cycling_hours || 'N/A'} h
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Road Quality:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.road_quality || 'N/A'}/5
                    </span>
                  </div>
                </div>
              </div>

              {/* Community Engagement */}
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}
                >
                  Community Engagement
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      People Reached:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.total_people_interacted ||
                        'N/A'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Women Reached:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.women_reached || 'N/A'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Youth Reached:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.youth_reached || 'N/A'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Events:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.community_events || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Climate & Awareness */}
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}
                >
                  Climate & Awareness
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Climate Messages:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.climate_messages || 'N/A'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Public Reach:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.public_messaging_reach ||
                        'N/A'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Questions:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.audience_questions || 'N/A'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Feedback Score:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.community_feedback_score ||
                        'N/A'}
                      /5
                    </span>
                  </div>
                </div>
              </div>

              {/* Team Status */}
              <div style={{ marginBottom: '16px' }}>
                <h4
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}
                >
                  Team Status
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Riders:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.riders_today || 'N/A'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Team Mood:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937', fontSize: '16px' }}>
                      {selectedFeature.properties.team_mood !== undefined
                        ? getMoodEmoji(selectedFeature.properties.team_mood)
                        : '😐'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Health Score:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.team_health_score || 'N/A'}/5
                    </span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>
                      Breakdowns:
                    </span>
                    <br />
                    <span style={{ color: '#1f2937' }}>
                      {selectedFeature.properties.breakdowns_encountered || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <h4
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                  }}
                >
                  Additional Details
                </h4>
                {Object.entries(selectedFeature.properties)
                  .filter(
                    ([key, value]) =>
                      ![
                        'date',
                        'country',
                        'latitude',
                        'longitude',
                        'originalIndex',
                        'distance_covered',
                        'average_speed',
                        'cycling_hours',
                        'road_quality',
                        'total_people_interacted',
                        'women_reached',
                        'youth_reached',
                        'community_events',
                        'climate_messages',
                        'public_messaging_reach',
                        'audience_questions',
                        'community_feedback_score',
                        'riders_today',
                        'team_mood',
                        'team_health_score',
                        'breakdowns_encountered',
                      ].includes(key) &&
                      value !== null &&
                      value !== undefined &&
                      value !== '',
                  )
                  .slice(0, 5) // Limit to 5 additional properties
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
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default MapComponent;
