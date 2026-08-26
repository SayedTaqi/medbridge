export async function geocodeAddress(address: string) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('Google Maps API key is not configured');
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`);
  if (!response.ok) throw new Error(`Google Maps request failed: ${response.status}`);
  const data = await response.json() as any;
  const location = data.results?.[0]?.geometry?.location;
  if (!location) throw new Error('Address could not be geocoded');
  return { lat: location.lat as number, lng: location.lng as number };
}
