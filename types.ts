export interface MarkerImage {
  id: string;
  uri: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MapMarker {
  id: string;
  coordinate: Coordinates;
  images: MarkerImage[];
}

export interface MarkerRouteParams {
  id: string;
}
