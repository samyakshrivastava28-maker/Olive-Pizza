import { useEffect, useState } from "react";
import { useAuthStore } from "../../lib/store";
import { auth, db } from "../../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router";

export default function DeliveryProfile() {
  const { user: authUser, logout } = useAuthStore();
  const [user, setUser] = useState<any>(authUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authUser?.uid) return;
    const unsubscribe = onSnapshot(
      doc(db, "users", authUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setUser({ ...authUser, ...docSnap.data() });
        }
      },
    );
    return () => unsubscribe();
  }, [authUser?.uid]);

  const handleLogout = async () => {
    await auth.signOut();
    logout();
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Profile</h1>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
        <img
          src={
            user?.photoUrl ||
            `https://ui-avatars.com/api/?name=${user?.name}&background=f97316&color=fff`
          }
          alt={user?.name}
          className="w-24 h-24 rounded-full object-cover shadow-md"
        />
        <div>
          <h2 className="text-xl font-bold">{user?.name}</h2>
          <p className="text-slate-500 font-medium">{user?.email}</p>
          <div className="mt-2 inline-block bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            {user?.approvalStatus || "Pending"}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
        <h3 className="font-bold border-b border-slate-100 dark:border-slate-700 pb-2">
          Vehicle Details
        </h3>
        {user?.vehicleImage && (
          <div className="flex justify-center mb-4">
            <img
              src={user.vehicleImage}
              alt="Vehicle"
              className="h-32 rounded-xl object-cover shadow-sm border border-slate-200 dark:border-slate-700"
            />
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500 font-medium">Vehicle Type</span>
          <span className="font-bold">
            {user?.vehicleType || "Not Provided"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 font-medium">Vehicle Number</span>
          <span className="font-bold">
            {user?.vehicleNumber || "Not Provided"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 font-medium">Join Date</span>
          <span className="font-bold">
            {user?.joinedAt
              ? new Date(user.joinedAt).toLocaleDateString()
              : "Unknown"}
          </span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-red-500 font-bold py-4 rounded-2xl transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
