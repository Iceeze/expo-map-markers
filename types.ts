// Одна фотография, выбранная из галереи телефона.
export interface MarkerImage {
  id: string;
  uri: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Маркер содержит координаты и собственный список фотографий.
export interface MapMarker {
  id: string;
  coordinate: Coordinates;
  images: MarkerImage[];
}

// В адрес экрана деталей передаём только id, а не весь маркер.
export interface MarkerRouteParams {
  id: string;
}
