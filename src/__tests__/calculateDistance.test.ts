// Test the haversine distance calculation used for park proximity checks.
// The function is inlined in CheckInScreen, so we extract and test the logic directly.

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const calculateDistanceInMeters = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) => {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);

  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
};

describe('calculateDistanceInMeters', () => {
  it('returns 0 for the same point', () => {
    const point = { latitude: 36.6, longitude: -121.9 };
    expect(calculateDistanceInMeters(point, point)).toBe(0);
  });

  it('returns roughly correct distance for known points', () => {
    // Monterey to Carmel is ~8 km
    const monterey = { latitude: 36.6002, longitude: -121.8947 };
    const carmel = { latitude: 36.5552, longitude: -121.9233 };
    const distance = calculateDistanceInMeters(monterey, carmel);
    expect(distance).toBeGreaterThan(4000);
    expect(distance).toBeLessThan(10000);
  });

  it('returns a small distance for nearby points (within park radius)', () => {
    const center = { latitude: 36.6002, longitude: -121.8947 };
    const nearby = { latitude: 36.6003, longitude: -121.8948 };
    const distance = calculateDistanceInMeters(center, nearby);
    expect(distance).toBeLessThan(200);
  });
});
