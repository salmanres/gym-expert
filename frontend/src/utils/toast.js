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
    icon: <FiCheckCircle size={20} className="text-emerald-400 flex-shrink-0" />,
    ...options
  });
};

toast.error = (content, options) => {
  notificationSound.playErrorSound();
  return originalToast.error(content, {
    icon: <FiXCircle size={20} className="text-rose-400 flex-shrink-0" />,
    ...options
  });
};

toast.info = (content, options) => {
  notificationSound.playSuccessSound();
  return originalToast.info(content, {
    icon: <FiInfo size={20} className="text-sky-400 flex-shrink-0" />,
    ...options
  });
};

toast.warning = (content, options) => {
  notificationSound.playErrorSound();
  return originalToast.warning(content, {
    icon: <FiAlertTriangle size={20} className="text-amber-400 flex-shrink-0" />,
    ...options
  });
};

toast.warn = (content, options) => {
  notificationSound.playErrorSound();
  return originalToast.warn(content, {
    icon: <FiAlertTriangle size={20} className="text-amber-400 flex-shrink-0" />,
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
