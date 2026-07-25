import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { GlassCard, GlassButton } from '../ui/glass/GlassSystem';

interface CancelOrderReasonModalProps {
  isOpen: boolean;
  orderNumber: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

const PRESET_REASONS = [
  'Item out of stock',
  'Kitchen too busy',
  'Outside delivery area',
  'Restaurant closing soon',
  'Customer requested cancellation',
];

export const CancelOrderReasonModal: React.FC<CancelOrderReasonModalProps> = ({
  isOpen,
  orderNumber,
  onClose,
  onSubmit,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const finalReason = selectedReason === 'Other' ? customReason.trim() : (selectedReason || customReason.trim());
    if (!finalReason) {
      setError('Please select or enter a cancellation reason.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit(finalReason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <GlassCard className="w-full max-w-md p-6 relative border-red-500/20 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-red-500/10 rounded-full text-red-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Cancel Order {orderNumber}</h3>
            <p className="text-xs text-slate-400">Select a mandatory cancellation reason</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-2 mb-4">
          {PRESET_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => {
                setSelectedReason(reason);
                setError('');
              }}
              className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition-all ${
                selectedReason === reason
                  ? 'bg-red-500/20 border-red-500 text-white'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {reason}
            </button>
          ))}

          <button
            onClick={() => {
              setSelectedReason('Other');
              setError('');
            }}
            className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition-all ${
              selectedReason === 'Other'
                ? 'bg-red-500/20 border-red-500 text-white'
                : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Other / Custom Reason
          </button>
        </div>

        {selectedReason === 'Other' && (
          <div className="mb-4">
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Enter custom cancellation reason..."
              className="w-full p-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 resize-none h-24"
            />
          </div>
        )}

        <div className="flex space-x-3 pt-2">
          <GlassButton
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Back
          </GlassButton>
          <GlassButton
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold"
          >
            {loading ? 'Cancelling...' : 'Confirm Cancel'}
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
};
export default CancelOrderReasonModal;
