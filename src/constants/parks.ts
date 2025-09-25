export type ParkCoordinates = {
  latitude: number;
  longitude: number;
};

export type Park = {
  parkId: string;
  name: string;
  coordinates: ParkCoordinates;
  image: string;
};

export const MONTEREY_COUNTY_DOG_PARKS: Park[] = [
  {
    parkId: 'el-estero-dog-park',
    name: 'El Estero Dog Park',
    coordinates: {
      latitude: 36.597864,
      longitude: -121.888512,
    },
    image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80',
  },
  {
    parkId: 'laguna-grande-dog-park',
    name: 'Laguna Grande Dog Park',
    coordinates: {
      latitude: 36.601378,
      longitude: -121.854984,
    },
    image: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=600&q=80',
  },
  {
    parkId: 'pacific-grove-dog-park',
    name: 'Pacific Grove Dog Park',
    coordinates: {
      latitude: 36.617198,
      longitude: -121.918947,
    },
    image: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?auto=format&fit=crop&w=600&q=80',
  },
  {
    parkId: 'marina-dog-park',
    name: 'Marina Dog Park',
    coordinates: {
      latitude: 36.687965,
      longitude: -121.792315,
    },
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80',
  },
  {
    parkId: 'laurel-west-dog-park',
    name: 'Laurel West Dog Park',
    coordinates: {
      latitude: 36.682742,
      longitude: -121.664738,
    },
    image: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&w=600&q=80',
  },
  {
    parkId: 'natividad-creek-dog-park',
    name: 'Natividad Creek Dog Park',
    coordinates: {
      latitude: 36.714645,
      longitude: -121.617214,
    },
    image: 'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?auto=format&fit=crop&w=600&q=80',
  },
];

export const PARK_LOOKUP = MONTEREY_COUNTY_DOG_PARKS.reduce<Record<string, Park>>((accumulator, park) => {
  accumulator[park.parkId] = park;
  return accumulator;
}, {});

