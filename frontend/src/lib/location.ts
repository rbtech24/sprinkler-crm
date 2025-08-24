// Location service for address handling without Google Maps dependency
// This can be enhanced with Google Maps integration later

export interface Location {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface Site {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

export class LocationService {
  // Format address for display
  static formatAddress(address: Partial<Address>): string {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  // Parse full address string into components
  static parseAddress(fullAddress: string): Partial<Address> {
    const parts = fullAddress.split(',').map(part => part.trim());
    
    if (parts.length >= 4) {
      return {
        street: parts[0],
        city: parts[1],
        state: parts[2],
        zipCode: parts[3]
      };
    }
    
    return { street: fullAddress };
  }

  // Calculate distance using Haversine formula (without Google Maps)
  static calculateDistance(from: Location, to: Location): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(to.lat - from.lat);
    const dLng = this.toRadians(to.lng - from.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(from.lat)) * Math.cos(this.toRadians(to.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Validate address components
  static validateAddress(address: Partial<Address>): boolean {
    return !!(address.street && address.city && address.state);
  }

  // Get state abbreviation
  static getStateAbbreviation(stateName: string): string {
    const states: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
      'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
      'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
      'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
      'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
      'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
      'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
      'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
      'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
      'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
      'Wisconsin': 'WI', 'Wyoming': 'WY'
    };
    
    return states[stateName] || stateName;
  }

  // Sort sites by distance from a location
  static sortSitesByDistance(sites: Site[], fromLocation: Location): Site[] {
    return sites
      .map(site => ({
        ...site,
        distance: site.latitude && site.longitude 
          ? this.calculateDistance(fromLocation, { lat: site.latitude, lng: site.longitude })
          : Infinity
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  // Find sites within radius
  static findSitesWithinRadius(sites: Site[], center: Location, radiusMiles: number): Site[] {
    return sites.filter(site => {
      if (!site.latitude || !site.longitude) return false;
      
      const distance = this.calculateDistance(center, { lat: site.latitude, lng: site.longitude });
      return distance <= radiusMiles;
    });
  }

  // Generate Google Maps URL for directions
  static getDirectionsUrl(from: string, to: string): string {
    const baseUrl = 'https://www.google.com/maps/dir/';
    const encodedFrom = encodeURIComponent(from);
    const encodedTo = encodeURIComponent(to);
    
    return `${baseUrl}${encodedFrom}/${encodedTo}`;
  }

  // Generate Google Maps URL for a location
  static getMapUrl(address: string): string {
    const baseUrl = 'https://www.google.com/maps/search/';
    const encodedAddress = encodeURIComponent(address);
    
    return `${baseUrl}${encodedAddress}`;
  }

  // Geocode address using a free service (for basic functionality)
  static async geocodeAddress(address: string): Promise<Location | null> {
    try {
      // Using Nominatim (OpenStreetMap) as a free geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      
      const data = await response.json();
      
      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Reverse geocode coordinates to address
  static async reverseGeocode(location: Location): Promise<Address | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding request failed');
      }
      
      const data = await response.json();
      
      if (data.address) {
        const addr = data.address;
        return {
          street: `${addr.house_number || ''} ${addr.road || ''}`.trim(),
          city: addr.city || addr.town || addr.village || '',
          state: addr.state || '',
          zipCode: addr.postcode || '',
          country: addr.country || ''
        };
      }
      
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }
}
