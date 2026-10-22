import React, { useEffect, useState } from 'react';
import type { ScanItem } from '../../types';
import { getScanPhoto } from '../../data/photoStore';

interface ScanImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  scan: ScanItem;
}

export const ScanImage: React.FC<ScanImageProps> = ({ scan, ...imageProps }) => {
  const [storedPhotoUrl, setStoredPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const loadPhoto = async () => {
      let photo: Blob | undefined;
      if (scan.photoStorageKey) {
        try { photo = await getScanPhoto(scan.photoStorageKey); } catch { /* show the local-photo fallback below */ }
      }
      if (!active || !photo) return;
      objectUrl = URL.createObjectURL(photo);
      setStoredPhotoUrl(objectUrl);
    };
    void loadPhoto();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [scan.photoStorageKey]);

  if (!storedPhotoUrl && !scan.imageUrl) {
    return (
      <div
        className={`${imageProps.className ?? ''} flex items-center justify-center bg-[#181B19] px-5 text-center text-xs text-[#A1A7A3]`}
        role="img"
        aria-label={imageProps.alt}
      >
        {scan.photoScope === 'missing'
          ? 'This photo could not be saved.'
          : 'This photo is available only on the device where it was saved.'}
      </div>
    );
  }

  return <img {...imageProps} src={storedPhotoUrl ?? scan.imageUrl} />;
};
