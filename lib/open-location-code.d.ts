declare module "open-location-code" {
  export class OpenLocationCode {
    isValid(code: string): boolean;
    isShort(code: string): boolean;
    isFull(code: string): boolean;
    decode(code: string): {
      latitudeCenter: number;
      longitudeCenter: number;
    };
    recoverNearest(
      shortCode: string,
      referenceLatitude: number,
      referenceLongitude: number,
    ): string;
  }
}
