import { preparePhotoScanImage as prepareSdkPhotoScanImage } from '@januaryai/partner-sdk'

/** Prepares a browser-selected meal photo before it is sent through the SDK. */
export async function preparePhotoScanImage(file: File): Promise<string> {
  return (await prepareSdkPhotoScanImage(file)).dataUri
}
