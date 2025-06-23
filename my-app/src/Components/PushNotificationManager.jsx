import { useEffect } from 'react';
import axios from 'axios';

const PushNotificationManager = ({ userId }) => {
  useEffect(() => {
    if (!userId || !('serviceWorker' in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Check if push is supported
        if (!('PushManager' in window)) return;

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: '<YOUR_VAPID_PUBLIC_KEY>'  // Replace this!
        });

        // Send subscription to server
        await axios.post('/api/save-subscription', {
          userId,
          subscription
        });

        console.log('Push subscription saved successfully');
      } catch (error) {
        console.error('Push registration failed:', error);
      }
    };

    registerServiceWorker();
  }, [userId]);

  return null;
};

export default PushNotificationManager;
