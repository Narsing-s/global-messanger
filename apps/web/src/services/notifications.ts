export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  return new Notification(title, options);
}
