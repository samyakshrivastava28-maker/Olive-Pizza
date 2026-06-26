import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { useAuthStore } from "../../lib/store";
import {
  uploadMediaToCloudinary,
  deleteMediaFromCloudinary,
} from "../../lib/cloudinary";
import { getCurrentAuthToken } from "../../lib/firebase";
import { logActivity } from "../../lib/logger";

export default function OwnerAds() {
  const { user } = useAuthStore();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [newAd, setNewAd] = useState<any>({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    isActive: true,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "ads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAds(adData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpload = async (file: File) => {
    if (!user) throw new Error("Not authenticated");
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadMediaToCloudinary(
        file,
        "olive-pizza/ads",
        setUploadProgress,
      );

      await addDoc(collection(db, "media_library"), {
        mediaUrl: result.secureUrl,
        cloudinaryPublicId: result.publicId,
        mediaType: result.type,
        format: result.format,
        bytes: result.bytes,
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
      });

      return result;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a media file for the ad.");
      return;
    }
    try {
      const result = await handleUpload(selectedFile);

      await addDoc(collection(db, "ads"), {
        ...newAd,
        mediaUrl: result.secureUrl,
        cloudinaryPublicId: result.publicId,
        mediaType: result.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await logActivity(
        "Ad Created",
        `Created ad: ${newAd.title}`,
        user?.email || undefined,
      );

      setIsAdding(false);
      setNewAd({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        isActive: true,
      });
      setSelectedFile(null);
    } catch (error) {
      console.error("Error creating ad", error);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "ads", id), { isActive: !currentStatus });
      await logActivity(
        "Ad Updated",
        `Ad status changed to ${!currentStatus ? "Active" : "Inactive"}`,
        user?.email || undefined,
      );
    } catch (error) {
      console.error("Error toggling ad status", error);
    }
  };

  const deleteAd = async (ad: any) => {
    if (
      !confirm(
        "Are you sure you want to delete this ad? This will also remove the media from Cloudinary.",
      )
    )
      return;
    if (!user) return;
    try {
      if (ad.cloudinaryPublicId) {
        const token = await getCurrentAuthToken();
        await deleteMediaFromCloudinary(ad.cloudinaryPublicId, token).catch(
          (e) => console.error("Failed to delete media", e),
        );
      }
      await deleteDoc(doc(db, "ads", ad.id));
      await logActivity(
        "Ad Updated",
        `Deleted ad: ${ad.title}`,
        user?.email || undefined,
      );
    } catch (error) {
      console.error("Error deleting ad", error);
    }
  };

  const isCurrentlyActive = (ad: any) => {
    if (!ad.isActive) return false;
    const now = new Date().toISOString();
    if (ad.startDate && now < ad.startDate) return false;
    if (ad.endDate && now > ad.endDate) return false;
    return true;
  };

  if (loading)
    return <div className="p-8 font-bold text-center">Loading Ads...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Ads Management</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg font-bold transition-colors"
        >
          {isAdding ? "Cancel" : "+ Create Ad"}
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="bg-[#1E293B] dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <input
            type="text"
            placeholder="Ad Title"
            required
            value={newAd.title}
            onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
            className="p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-700 md:col-span-2"
          />

          <div className="col-span-1 md:col-span-2 border-2 border-dashed border-slate-300 dark:border-slate-600 p-6 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
            {selectedFile ? (
              <div className="text-center">
                {selectedFile.type.startsWith("video/") ? (
                  <video
                    src={URL.createObjectURL(selectedFile)}
                    className="h-32 mx-auto mb-4 rounded"
                  />
                ) : (
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="h-32 object-contain mx-auto mb-4 rounded"
                  />
                )}
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-red-500 text-xs mt-2 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <span className="text-4xl mb-2">🎞️</span>
                <p className="text-slate-400 font-medium mb-2">
                  Upload Image or Video Banner
                </p>
                <input
                  type="file"
                  accept="image/*,video/*"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-100 cursor-pointer"
                />
              </>
            )}
            {uploading && (
              <div
                className="absolute bottom-0 left-0 h-1 bg-primary-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
          </div>

          <div>
            <label className="text-sm font-bold text-slate-400 block mb-1">
              Start Date/Time
            </label>
            <input
              type="datetime-local"
              required
              value={newAd.startDate}
              onChange={(e) =>
                setNewAd({ ...newAd, startDate: e.target.value })
              }
              className="w-full p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-400 block mb-1">
              End Date/Time
            </label>
            <input
              type="datetime-local"
              required
              value={newAd.endDate}
              onChange={(e) => setNewAd({ ...newAd, endDate: e.target.value })}
              className="w-full p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-700"
            />
          </div>

          <div className="md:col-span-2">
            <textarea
              placeholder="Ad Description / Details"
              required
              value={newAd.description}
              onChange={(e) =>
                setNewAd({ ...newAd, description: e.target.value })
              }
              className="w-full p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-700 h-24"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="md:col-span-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg p-4 disabled:opacity-100"
          >
            {uploading ? `Uploading Media... ${uploadProgress}%` : "Publish Ad"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {ads.map((ad) => (
          <div
            key={ad.id}
            className="bg-[#1E293B] dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-white/10 flex flex-col gap-4"
          >
            <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-video flex items-center justify-center">
              {ad.mediaType === "video" ? (
                <video
                  src={ad.mediaUrl.replace(
                    "/upload/",
                    "/upload/q_auto,f_auto/",
                  )}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={ad.mediaUrl.replace(
                    "/upload/",
                    "/upload/w_600,f_auto,q_auto/",
                  )}
                  loading="lazy"
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
              )}
              <div
                className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md ${isCurrentlyActive(ad) ? "bg-green-500" : "bg-slate-500"}`}
              >
                {isCurrentlyActive(ad) ? "Live" : "Scheduled / Ended"}
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-xl text-white">{ad.title}</h3>
                <p className="text-sm text-slate-400">{ad.description}</p>
                <div className="text-xs font-medium text-slate-400 mt-2">
                  <p>Start: {new Date(ad.startDate).toLocaleString()}</p>
                  <p>End: {new Date(ad.endDate).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => toggleActive(ad.id, ad.isActive)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${ad.isActive ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
              >
                {ad.isActive ? "Pause Ad" : "Activate Ad"}
              </button>
              <button
                onClick={() => deleteAd(ad)}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Delete Ad
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
