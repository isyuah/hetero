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
    constructor(options?: PhotoSwipeOptions);
    init(): boolean;
    destroy(): void;
    close(): void;
  }
}

declare module "photoswipe/lightbox" {
  import type { DataSource, PhotoSwipeOptions, Point } from "photoswipe";

  export default class PhotoSwipeLightbox {
    constructor(options?: PhotoSwipeOptions);
    init(): void;
    destroy(): void;
    loadAndOpen(index: number, dataSource?: DataSource, initialPoint?: Point | null): boolean;
  }
}
