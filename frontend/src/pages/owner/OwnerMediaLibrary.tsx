import { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { useAuthStore } from "../../lib/store";
import { deleteMediaFromCloudinary } from "../../lib/cloudinary";
import { getCurrentAuthToken } from "../../lib/firebase";

export default function OwnerMediaLibrary() {
  const { user } = useAuthStore();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, image, video
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, largest, smallest

  useEffect(() => {
    const q = query(
      collection(db, "media_library"),
      orderBy("uploadedAt", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mediaData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMedia(mediaData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const deleteMedia = async (item: any) => {
    if (
      !confirm(
        "Are you sure you want to delete this media? Warning: If this media is currently used by an Ad or Product, it will be broken.",
      )
    )
      return;
    if (!user) return;
    try {
      if (item.cloudinaryPublicId) {
        const token = await getCurrentAuthToken();
        await deleteMediaFromCloudinary(item.cloudinaryPublicId, token).catch(
          (e) => console.error("Failed to delete media from Cloudinary", e),
        );
      }
      await deleteDoc(doc(db, "media_library", item.id));
    } catch (error) {
      console.error("Error deleting media", error);
    }
  };

  const filteredAndSortedMedia = useMemo(() => {
    let result = media;

    // Filter by type
    if (filterType !== "all") {
      result = result.filter((m) => m.mediaType.startsWith(filterType));
    }

    // Search
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.cloudinaryPublicId?.toLowerCase().includes(lowerQuery) ||
          m.mediaType?.toLowerCase().includes(lowerQuery),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "newest")
        return (
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
      if (sortBy === "oldest")
        return (
          new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
        );
      if (sortBy === "largest") return (b.bytes || 0) - (a.bytes || 0);
      if (sortBy === "smallest") return (a.bytes || 0) - (b.bytes || 0);
      return 0;
    });

    return result;
  }, [media, searchQuery, filterType, sortBy]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading)
    return (
      <div className="p-8 font-bold text-center">Loading Media Library...</div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Media Library</h1>
        <p className="text-slate-400">
          Manage all your uploaded Cloudinary assets from one place.
        </p>
      </div>

      <div className="bg-[#1E293B] dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-white/10 flex flex-col md:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Search by Public ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-700 w-full"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-700 w-full md:w-48"
        >
          <option value="all">All Media</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-700 w-full md:w-48"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="largest">Largest File</option>
          <option value="smallest">Smallest File</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredAndSortedMedia.map((item) => (
          <div
            key={item.id}
            className="bg-[#1E293B] dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-white/10 group flex flex-col"
          >
            <div className="aspect-square bg-slate-100 dark:bg-slate-900 relative overflow-hidden flex items-center justify-center">
              {item.mediaType?.startsWith("video") ? (
                <video
                  src={item.mediaUrl.replace(
                    "/upload/",
                    "/upload/q_auto,f_auto/",
                  )}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={item.mediaUrl?.replace(
                    "/upload/",
                    "/upload/w_300,f_auto,q_auto/",
                  )}
                  loading="lazy"
                  alt="Media"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-100 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => deleteMedia(item)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transform scale-90 group-hover:scale-100 transition-transform"
                >
                  Delete
                </button>
              </div>
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[10px] font-bold rounded uppercase tracking-wider backdrop-blur-sm">
                {item.format || item.mediaType}
              </div>
            </div>
            <div className="p-3 flex flex-col justify-between flex-1">
              <p
                className="text-xs font-mono text-slate-400 truncate"
                title={item.cloudinaryPublicId}
              >
                {item.cloudinaryPublicId?.split("/").pop() || "Unknown ID"}
              </p>
              <div className="flex justify-between items-end mt-2">
                <p className="text-xs font-bold text-slate-400">
                  {formatBytes(item.bytes)}
                </p>
                <p className="text-[10px] text-slate-400">
                  {new Date(item.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredAndSortedMedia.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No media found matching your filters.
        </div>
      )}
    </div>
  );
}
