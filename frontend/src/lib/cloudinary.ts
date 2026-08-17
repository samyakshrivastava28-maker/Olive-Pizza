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
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to get upload signature (HTTP ${res.status})`);
      }
      const { timestamp, signature, cloudName, apiKey, folder: signedFolder } = await res.json();

      const targetFolder = signedFolder || folder;

      // 2. Upload via XMLHttpRequest to get progress
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', targetFolder);

      const xhr = new XMLHttpRequest();
      xhr.timeout = 60000; // 60s timeout
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

      xhr.upload.onprogress = (e) => {
        if (onProgress) {
          if (e.lengthComputable && e.total > 0) {
            const progress = Math.min(100, Math.max(0, Math.round((e.loaded / e.total) * 100)));
            onProgress(progress);
          } else {
            onProgress(-1); // -1 indicates honest indeterminate progress
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              secureUrl: response.secure_url,
              publicId: response.public_id,
              format: response.format,
              bytes: response.bytes,
              type: response.resource_type
            });
          } catch {
            reject(new Error('Invalid response from Cloudinary'));
          }
        } else {
          let errorMsg = `Upload failed with HTTP ${xhr.status}`;
          try {
            const errRes = JSON.parse(xhr.responseText);
            if (errRes.error && errRes.error.message) {
              errorMsg = errRes.error.message;
            }
          } catch {}
          reject(new Error(errorMsg));
        }
      };

      xhr.ontimeout = () => reject(new Error('Upload timed out after 60 seconds'));
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
