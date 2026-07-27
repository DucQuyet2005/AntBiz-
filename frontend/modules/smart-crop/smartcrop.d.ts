declare module 'smartcrop' {
  export interface CropOptions {
    width: number;
    height: number;
    ruleOfThirds?: boolean;
    minScale?: number;
  }

  export interface CropResult {
    topCrop: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }

  export function crop(
    image: HTMLImageElement | HTMLCanvasElement,
    options: CropOptions
  ): Promise<CropResult>;
}
