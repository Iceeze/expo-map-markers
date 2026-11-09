export interface MarkerImage {
  id: number;
  uri: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MapMarker {
  id: number;
  coordinate: Coordinates;
}
