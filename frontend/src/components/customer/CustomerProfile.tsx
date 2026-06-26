import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import toast from 'react-hot-toast';
import FloatingLines from '../../components/ui/FloatingLines';

export default function CustomerProfile() {
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    addressLine: '',
    landmark: '',
    pincode: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Password State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            name: data.name || '',
            phone: data.phone || '',
            addressLine: data.defaultAddress?.addressLine || '',
            landmark: data.defaultAddress?.landmark || '',
            pincode: data.defaultAddress?.pincode || ''
          });
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        toast.error("Could not load profile details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      // 1. Phone Uniqueness Check
      if (profile.phone) {
        try {
          const { parsePhoneNumber } = await import('libphonenumber-js');
          const phoneNumber = parsePhoneNumber(profile.phone, 'IN');
          if (!phoneNumber || !phoneNumber.isValid()) {
            toast.error('Please enter a valid Indian mobile number');
            setSaving(false);
            return;
          }
          const formattedPhone = phoneNumber.format('E.164');
          
          const { getDoc, setDoc } = await import('firebase/firestore');
          const identityRef = doc(db, 'customer_identities', formattedPhone);
          const identityDoc = await getDoc(identityRef);
          
          if (identityDoc.exists()) {
            const identityData = identityDoc.data();
            if (identityData.primaryUid !== auth.currentUser.uid) {
              toast.error('This phone number is already registered to another account.');
              setSaving(false);
              return;
            }
          } else {
            // Claim this phone number
            await setDoc(identityRef, {
              primaryUid: auth.currentUser.uid,
              primaryEmail: auth.currentUser.email || '',
              firstOrderCouponUsed: false,
              firstOrderDate: null,
              firstOrderCouponCode: null,
              totalOrders: 0,
              totalSpent: 0,
              createdAt: new Date().toISOString()
            });
          }
        } catch (phoneErr: any) {
          console.error("Phone validation error", phoneErr);
        }
      }

      const docRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(docRef, {
        name: profile.name,
        phone: profile.phone,
        defaultAddress: {
          addressLine: profile.addressLine,
          landmark: profile.landmark,
          pincode: profile.pincode
        }
      });
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to update profile", err);
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !auth.currentUser.email) return;
    setPasswordLoading(true);
    try {
      // Re-authenticate
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update Password
      await updatePassword(auth.currentUser, newPassword);
      toast.success("Password changed successfully!");
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      console.error("Password update failed", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error("Current password is incorrect.");
      } else {
        toast.error("Failed to change password.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResetEmail = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      toast.success("Password reset link sent to your email.");
    } catch (err) {
      console.error("Failed to send reset email", err);
      toast.error("Could not send reset email.");
    }
  };

  if (loading) return <div className="text-center p-8">Loading profile...</div>;

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <FloatingLines 
          linesGradient={['#f97316', '#eab308']} 
          parallax={false} 
          interactive={false} 
          bendStrength={0}
        />
      </div>
      
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
      {/* Profile Edit Form */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
          <span>📝</span> Personal Details
        </h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Email</label>
            <input 
              type="email" 
              value={auth.currentUser?.email || ''} 
              disabled
              className="w-full bg-slate-100 dark:bg-slate-900 border-none p-3 rounded-xl text-slate-800 dark:text-white opacity-70 cursor-not-allowed"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
              <input 
                type="text" 
                required
                value={profile.name}
                onChange={e => setProfile({...profile, name: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-800 dark:text-white focus:border-primary-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Phone Number</label>
              <input 
                type="tel" 
                required
                value={profile.phone}
                onChange={e => setProfile({...profile, phone: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-800 dark:text-white focus:border-primary-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Default Address</label>
            <textarea 
              rows={2}
              value={profile.addressLine}
              onChange={e => setProfile({...profile, addressLine: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-800 dark:text-white focus:border-primary-500 outline-none transition-colors"
              placeholder="123 Main St, Apt 4B"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Landmark</label>
              <input 
                type="text" 
                value={profile.landmark}
                onChange={e => setProfile({...profile, landmark: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-800 dark:text-white focus:border-primary-500 outline-none transition-colors"
                placeholder="Near the park"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Pincode</label>
              <input 
                type="text" 
                value={profile.pincode}
                onChange={e => setProfile({...profile, pincode: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-800 dark:text-white focus:border-primary-500 outline-none transition-colors"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-4 rounded-xl shadow-lg shadow-primary-500/30 transition-transform active:scale-95 disabled:opacity-70 mt-4"
          >
            {saving ? 'Saving...' : 'Update Details'}
          </button>
        </form>
      </div>

      {/* Security Section */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
            <span>🔒</span> Security & Password
          </h2>
          
          {!showPasswordChange ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Current Password</label>
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="font-mono text-slate-600 dark:text-slate-400">••••••••••••</span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">ENCRYPTED</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-2">
                  For your security, passwords are hashed and cannot be shown in plain text.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => setShowPasswordChange(true)}
                  className="w-full border-2 border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 font-bold py-3 rounded-xl transition-colors"
                >
                  Change Password
                </button>
                <button 
                  onClick={handleResetEmail}
                  className="w-full font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 py-2 transition-colors"
                >
                  Send Password Reset Link via Email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Current Password</label>
                <input 
                  type="password" 
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-800 dark:text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">New Password</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-800 dark:text-white focus:border-primary-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword('');
                    setNewPassword('');
                  }}
                  className="flex-1 font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={passwordLoading}
                  className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white font-black py-3 rounded-xl shadow-lg disabled:opacity-70 transition-colors"
                >
                  {passwordLoading ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
