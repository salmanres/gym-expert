import { toast as originalToast } from 'react-toastify';
import notificationSound from './notificationSound';

// Custom toast wrapper that plays audio sound feedback
const toast = (content, options) => originalToast(content, options);

// Attach helper methods and play synthesized audio tones
toast.success = (content, options) => {
  notificationSound.playSuccessSound();
  return originalToast.success(content, options);
};

toast.error = (content, options) => {
  notificationSound.playErrorSound();
  return originalToast.error(content, options);
};

toast.info = (content, options) => {
  notificationSound.playSuccessSound();
  return originalToast.info(content, options);
};

toast.warning = (content, options) => {
  notificationSound.playErrorSound();
  return originalToast.warning(content, options);
};

toast.warn = (content, options) => {
  notificationSound.playErrorSound();
  return originalToast.warn(content, options);
};

toast.dismiss = (...args) => originalToast.dismiss(...args);
toast.clearWaitingQueue = (...args) => originalToast.clearWaitingQueue(...args);
toast.isActive = (...args) => originalToast.isActive(...args);
toast.update = (...args) => originalToast.update(...args);
toast.done = (...args) => originalToast.done(...args);
toast.promise = (...args) => originalToast.promise(...args);

export { toast };
export default toast;
