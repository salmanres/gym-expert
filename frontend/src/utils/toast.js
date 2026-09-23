import React from 'react';
import { toast as originalToast } from 'react-toastify';
import { FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import notificationSound from './notificationSound';

// Custom toast wrapper that plays audio sound feedback
const toast = (content, options) => originalToast(content, options);

// Attach helper methods and play synthesized audio tones
toast.success = (content, options) => {
  notificationSound.playSuccessSound();
  return originalToast.success(content, {
    icon: (
      <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
        <FiCheckCircle size={16} />
      </div>
    ),
    ...options
  });
};

toast.error = (content, options) => {
  notificationSound.playErrorSound();
  return originalToast.error(content, {
    icon: (
      <div className="w-7 h-7 rounded-xl bg-rose-100 text-[#CA0410] border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
        <FiXCircle size={16} />
      </div>
    ),
    ...options
  });
};

toast.info = (content, options) => {
  notificationSound.playSuccessSound();
  return originalToast.info(content, {
    icon: (
      <div className="w-7 h-7 rounded-xl bg-rose-50 text-[#CA0410] border border-rose-200 flex items-center justify-center shrink-0 shadow-2xs">
        <FiInfo size={16} />
      </div>
    ),
    ...options
  });
};

toast.warning = (content, options) => {
  notificationSound.playErrorSound();
  return originalToast.warning(content, {
    icon: (
      <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
        <FiAlertTriangle size={16} />
      </div>
    ),
    ...options
  });
};

toast.warn = (content, options) => {
  notificationSound.playErrorSound();
  return originalToast.warn(content, {
    icon: (
      <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
        <FiAlertTriangle size={16} />
      </div>
    ),
    ...options
  });
};

toast.dismiss = (...args) => originalToast.dismiss(...args);
toast.clearWaitingQueue = (...args) => originalToast.clearWaitingQueue(...args);
toast.isActive = (...args) => originalToast.isActive(...args);
toast.update = (...args) => originalToast.update(...args);
toast.done = (...args) => originalToast.done(...args);
toast.promise = (...args) => originalToast.promise(...args);

export { toast };
export default toast;
