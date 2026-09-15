import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, RefreshCw, Smartphone, ExternalLink, CheckCircle2, AlertCircle, MessageSquare, Clock } from 'lucide-react';
import { TruecallerService, TruecallerSessionStatusResponse } from '../../plugins/Truecaller';

interface TruecallerQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  deepLink: string;
  requestId: string;
  onSuccess: (status: TruecallerSessionStatusResponse) => void;
  onError: (errorMsg: string) => void;
  onSwitchToSms?: () => void;
  onRefreshSession?: () => void;
}

type VerificationStep = 'WAITING_FOR_SCAN' | 'WAITING_FOR_CONSENT' | 'VERIFYING' | 'VERIFIED' | 'TIMED_OUT' | 'FAILED';

export default function TruecallerQRModal({
  isOpen,
  onClose,
  deepLink,
  requestId,
  onSuccess,
  onError,
  onSwitchToSms,
  onRefreshSession
}: TruecallerQRModalProps) {
  const [step, setStep] = useState<VerificationStep>('WAITING_FOR_SCAN');
  const [timeLeft, setTimeLeft] = useState<number>(75);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen || !requestId) {
      setStep('WAITING_FOR_SCAN');
      setTimeLeft(75);
      setErrorMessage('');
      return;
    }

    setStep('WAITING_FOR_SCAN');
    setTimeLeft(75);
    setErrorMessage('');
    let isMounted = true;

    // 1. Countdown Timer (75 seconds)
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (isMounted) {
            setStep('TIMED_OUT');
            setErrorMessage('Truecaller verification could not be completed within the time limit.');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Status Polling Interval (every 2.2 seconds)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await TruecallerService.pollWebSession(requestId);
        if (!isMounted) return;

        if (res.status === 'VERIFIED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setStep('VERIFIED');
          setTimeout(() => {
            if (isMounted) {
              onSuccess(res);
            }
          }, 800);
        } else if (res.status === 'FAILED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setStep('FAILED');
          setErrorMessage(res.error || 'Truecaller verification was declined or failed.');
          onError(res.error || 'Truecaller verification failed.');
        } else {
          // Progress stages visually as time elapses
          setStep(prev => (prev === 'WAITING_FOR_SCAN' && timeLeft < 65 ? 'WAITING_FOR_CONSENT' : prev));
        }
      } catch {
        // Keep polling until countdown expires
      }
    }, 2200);

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, requestId]);

  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    deepLink
  )}&format=svg`;

  const handleRetry = () => {
    if (onRefreshSession) {
      onRefreshSession();
    } else {
      setStep('WAITING_FOR_SCAN');
      setTimeLeft(75);
      setErrorMessage('');
    }
  };

  const handleSwitchToSms = () => {
    onClose();
    if (onSwitchToSms) {
      onSwitchToSms();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header with Truecaller Branding */}
          <div className="text-center space-y-2 mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0052CC]/10 text-[#0052CC] mb-1 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-white">
              Verify with Truecaller
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
              Scan with the <strong>Truecaller App</strong> or your phone camera to verify your number instantly.
            </p>
          </div>

          {/* Body Section based on verification step */}
          <div className="flex flex-col items-center justify-center p-4 bg-stone-50 dark:bg-stone-950/50 rounded-2xl border border-stone-100 dark:border-stone-800">
            {step === 'VERIFIED' ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-10 flex flex-col items-center text-center space-y-3"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="font-bold text-lg text-stone-900 dark:text-white">
                  Verification Successful!
                </h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Verified phone identity confirmed. Signing you in...
                </p>
              </motion.div>
            ) : step === 'TIMED_OUT' || step === 'FAILED' ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-6 flex flex-col items-center text-center space-y-3 w-full"
              >
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-base text-stone-900 dark:text-white">
                  {step === 'TIMED_OUT' ? 'Verification Timed Out' : 'Verification Unsuccessful'}
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 max-w-xs">
                  {errorMessage || 'Truecaller verification could not be completed.'}
                </p>

                {/* Direct Fallback Action Buttons */}
                <div className="w-full pt-2 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleSwitchToSms}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Verify via SMS OTP instead</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRetry}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Truecaller Again</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                {/* QR Code Container */}
                <div className="relative p-3 bg-white rounded-xl shadow-inner border border-stone-200">
                  <img
                    src={qrImageUrl}
                    alt="Truecaller QR Code"
                    className="w-48 h-48 rounded-lg object-contain"
                  />
                </div>

                {/* Progress / Status Indicators */}
                <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
                  <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0052CC]" />
                    <span>
                      {step === 'WAITING_FOR_CONSENT'
                        ? 'Tap "Continue with Olive Pizza" on your phone...'
                        : 'Waiting for scan & consent...'}
                    </span>
                  </div>

                  {/* Countdown Timer Badge */}
                  <div className="flex items-center gap-1 text-[11px] text-stone-400 dark:text-stone-500">
                    <Clock className="w-3 h-3" />
                    <span>Valid for {timeLeft}s</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {step !== 'VERIFIED' && step !== 'TIMED_OUT' && step !== 'FAILED' && (
            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-col gap-2">
              <a
                href={deepLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-[#0052CC] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                <span>Tap to Open in Truecaller App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleSwitchToSms}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-stone-500 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400 py-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Switch to SMS OTP Verification</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
