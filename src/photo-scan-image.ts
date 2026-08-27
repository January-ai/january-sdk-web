export interface PhotoScanImageOptions {
  maxDimension?: number;
  jpegQuality?: number;
}

export interface PreparedPhotoScanImage {
  dataUri: string;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
}

export interface DecodedPhotoScanImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  close(): void;
}

export interface PhotoScanImageAdapter {
  decode(image: Blob): Promise<DecodedPhotoScanImage>;
  encodeJpeg(image: DecodedPhotoScanImage, width: number, height: number, quality: number): Promise<Blob>;
}

/**
 * Browser photo normalization with an injectable adapter for non-browser runtimes and tests.
 * Orientation is applied by createImageBitmap where the browser exposes it.
 */
export async function preparePhotoScanImage(
  image: Blob,
  options: PhotoScanImageOptions = {},
  adapter: PhotoScanImageAdapter = browserPhotoScanImageAdapter(),
): Promise<PreparedPhotoScanImage> {
  if (!image.type.startsWith('image/')) throw new TypeError('Choose an image file.');
  const maxDimension = options.maxDimension ?? 1_000;
  const jpegQuality = options.jpegQuality ?? 0.7;
  if (!Number.isFinite(maxDimension) || maxDimension <= 0) throw new RangeError('maxDimension must be positive.');
  if (!Number.isFinite(jpegQuality) || jpegQuality <= 0 || jpegQuality > 1) {
    throw new RangeError('jpegQuality must be greater than 0 and at most 1.');
  }

  const decoded = await adapter.decode(image);
  try {
    if (decoded.width <= 0 || decoded.height <= 0) throw new TypeError('The image has invalid dimensions.');
    const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const encoded = await adapter.encodeJpeg(decoded, width, height, jpegQuality);
    return {
      dataUri: await blobToDataUri(encoded, 'image/jpeg'),
      width,
      height,
      mimeType: 'image/jpeg',
    };
  } finally {
    decoded.close();
  }
}

function browserPhotoScanImageAdapter(): PhotoScanImageAdapter {
  if (typeof globalThis.createImageBitmap !== 'function' || typeof document === 'undefined') {
    throw new Error('Photo preprocessing requires browser image and canvas APIs.');
  }
  return {
    async decode(image) {
      const bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' });
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      };
    },
    async encodeJpeg(image, width, height, quality) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser cannot prepare the selected image.');
      context.drawImage(image.source, 0, 0, width, height);
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('The browser could not encode the selected image.')),
          'image/jpeg',
          quality,
        );
      });
    },
  };
}

async function blobToDataUri(blob: Blob, mimeType: string): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
