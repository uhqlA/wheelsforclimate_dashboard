const WaterPoints = {
  type: 'FeatureCollection',
  name: 'county_rest_points',
  crs: {
    type: 'name',
    properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
  },
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'DayStar University Nairobi Campus',
        county: 'Nairobi',
        type: 'Starting Point',
        description: 'Flag-off ceremony,',
      },
      geometry: { type: 'Point', coordinates: [36.8013499, -1.2965247] },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Water Break',
        county: 'Machakos',
        type: 'Mlolongo',
        description: '5 Minutes water break',
      },
      geometry: { type: 'Point', coordinates: [36.9413429, -1.3973817] },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Water Break',
        county: 'Machakos',
        type: 'Athiriver',
        description: '5 Minutes water break',
      },
      geometry: { type: 'Point', coordinates: [36.9878414, -1.4429909] },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Meeting point',
        county: 'Machakos',
        type: 'Athiriver',
        description: 'Meeting point with students leaders',
      },
      geometry: { type: 'Point', coordinates: [37.0396307, -1.4787536] },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Daystar university Athiriver Campus',
        county: 'Machakos',
        type: 'Athiriver',
        description: 'Arrival and other Activities',
      },
      geometry: { type: 'Point', coordinates: [37.0450167, -1.4412216] },
    },
  ],
};

export default WaterPoints;
