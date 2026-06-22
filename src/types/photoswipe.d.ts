declare module "photoswipe" {
  export type Point = {
    x: number;
    y: number;
    id?: string | number;
  };

  export type Padding = {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  export type SlideData = {
    element?: HTMLElement;
    src?: string;
    srcset?: string;
    msrc?: string;
    width?: number;
    height?: number;
    w?: number;
    h?: number;
    alt?: string;
    thumbCropped?: boolean;
    html?: string;
    type?: string;
    [key: string]: unknown;
  };

  export type PhotoSwipeUIElementData = {
    name: string;
    order?: number;
    isButton?: boolean;
    appendTo?: "bar" | "wrapper" | "root";
    html?: string;
    onInit?: (element: HTMLElement, pswp: PhotoSwipe) => void;
  };

  export type PhotoSwipeUI = {
    registerElement(options: PhotoSwipeUIElementData): void;
  };

  export type DataSource = SlideData[] | {
    gallery: HTMLElement;
    items?: HTMLElement[];
  };

  export type ActionType = "close" | "next" | "zoom" | "zoom-or-close" | "toggle-controls";

  export type PhotoSwipeOptions = {
    dataSource?: DataSource;
    pswpModule?: unknown;
    bgOpacity?: number;
    wheelToZoom?: boolean;
    preloaderDelay?: number;
    showHideAnimationType?: "none" | "zoom" | "fade";
    showAnimationDuration?: number | false;
    hideAnimationDuration?: number | false;
    zoomAnimationDuration?: number | false;
    pinchToClose?: boolean;
    closeOnVerticalDrag?: boolean;
    bgClickAction?: ActionType | false;
    imageClickAction?: ActionType | false;
    tapAction?: ActionType | false;
    doubleTapAction?: ActionType | false;
    paddingFn?: (viewportSize: Point, itemData: SlideData, index: number) => Padding;
    padding?: Padding;
    errorMsg?: string;
    closeTitle?: string;
    zoomTitle?: string;
    arrowPrevTitle?: string;
    arrowNextTitle?: string;
  };

  export default class PhotoSwipe {
    ui?: PhotoSwipeUI;
    currSlide?: {
      data?: SlideData;
    };

    constructor(options?: PhotoSwipeOptions);
    init(): boolean;
    destroy(): void;
    close(): void;
    on(eventName: string, callback: (...args: unknown[]) => void): void;
    addFilter(filterName: string, callback: (...args: unknown[]) => unknown): void;
  }
}

declare module "photoswipe/lightbox" {
  import PhotoSwipe from "photoswipe";
  import type { DataSource, PhotoSwipeOptions, Point, SlideData } from "photoswipe";

  export type ElementProvider = string | NodeListOf<HTMLElement> | HTMLElement[] | HTMLElement;

  export type PhotoSwipeLightboxOptions = PhotoSwipeOptions & {
    gallery?: ElementProvider;
    gallerySelector?: string;
    children?: ElementProvider;
    childSelector?: string;
    getClickedIndexFn?: (event: MouseEvent) => number;
  };

  export default class PhotoSwipeLightbox {
    pswp?: PhotoSwipe;

    constructor(options?: PhotoSwipeLightboxOptions);
    init(): void;
    destroy(): void;
    loadAndOpen(index: number, dataSource?: DataSource, initialPoint?: Point | null): boolean;
    on(eventName: "uiRegister", callback: () => void): void;
    on(eventName: string, callback: (...args: unknown[]) => void): void;
    addFilter(
      filterName: "domItemData",
      callback: (itemData: SlideData, element: HTMLElement, linkEl: HTMLAnchorElement) => SlideData,
    ): void;
    addFilter(filterName: string, callback: (...args: unknown[]) => unknown): void;
  }
}
