interface YandexMapInstance {
  geoObjects: {
    add: (object: unknown) => void;
  };
  behaviors: {
    disable: (behavior: string) => void;
  };
}

interface YandexMapsApi {
  ready: (callback: () => void) => void;
  Map: new (
    container: string | HTMLElement,
    state: {
      center: number[];
      zoom: number;
      controls?: string[];
    },
    options?: Record<string, unknown>
  ) => YandexMapInstance;
  Placemark: new (
    geometry: number[],
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => unknown;
}

declare global {
  interface Window {
    ymaps?: YandexMapsApi;
  }
}

export {};
