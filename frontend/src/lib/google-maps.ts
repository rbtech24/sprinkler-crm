// Google Maps Integration Service
// This service provides location-based features for client and site management

// Declare global types for Google Maps
declare global {
  interface Window {
    google: typeof google;
  }
}

interface Location {
  lat: number;
  lng: number;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

interface MapConfig {
  apiKey: string;
  defaultCenter: Location;
  defaultZoom: number;
}

class GoogleMapsService {
  private apiKey: string;
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Load Google Maps API
  async loadGoogleMaps(): Promise<void> {
    if (this.isLoaded) return;
    
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google Maps can only be loaded in browser environment'));
        return;
      }

      if (window.google?.maps) {
        this.isLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  // Geocode address to coordinates
  async geocodeAddress(address: string): Promise<Location | null> {
    await this.loadGoogleMaps();
    
    return new Promise((resolve) => {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ address }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          console.error('Geocoding failed:', status);
          resolve(null);
        }
      });
    });
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(location: Location): Promise<Address | null> {
    await this.loadGoogleMaps();
    
    return new Promise((resolve) => {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ location }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const addressComponents = results[0].address_components;
          const address = this.parseAddressComponents(addressComponents);
          resolve(address);
        } else {
          console.error('Reverse geocoding failed:', status);
          resolve(null);
        }
      });
    });
  }

  // Calculate distance between two locations
  async calculateDistance(from: Location, to: Location): Promise<number> {
    await this.loadGoogleMaps();
    
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(from.lat, from.lng),
      new google.maps.LatLng(to.lat, to.lng)
    );
    
    // Return distance in miles
    return distance * 0.000621371;
  }

  // Get route between locations
  async getRoute(from: Location, to: Location, waypoints: Location[] = []): Promise<google.maps.DirectionsResult | null> {
    await this.loadGoogleMaps();
    
    return new Promise((resolve, reject) => {
      const directionsService = new google.maps.DirectionsService();
      
      const waypointData = waypoints.map(point => ({
        location: new google.maps.LatLng(point.lat, point.lng),
        stopover: true
      }));

      directionsService.route({
        origin: new google.maps.LatLng(from.lat, from.lng),
        destination: new google.maps.LatLng(to.lat, to.lng),
        waypoints: waypointData,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING
      }, (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
        if (status === google.maps.DirectionsStatus.OK) {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  // Create autocomplete input
  createAutocomplete(inputElement: HTMLInputElement, options: google.maps.places.AutocompleteOptions = {}): google.maps.places.Autocomplete {
    if (!this.isLoaded) {
      throw new Error('Google Maps API not loaded');
    }

    const defaultOptions = {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'geometry', 'formatted_address']
    };

    return new google.maps.places.Autocomplete(inputElement, { ...defaultOptions, ...options });
  }

  // Parse address components from Google response
  private parseAddressComponents(components: google.maps.GeocoderAddressComponent[]): Address {
    const address: Partial<Address> = {};
    
    components.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        address.street = component.long_name + ' ' + (address.street || '');
      } else if (types.includes('route')) {
        address.street = (address.street || '') + component.long_name;
      } else if (types.includes('locality')) {
        address.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        address.state = component.short_name;
      } else if (types.includes('postal_code')) {
        address.zipCode = component.long_name;
      } else if (types.includes('country')) {
        address.country = component.long_name;
      }
    });
    
    return address as Address;
  }

  // Get nearby places (for finding nearby clients/sites)
  async getNearbyPlaces(location: Location, radius: number = 5000, type: string = 'establishment'): Promise<google.maps.places.PlaceResult[]> {
    await this.loadGoogleMaps();
    
    return new Promise((resolve, reject) => {
      const map = new google.maps.Map(document.createElement('div'));
      const service = new google.maps.places.PlacesService(map);
      
      service.nearbySearch({
        location: new google.maps.LatLng(location.lat, location.lng),
        radius,
        type: type as any
      }, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          resolve(results || []);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  // Create a map instance
  createMap(container: HTMLElement, options: google.maps.MapOptions): google.maps.Map {
    if (!this.isLoaded) {
      throw new Error('Google Maps API not loaded');
    }

    return new google.maps.Map(container, options);
  }

  // Add marker to map
  addMarker(map: google.maps.Map, location: Location, options: google.maps.MarkerOptions = {}): google.maps.Marker {
    return new google.maps.Marker({
      position: location,
      map,
      ...options
    });
  }

  // Optimize route for multiple stops (TSP solver)
  async optimizeRoute(startLocation: Location, stops: Location[], endLocation?: Location): Promise<Location[]> {
    const waypoints = [...stops];
    const destination = endLocation || startLocation;
    
    try {
      const route = await this.getRoute(startLocation, destination, waypoints);
      
      if (route && route.routes[0]?.waypoint_order) {
        const optimizedOrder = route.routes[0].waypoint_order;
        return optimizedOrder.map((index: number) => stops[index]);
      }
      
      return stops;
    } catch (error) {
      console.error('Route optimization failed:', error);
      return stops;
    }
  }
}

// Export singleton instance
let mapsService: GoogleMapsService | null = null;

export const initializeGoogleMaps = (apiKey: string): GoogleMapsService => {
  if (!mapsService) {
    mapsService = new GoogleMapsService(apiKey);
  }
  return mapsService;
};

export const getGoogleMapsService = (): GoogleMapsService => {
  if (!mapsService) {
    throw new Error('Google Maps service not initialized. Call initializeGoogleMaps first.');
  }
  return mapsService;
};

export type { Location, Address, MapConfig };
export { GoogleMapsService };
