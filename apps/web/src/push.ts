import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { api } from './api';

let initialized = false;

export async function initPushNotifications() {
  if (initialized || !localStorage.getItem('gm_token')) return;

  // Capacitor's native push plugin is not a browser push implementation.
  // Returning early keeps local web development quiet and avoids expected
  // registration warnings in Chrome/Edge/Firefox.
  if (Capacitor.getPlatform() === 'web') return;

  initialized = true;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token: Token) => {
      try {
        await api.registerDevice(token.value, Capacitor.getPlatform());
      } catch {
        // Push registration should never interrupt or spam the chat UI.
      }
    });

    PushNotifications.addListener('registrationError', () => {
      // Native push can fail because of device/store configuration. The app
      // remains fully usable without push registration.
    });

    PushNotifications.addListener('pushNotificationActionPerformed', action => {
      const conversationId = action.notification.data?.conversationId;
      if (conversationId) {
        window.dispatchEvent(new CustomEvent('gm:open-conversation', { detail: { conversationId } }));
      }
    });
  } catch {
    // Push is an enhancement, not a dependency for messaging.
  }
}
