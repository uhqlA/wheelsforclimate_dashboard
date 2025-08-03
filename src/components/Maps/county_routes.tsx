const county_routes = {
  type: 'FeatureCollection',
  name: 'County Routes Kenya Cycling Tour',
  crs: {
    type: 'name',
    properties: {
      name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
    },
  },
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Ngong Road Forest Sanctuary',
        county: 'Nairobi',
        type: 'starting_point',
        day: 'Day 1',
        description: 'Flag-off ceremony, youth group engagement',
        elevation: '1700m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.7833, -1.3167],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Konza Technopolis',
        county: 'Nairobi/Machakos',
        type: 'waypoint',
        day: 'Day 2',
        description: 'Discussion on urban planning at Konza',
        elevation: '1600m',
      },
      geometry: {
        type: 'Point',
        coordinates: [37.18514, -1.68895],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Bomas of Kenya',
        county: 'Nairobi',
        type: 'waypoint',
        day: 'Day 1',
        description: 'Cultural site along the route',
        elevation: '1650m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.7333, -1.3667],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Kiserian',
        county: 'Nairobi',
        type: 'waypoint',
        day: 'Day 1-2',
        description: 'Remote location along Kiserian-Isinya Road',
        elevation: '1500m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.6833, -1.4167],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Machakos Town',
        county: 'Machakos',
        type: 'waypoint',
        day: 'Day 3',
        description: 'Resupply point, county government meeting',
        elevation: '1500m',
      },
      geometry: {
        type: 'Point',
        coordinates: [37.2667, -1.5167],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Mwala',
        county: 'Machakos',
        type: 'waypoint',
        day: 'Day 3',
        description: 'Documenting drought and water scarcity stories',
        elevation: '1300m',
      },
      geometry: {
        type: 'Point',
        coordinates: [37.4333, -1.45],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Kabaa',
        county: 'Machakos',
        type: 'waypoint',
        day: 'Day 3',
        description: 'Rural community engagement',
        elevation: '1250m',
      },
      geometry: {
        type: 'Point',
        coordinates: [37.5, -1.4],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Thika',
        county: 'Kiambu',
        type: 'waypoint',
        day: 'Day 5',
        description: 'Route through industrial town',
        elevation: '1500m',
      },
      geometry: {
        type: 'Point',
        coordinates: [37.0833, -1.0333],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Juja',
        county: 'Kiambu',
        type: 'waypoint',
        day: 'Day 5',
        description: 'Backroads route waypoint',
        elevation: '1450m',
      },
      geometry: {
        type: 'Point',
        coordinates: [37.0167, -1.1],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Ruiru',
        county: 'Kiambu',
        type: 'waypoint',
        day: 'Day 5',
        description: 'Route through suburban area',
        elevation: '1500m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.9667, -1.15],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Kiambu Town',
        county: 'Kiambu',
        type: 'waypoint',
        day: 'Day 5',
        description: 'Resupply point',
        elevation: '1720m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.8333, -1.1667],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Githunguri',
        county: 'Kiambu',
        type: 'waypoint',
        day: 'Day 6',
        description: 'Engaging with coffee and tea farmers',
        elevation: '1800m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.7333, -0.9833],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Ikinu',
        county: 'Kiambu',
        type: 'waypoint',
        day: 'Day 6',
        description: 'Rural farming community',
        elevation: '1900m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.7, -0.95],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Limuru',
        county: 'Kiambu',
        type: 'waypoint',
        day: 'Day 6',
        description: 'Tea plantations, resupply point',
        elevation: '2000m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.6333, -1.1],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Gatura',
        county: "Murang'a",
        type: 'waypoint',
        day: 'Day 7',
        description: 'Backroads through rural area',
        elevation: '1650m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.9, -0.85],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Kangema',
        county: "Murang'a",
        type: 'waypoint',
        day: 'Day 7',
        description: 'Documenting soil erosion and landslides',
        elevation: '1800m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.9667, -0.6833],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Maragua River Basin',
        county: "Murang'a",
        type: 'waypoint',
        day: 'Day 7',
        description: 'River conservation groups engagement',
        elevation: '1600m',
      },
      geometry: {
        type: 'Point',
        coordinates: [37.0, -0.8],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: "Murang'a Town",
        county: "Murang'a",
        type: 'waypoint',
        day: 'Day 8',
        description:
          'Rest day, bike maintenance, media, county government meeting',
        elevation: '1450m',
      },
      geometry: {
        type: 'Point',
        coordinates: [37.15, -0.7167],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Kinangop Plateau',
        county: 'Nakuru',
        type: 'waypoint',
        day: 'Day 9',
        description: 'High altitude plateau crossing',
        elevation: '2400m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.55, -0.65],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Naivasha Town',
        county: 'Nakuru',
        type: 'waypoint',
        day: 'Day 9',
        description: 'Lake town, route waypoint',
        elevation: '1890m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.4333, -0.7167],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Nakuru Town',
        county: 'Nakuru',
        type: 'waypoint',
        day: 'Day 10',
        description: 'Final resupply point',
        elevation: '1850m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.08, -0.3031],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Lake Nakuru',
        county: 'Nakuru',
        type: 'waypoint',
        day: 'Day 10-14',
        description: 'Documenting effects on wildlife and tourism',
        elevation: '1759m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.0833, -0.3667],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'Lake Bogoria',
        county: 'Nakuru',
        type: 'waypoint',
        day: 'Day 11-14',
        description: 'Endorois community engagement, lake level documentation',
        elevation: '990m',
      },
      geometry: {
        type: 'Point',
        coordinates: [36.1, 0.2667],
      },
    },
  ],
};

export default county_routes;
