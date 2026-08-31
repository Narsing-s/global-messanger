import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { api } from './api';

let initialized = false;

export async function initPushNotifications() {
  if (initialized || !localStorage.getItem('gm_token')) return;
  initialized = true;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token: Token) => {
      try {
        await api.registerDevice(token.value, Capacitor.getPlatform());
      } catch (error) {
        console.warn('Push device registration failed', error);
      }
    });

    PushNotifications.addListener('registrationError', error => {
      console.warn('Push registration error', error);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', action => {
      const conversationId = action.notification.data?.conversationId;
      if (conversationId) {
        window.dispatchEvent(new CustomEvent('gm:open-conversation', { detail: { conversationId } }));
      }
    });
  } catch (error) {
    if (Capacitor.getPlatform() === 'web') return;
    console.warn('Push notifications unavailable', error);
  }
}
