import React, { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { ScanItem } from '../../types';
import { getScanPhoto } from '../../data/photoStore';
import { getCloudCropPhoto } from '../../data/photoApi';
import { useAuth } from '../../context/useAuth';

interface ScanImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  scan: ScanItem;
  fallbackIconOnly?: boolean;
}

export const ScanImage: React.FC<ScanImageProps> = ({ scan, fallbackIconOnly = false, ...imageProps }) => {
  const [storedPhoto, setStoredPhoto] = useState<{ key: string; url: string } | null>(null);
  const { user } = useAuth();
  const resourceKey = `${scan.id}|${scan.photoStorageKey ?? ''}|${scan.cloudPhotoPath ?? ''}|${user?.uid ?? ''}`;
  const storedPhotoUrl = storedPhoto?.key === resourceKey ? storedPhoto.url : null;

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const loadPhoto = async () => {
      let photo: Blob | undefined;
      if (scan.photoStorageKey) {
        try { photo = await getScanPhoto(scan.photoStorageKey); } catch { /* show the local-photo fallback below */ }
      }
      if (!photo && scan.cloudPhotoPath && user) {
        try { photo = await getCloudCropPhoto({ scanId: scan.id, idToken: await user.getIdToken() }); }
        catch { /* explicit missing-image state below; Scan Details can retry */ }
      }
      if (!active || !photo) return;
      objectUrl = URL.createObjectURL(photo);
      setStoredPhoto({ key: resourceKey, url: objectUrl });
    };
    void loadPhoto();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [scan.photoStorageKey, scan.cloudPhotoPath, scan.id, user, resourceKey]);

  if (!storedPhotoUrl && !scan.imageUrl) {
    if (fallbackIconOnly) {
      return (
        <div
          className={`${imageProps.className ?? ''} flex items-center justify-center bg-[#181B19] text-[#8F9490]`}
          role="img"
          aria-label={imageProps.alt}
        >
          <ImageIcon className="h-5 w-5" aria-hidden="true" />
        </div>
      );
    }

    return (
      <div
        className={`${imageProps.className ?? ''} flex items-center justify-center bg-[#181B19] px-5 text-center text-xs text-[#A1A7A3]`}
        role="img"
        aria-label={imageProps.alt}
      >
        {scan.cloudPhotoPath
          ? 'This saved photo could not be loaded. Open Scan Details to retry.'
          : scan.photoScope === 'missing'
            ? 'This photo could not be saved. Choose the original photo again in Scan Details.'
            : 'This photo is saved only on its original device. Open Scan Details to sync it or choose the original.'}
      </div>
    );
  }

  return <img {...imageProps} src={storedPhotoUrl ?? scan.imageUrl} />;
};
