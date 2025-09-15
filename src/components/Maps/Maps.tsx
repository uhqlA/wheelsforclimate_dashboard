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
// import Breadcrumb from '../Breadcrumbs/Breadcrumb';

import routesGeoJSON from './routes'; // Adjust path as necessary
import county_routes from './county_routes'; // Add this import for the county routes data

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
  const countyRoutesSourceRef = useRef<VectorSource | null>(null);
  const countyRoutesLayerRef = useRef<VectorLayer<any> | null>(null);
  const overlayRef = useRef<Overlay | null>(null);

  // New refs for geolocation tracking
  const geolocationWatchIdRef = useRef<number | null>(null);
  const currentLocationFeatureRef = useRef<Feature | null>(null);
  const accuracyFeatureRef = useRef<Feature | null>(null);

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

  // New states for geolocation
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lon: number;
    accuracy: number;
  } | null>(null);

  // Define base map sources
  const mapSources = {
    osm: new OSM(),
    openstreet: new XYZ({
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    }),
    satellite: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    }),
    // terrain: new XYZ({
    //   url: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
    //   attributions:
    //     'Map tiles by <a href="http://stamen.com">Stamen Design</a>, ' +
    //     '<a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    // }),
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
          maxZoom: 26,
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
              width: 3,
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

  // Add county routes to map
  const addCountyRoutesToMap = () => {
    if (!county_routes || !mapObj.current || !countyRoutesSourceRef.current)
      return;

    try {
      const format = new GeoJSON();
      const countyRouteFeatures = format.readFeatures(county_routes, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4326',
      });

      // Clear existing county route features
      countyRoutesSourceRef.current.clear();

      // Style each county route feature
      countyRouteFeatures.forEach((feature) => {
        const featureType = feature.get('type');
        let style;

        if (featureType === 'starting_point') {
          style = new Style({
            image: new CircleStyle({
              radius: 10,
              fill: new Fill({ color: '#00ff00' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
            }),
            text: new Text({
              font: '12px Calibri,sans-serif',
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 3 }),
              offsetY: -25,
            }),
          });
        } else {
          style = new Style({
            image: new CircleStyle({
              radius: 8,
              fill: new Fill({ color: '#ff6600' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
            }),
            text: new Text({
              font: '12px Calibri,sans-serif',
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 3 }),
              offsetY: -25,
            }),
          });
        }

        // Add feature name as text if available
        const name = feature.get('name') || '';
        if (name) {
          style.getText()?.setText(name);
        }

        feature.setStyle(style);
      });

      // Add county route features
      countyRoutesSourceRef.current.addFeatures(countyRouteFeatures);

      console.log(
        `Added ${countyRouteFeatures.length} county route features to map`,
      );
    } catch (err) {
      console.error('Error adding county routes to map:', err);
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

  // NEW: Start location tracking
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationError(null);
    setIsTrackingLocation(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000, // Allow cached position for 1 second
    };

    const success = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      const coords = fromLonLat([longitude, latitude]);

      // Update current location state
      setCurrentLocation({
        lat: latitude,
        lon: longitude,
        accuracy: accuracy,
      });

      if (!vectorSourceRef.current) return;

      // Remove existing location features
      if (currentLocationFeatureRef.current) {
        vectorSourceRef.current.removeFeature(
          currentLocationFeatureRef.current,
        );
      }
      if (accuracyFeatureRef.current) {
        vectorSourceRef.current.removeFeature(accuracyFeatureRef.current);
      }

      // Create accuracy circle (shows GPS accuracy radius)
      const accuracyFeature = new Feature({
        geometry: new Point(coords),
        type: 'accuracy',
      });

      accuracyFeature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: Math.min(accuracy / 10, 50), // Scale accuracy to pixel radius
            fill: new Fill({
              color: 'rgba(59, 130, 246, 0.1)', // Light blue with transparency
            }),
            stroke: new Stroke({
              color: 'rgba(59, 130, 246, 0.3)',
              width: 1,
            }),
          }),
        }),
      );

      // Create current location marker
      const locationFeature = new Feature({
        geometry: new Point(coords),
        type: 'currentLocation',
        accuracy: accuracy,
        timestamp: new Date().toISOString(),
      });

      locationFeature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: '#3b82f6' }), // Blue color
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
          }),
        }),
      );

      // Add features to map
      vectorSourceRef.current.addFeature(accuracyFeature);
      vectorSourceRef.current.addFeature(locationFeature);

      // Store references
      accuracyFeatureRef.current = accuracyFeature;
      currentLocationFeatureRef.current = locationFeature;

      console.log(
        `Location updated: ${latitude.toFixed(6)}, ${longitude.toFixed(
          6,
        )} (±${accuracy.toFixed(0)}m)`,
      );
    };

    const error = (err: GeolocationPositionError) => {
      let errorMessage = 'Unknown location error';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location access denied by user';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable';
          break;
        case err.TIMEOUT:
          errorMessage = 'Location request timed out';
          break;
      }
      setLocationError(errorMessage);
      console.error('Geolocation error:', errorMessage);
    };

    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      success,
      error,
      options,
    );
    geolocationWatchIdRef.current = watchId;
  };

  // NEW: Stop location tracking
  const stopLocationTracking = () => {
    if (geolocationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
      geolocationWatchIdRef.current = null;
    }

    // Remove location features from map
    if (vectorSourceRef.current) {
      if (currentLocationFeatureRef.current) {
        vectorSourceRef.current.removeFeature(
          currentLocationFeatureRef.current,
        );
        currentLocationFeatureRef.current = null;
      }
      if (accuracyFeatureRef.current) {
        vectorSourceRef.current.removeFeature(accuracyFeatureRef.current);
        accuracyFeatureRef.current = null;
      }
    }

    setIsTrackingLocation(false);
    setCurrentLocation(null);
    setLocationError(null);
  };

  // NEW: Center map on current location
  const centerOnCurrentLocation = () => {
    if (currentLocation && mapObj.current) {
      const coords = fromLonLat([currentLocation.lon, currentLocation.lat]);
      mapObj.current.getView().animate({
        center: coords,
        zoom: 17,
        duration: 1000,
      });
    }
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

  // Clean up geolocation on unmount
  useEffect(() => {
    return () => {
      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
      }
    };
  }, []);

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

      // Vector source for county routes
      countyRoutesSourceRef.current = new VectorSource();
      countyRoutesLayerRef.current = new VectorLayer({
        source: countyRoutesSourceRef.current,
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
          countyRoutesLayerRef.current, // County routes layer
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
            // Handle GeoJSON features and county routes features, but not current location
            if (
              feature.get('type') === 'currentLocation' ||
              feature.get('type') === 'accuracy'
            ) {
              return null;
            }
            if (
              geoJsonSourceRef.current?.hasFeature(feature) ||
              countyRoutesSourceRef.current?.hasFeature(feature)
            ) {
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

      // Request current location (one-time)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lon = position.coords.longitude;
            const lat = position.coords.latitude;
            const coords = fromLonLat([lon, lat]);

            const marker = new Feature({
              geometry: new Point(coords),
              type: 'initialLocation',
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
            // Don't automatically center on current location if we have GeoJSON data
            if (!geoJsonData) {
              mapObj.current?.getView().animate({ center: coords, zoom: 17 });
            }
          },
          (err) => console.error('Geolocation error:', err),
        );
      }

      // Fetch GeoJSON data on map initialization
      fetchGeoJsonData();

      // Add routes to map
      addRoutesToMap();

      // Add county routes to map
      addCountyRoutesToMap();
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
      {/* <Breadcrumb pageName="Activities" /> */}

      <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-9">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              Places Map: Click on the point to know where you are
            </h2>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                Loading data...
              </div>
            )}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                Error: {error}
              </div>
            )}
            {geoJsonData && !isLoading && (
              <div className="text-sm text-green-600 dark:text-green-400">
                {geoJsonData.features?.length || 0} places loaded
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* NEW: Location tracking controls */}
            {!isTrackingLocation ? (
              <button
                onClick={startLocationTracking}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
              >
                Start Tracking
              </button>
            ) : (
              <>
                <button
                  onClick={centerOnCurrentLocation}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
                  disabled={!currentLocation}
                >
                  Center on Me
                </button>
                <button
                  onClick={stopLocationTracking}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm transition-colors"
                >
                  Stop Tracking
                </button>
              </>
            )}
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* NEW: Location status display */}
        {(isTrackingLocation || locationError || currentLocation) && (
          <div className="mb-4 p-3 rounded-md border">
            {isTrackingLocation && currentLocation && (
              <div className="text-sm text-green-600 dark:text-green-400">
                📍 Location: {currentLocation.lat.toFixed(6)},{' '}
                {currentLocation.lon.toFixed(6)}
                (±{currentLocation.accuracy.toFixed(0)}m accuracy)
              </div>
            )}
            {isTrackingLocation && !currentLocation && (
              <div className="text-sm text-blue-600 dark:text-blue-400">
                🔍 Searching for your location...
              </div>
            )}
            {locationError && (
              <div className="text-sm text-red-600 dark:text-red-400">
                ⚠️ Location Error: {locationError}
              </div>
            )}
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
                    Show Data Layer
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
                    ✓ Data loaded
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
                      key !== 'type' &&
                      key !== 'accuracy' &&
                      key !== 'timestamp' &&
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
                    key !== 'type' &&
                    key !== 'accuracy' &&
                    key !== 'timestamp' &&
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
