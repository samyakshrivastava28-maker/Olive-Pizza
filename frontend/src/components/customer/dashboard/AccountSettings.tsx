import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import CustomerProfile from "../CustomerProfile";
import { useVersionStore, checkVersion, APP_VERSION } from "../../../lib/versionManager";
import { useAuthStore } from "../../../lib/store";
import { auth, db } from "../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { LocationManager, type PermissionState } from "../../../lib/permissions";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { toast } from "react-hot-toast";
import {
  Bell,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  DownloadCloud,
  RefreshCw,
  Trash2,
  LogOut,
  ExternalLink,
  Volume2,
  VolumeX,
  Vibrate,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";

interface NotificationPrefs {
  orderUpdates: boolean;
  deliveryProgress: boolean;
  promotions: boolean;
}

interface AppPrefs {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export default function AccountSettings() {
  const { user, logout } = useAuthStore();
  const { latestVersion, isUpdateAvailable } = useVersionStore();

  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    orderUpdates: true,
    deliveryProgress: true,
    promotions: true,
  });
  const [savingNotif, setSavingNotif] = useState(false);

  // OS Permissions Diagnostic State
  const [pushStatus, setPushStatus] = useState<"granted" | "denied" | "prompt" | "checking">("checking");
  const [locStatus, setLocStatus] = useState<PermissionState | "checking">("checking");
  const [checkingPerms, setCheckingPerms] = useState(false);

  // App Preferences
  const [appPrefs, setAppPrefs] = useState<AppPrefs>(() => {
    try {
      const stored = localStorage.getItem("olive_app_preferences");
      if (stored) return JSON.parse(stored);
    } catch {}
    return { soundEnabled: true, hapticsEnabled: true };
  });

  // Modal / Confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Check OS Permissions
  const checkPermissions = useCallback(async () => {
    setCheckingPerms(true);
    try {
      // 1. Push notification permission
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await PushNotifications.checkPermissions();
          if (status.receive === "granted") setPushStatus("granted");
          else if (status.receive === "denied") setPushStatus("denied");
          else setPushStatus("prompt");
        } catch {
          setPushStatus("denied");
        }
      } else if (typeof window !== "undefined" && "Notification" in window) {
        setPushStatus(window.Notification.permission as "granted" | "denied" | "prompt");
      } else {
        setPushStatus("denied");
      }

      // 2. Location permission
      const loc = await LocationManager.checkPermissionState();
      setLocStatus(loc);
    } catch {
      setPushStatus("prompt");
      setLocStatus("prompt");
    } finally {
      setCheckingPerms(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkPermissions();

    // Load preferences from Firestore or localStorage
    const loadPreferences = async () => {
      try {
        const local = localStorage.getItem("olive_notification_preferences");
        if (local) setNotifPrefs(JSON.parse(local));

        if (auth.currentUser) {
          const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (snap.exists() && snap.data()?.notificationPreferences) {
            const prefs = snap.data().notificationPreferences;
            setNotifPrefs({
              orderUpdates: prefs.orderUpdates ?? true,
              deliveryProgress: prefs.deliveryProgress ?? true,
              promotions: prefs.promotions ?? true,
            });
          }
        }
      } catch (err) {
        console.warn("[AccountSettings] Error reading preferences:", err);
      }
    };

    loadPreferences();
  }, [checkPermissions]);

  // Request Push Permission
  const handleRequestPush = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const res = await PushNotifications.requestPermissions();
        if (res.receive === "granted") {
          toast.success("Push notifications enabled!");
          setPushStatus("granted");
        } else {
          toast.error("Push notifications denied by system settings.");
          setPushStatus("denied");
        }
      } else if (typeof window !== "undefined" && "Notification" in window) {
        const res = await window.Notification.requestPermission();
        setPushStatus(res as "granted" | "denied" | "prompt");
        if (res === "granted") toast.success("Push notifications enabled!");
        else toast.error("Notifications blocked in browser settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to request push permissions.");
    }
  };

  // Request Location Permission
  const handleRequestLocation = async () => {
    try {
      const state = await LocationManager.checkPermissionState();
      if (state === "granted") {
        toast.success("Location access is active!");
        setLocStatus("granted");
      } else {
        const loc = await LocationManager.getCurrentLocation();
        if (loc) {
          toast.success("Location acquired successfully!");
          setLocStatus("granted");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not obtain location. Please grant permission in OS settings.");
      setLocStatus("denied");
    }
  };

  // Toggle Notification Pref
  const toggleNotifPref = async (key: keyof NotificationPrefs) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    localStorage.setItem("olive_notification_preferences", JSON.stringify(next));

    if (auth.currentUser) {
      setSavingNotif(true);
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          notificationPreferences: next,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Notification preferences saved");
      } catch (err) {
        console.warn("Could not save to server:", err);
      } finally {
        setSavingNotif(false);
      }
    }
  };

  // Toggle App Pref
  const toggleAppPref = (key: keyof AppPrefs) => {
    const next = { ...appPrefs, [key]: !appPrefs[key] };
    setAppPrefs(next);
    localStorage.setItem("olive_app_preferences", JSON.stringify(next));
    toast.success(`${key === "soundEnabled" ? "Audio alerts" : "Haptic feedback"} ${next[key] ? "enabled" : "disabled"}`);
  };

  // Clear App Cache
  const handleClearCache = () => {
    try {
      const keysToKeep = ["olive-auth-store", "olive_app_preferences"];
      Object.keys(localStorage).forEach((k) => {
        if (!keysToKeep.includes(k)) localStorage.removeItem(k);
      });
      sessionStorage.clear();
      toast.success("Local cache cleared successfully");
    } catch {
      toast.error("Could not clear cache");
    }
  };

  // Account deletion request
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          deletionRequested: true,
          deletionRequestedAt: new Date().toISOString(),
        });
      }
      toast.success("Account deletion request logged. You will be signed out.");
      setTimeout(async () => {
        try {
          await auth.signOut();
        } catch {}
        logout();
      }, 1500);
    } catch (err) {
      toast.error("Failed to process account deletion request.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-slate-900 dark:text-white font-serif font-black tracking-tight">Account & App Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Manage notifications, system permissions, privacy, and preferences.</p>
        </div>
      </div>

      {/* 1. Customer Profile Form */}
      <CustomerProfile />

      {/* 2. Notification Preferences Section */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Notification Preferences</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Choose which alerts and updates you wish to receive</p>
          </div>
        </div>

        <div className="space-y-3 divide-y divide-slate-100 dark:divide-white/5">
          {/* Order Updates */}
          <div className="flex items-center justify-between pt-3 first:pt-0">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Order Status & Live Progress</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Receive instant updates when your order is placed, baking, or ready</p>
            </div>
            <button
              onClick={() => toggleNotifPref("orderUpdates")}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                notifPrefs.orderUpdates ? "bg-orange-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  notifPrefs.orderUpdates ? "transform translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          {/* Delivery Progress */}
          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Rider & Delivery Telemetry</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Alerts when a partner is assigned, on route, and arriving at your door</p>
            </div>
            <button
              onClick={() => toggleNotifPref("deliveryProgress")}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                notifPrefs.deliveryProgress ? "bg-orange-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  notifPrefs.deliveryProgress ? "transform translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          {/* Promotions & Offers */}
          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Promotions & Exclusive Deals</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Coupons, weekend discounts, and limited-time pizza combo offers</p>
            </div>
            <button
              onClick={() => toggleNotifPref("promotions")}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                notifPrefs.promotions ? "bg-orange-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  notifPrefs.promotions ? "transform translate-x-6" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 3. OS Permissions Diagnostics */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">OS Permissions Diagnostics</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Real-time operating system permission status</p>
            </div>
          </div>
          <button
            onClick={checkPermissions}
            disabled={checkingPerms}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-white/5"
            title="Refresh permissions"
          >
            <RefreshCw className={`w-4 h-4 ${checkingPerms ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Push Permission Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">Push Notifications</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  pushStatus === "granted"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                    : pushStatus === "denied"
                    ? "bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30"
                    : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                }`}
              >
                {pushStatus === "granted" ? "Active" : pushStatus === "denied" ? "Blocked" : "Needs Setup"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pushStatus === "granted"
                ? "Your device receives instant order alerts and status milestones."
                : "Notifications are disabled. Enable them to track orders in real time."}
            </p>
            {pushStatus !== "granted" && (
              <button
                onClick={handleRequestPush}
                className="mt-1 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Enable Notifications
              </button>
            )}
          </div>

          {/* Location Permission Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">Device Location</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  locStatus === "granted"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                    : locStatus === "denied"
                    ? "bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30"
                    : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                }`}
              >
                {locStatus === "granted" ? "Active" : locStatus === "denied" ? "Blocked" : "Needs Setup"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locStatus === "granted"
                ? "Accurate delivery address detection is operational."
                : "Location access helps autofill delivery addresses and calculate ETA."}
            </p>
            {locStatus !== "granted" && (
              <button
                onClick={handleRequestLocation}
                className="mt-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Enable Location
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. App Preferences */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">App Preferences</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Audio and feedback settings for this device</p>
          </div>
        </div>

        <div className="space-y-3 divide-y divide-slate-100 dark:divide-white/5">
          {/* Sound Alerts */}
          <div className="flex items-center justify-between pt-3 first:pt-0">
            <div className="flex items-center gap-3">
              {appPrefs.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">In-App Audio Chimes</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Play pleasant alert sounds when order milestones change</p>
              </div>
            </div>
            <button
              onClick={() => toggleAppPref("soundEnabled")}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                appPrefs.soundEnabled ? "bg-orange-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  appPrefs.soundEnabled ? "transform translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          {/* Haptic Feedback */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-3">
              <Vibrate className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Haptic Vibration</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Light tactile vibrations on button interactions and order updates</p>
              </div>
            </div>
            <button
              onClick={() => toggleAppPref("hapticsEnabled")}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                appPrefs.hapticsEnabled ? "bg-orange-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  appPrefs.hapticsEnabled ? "transform translate-x-6" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Privacy, Data & Account Controls */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Privacy & Account Security</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Manage your personal data, session access, and account lifecycle</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleClearCache}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Clear App Cache</span>
          </button>

          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-center"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Privacy Policy</span>
          </a>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
            <span>Request Account Deletion</span>
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Are you sure you want to delete your Olive Pizza account?</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This request permanently schedules your account, order history, and saved addresses for deletion according to our data privacy policy.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white text-xs font-bold hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {deleting ? "Processing..." : "Confirm Deletion"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. App Version & Update Information */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <DownloadCloud className="w-32 h-32 text-orange-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 relative z-10">Application Build</h3>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Installed Version</p>
            <p className="text-slate-900 dark:text-white font-mono font-bold text-sm">v{APP_VERSION} (Production Release)</p>
            {isUpdateAvailable && latestVersion && (
              <p className="text-orange-500 dark:text-orange-400 text-xs mt-1 flex items-center gap-1 font-semibold">
                <Info className="w-3.5 h-3.5" /> Update v{latestVersion} available!
              </p>
            )}
          </div>
          <button
            onClick={() => {
              checkVersion();
              toast.success("Checked for updates!");
            }}
            className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-slate-200 dark:border-white/10 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Check For Updates
          </button>
        </div>
      </div>
    </div>
  );
}
