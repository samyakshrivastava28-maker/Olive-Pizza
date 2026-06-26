import { getCurrentAuthToken } from './firebase';

export const uploadMediaToCloudinary = async (
  file: File,
  folder: string = 'olive-pizza/general',
  onProgress?: (progress: number) => void
): Promise<{ secureUrl: string; publicId: string; format: string; bytes: number; type: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Get signature from backend
      const token = await getCurrentAuthToken();
      
      const res = await fetch(`/api/media/sign-upload?folder=${encodeURIComponent(folder)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to get upload signature');
      const { timestamp, signature, cloudName, apiKey } = await res.json();

      // 2. Upload via XMLHttpRequest to get progress
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            secureUrl: response.secure_url,
            publicId: response.public_id,
            format: response.format,
            bytes: response.bytes,
            type: response.resource_type
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed due to network error'));
      xhr.send(formData);

    } catch (error) {
      reject(error);
    }
  });
};

export const deleteMediaFromCloudinary = async (publicId: string, token: string) => {
  const res = await fetch(`/api/media/${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to delete media');
  return res.json();
};
