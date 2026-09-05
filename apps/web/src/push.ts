import { Capacitor } from '@capacitor/core';

let initialized = false;

/**
 * Push notifications are intentionally not auto-registered on app startup.
 *
 * The Android build can run without Firebase/FCM configuration, and native
 * push is not a core dependency for authentication or chat. Registering the
 * native push plugin immediately after account creation can terminate the
 * Android process on devices where FCM is not configured.
 *
 * Keep this function as a safe no-op until FCM is configured for the Android
 * application. Messaging must remain usable without optional push setup.
 */
export async function initPushNotifications() {
  if (initialized || !localStorage.getItem('gm_token')) return;
  if (Capacitor.getPlatform() === 'web') return;

  // Do not invoke the native PushNotifications plugin automatically.
  initialized = true;
}
