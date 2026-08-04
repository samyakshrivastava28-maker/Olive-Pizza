import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { useWebsiteConfigStore } from '../stores/websiteConfigStore';

export const AnnouncementBar: React.FC = () => {
  const activeAnnouncement = useWebsiteConfigStore((state) => state.activeAnnouncement);
  const dismissAnnouncement = useWebsiteConfigStore((state) => state.dismissAnnouncement);

  if (!activeAnnouncement) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        style={{
          backgroundColor: activeAnnouncement.backgroundColor || '#f97316',
          color: activeAnnouncement.textColor || '#ffffff',
        }}
        className="w-full relative z-50 text-xs md:text-sm font-semibold overflow-hidden shadow-md"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center justify-center gap-2 text-center truncate">
            {activeAnnouncement.emoji && <span>{activeAnnouncement.emoji}</span>}
            <span className="truncate">{activeAnnouncement.text}</span>
            {activeAnnouncement.link && (
              <Link
                to={activeAnnouncement.link}
                className="underline hover:opacity-80 inline-flex items-center gap-1 ml-1"
              >
                {activeAnnouncement.linkText || 'Learn More'}
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>

          {activeAnnouncement.closeable && (
            <button
              onClick={() => dismissAnnouncement(activeAnnouncement.id)}
              className="p-1 rounded-full hover:bg-black/10 transition-colors"
              aria-label="Dismiss Announcement"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
export default AnnouncementBar;
