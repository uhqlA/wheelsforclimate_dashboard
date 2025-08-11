import React, { useRef, useEffect, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Style, Icon } from 'ol/style';

type MapType = 'osm' | 'openstreet' | 'satellite' | 'terrain' | 'dark';

const MapComponent: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const vectorLayerRef = useRef<VectorLayer<any> | null>(null);

  const [currentMapType, setCurrentMapType] = useState<MapType>('osm');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);

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

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapObj.current) {
      vectorSourceRef.current = new VectorSource();
      vectorLayerRef.current = new VectorLayer({
        source: vectorSourceRef.current,
      });

      mapObj.current = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({ source: mapSources[currentMapType] }),
          vectorLayerRef.current,
        ],
        view: new View({
          center: fromLonLat([36.8219, -1.2921]), // Default center (Nairobi)
          zoom: 10,
        }),
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
                  src: 'https://cdn-icons-png.flaticon.com/512/64/64113.png',
                  scale: 0.05,
                }),
              }),
            );

            vectorSourceRef.current?.addFeature(marker);
            mapObj.current?.getView().animate({ center: coords, zoom: 14 });
          },
          (err) => console.error('Geolocation error:', err),
        );
      }
    }

    return () => {
      mapObj.current?.setTarget(undefined);
      mapObj.current = null;
    };
  }, []);

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

  return (
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
          //   color: '#fff',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
      >
        <button onClick={toggleFullscreen}>
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>

        <button onClick={() => setShowLayersMenu(!showLayersMenu)}>
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
            {Object.keys(mapSources).map((key) => (
              <div key={key}>
                <label>
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
    </div>
  );
};

export default MapComponent;
