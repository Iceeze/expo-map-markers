import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { Coordinates, MapMarker } from '../types';

interface MarkersContextValue {
  markers: MapMarker[];
  addMarker: (coordinate: Coordinates) => void;
  addImage: (markerId: string, uri: string) => void;
  removeImage: (markerId: string, imageId: string) => void;
}

const MarkersContext = createContext<MarkersContextValue | null>(null);

export function MarkersProvider({ children }: { children: ReactNode }) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const nextId = useRef(1);

  function addMarker(coordinate: Coordinates) {
    const marker: MapMarker = {
      id: String(nextId.current++),
      coordinate,
      images: [],
    };
    setMarkers((current) => [...current, marker]);
  }

  function addImage(markerId: string, uri: string) {
    const image = { id: String(nextId.current++), uri };
    setMarkers((current) =>
      current.map((marker) =>
        marker.id === markerId
          ? { ...marker, images: [...marker.images, image] }
          : marker,
      ),
    );
  }

  function removeImage(markerId: string, imageId: string) {
    setMarkers((current) =>
      current.map((marker) =>
        marker.id === markerId
          ? { ...marker, images: marker.images.filter((image) => image.id !== imageId) }
          : marker,
      ),
    );
  }

  return (
    <MarkersContext.Provider value={{ markers, addMarker, addImage, removeImage }}>
      {children}
    </MarkersContext.Provider>
  );
}

export function useMarkers() {
  const context = useContext(MarkersContext);
  if (!context) {
    throw new Error('useMarkers нужно использовать внутри MarkersProvider.');
  }
  return context;
}
