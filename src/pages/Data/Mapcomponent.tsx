import { useEffect } from 'react';
import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import routesGeoJSON from '../../components/Maps/routes'; // ✅ your data file

function MapComponent() {
  useEffect(() => {
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(routesGeoJSON, {
        featureProjection: 'EPSG:3857',
      }),
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    new Map({
      target: 'map',
      layers: [new TileLayer({ source: new OSM() }), vectorLayer],
      view: new View({
        center: [1610000, -2500000],
        zoom: 5,
      }),
    });
  }, []);

  return <div id="map" style={{ width: '100%', height: '100vh' }} />;
}

export default MapComponent;
