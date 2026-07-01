import { motion } from "framer-motion";
import CustomerProfile from "../CustomerProfile";

export default function AccountSettings() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl text-white font-bold mb-4">Account Settings</h2>
      <CustomerProfile />
    </div>
  );
}
