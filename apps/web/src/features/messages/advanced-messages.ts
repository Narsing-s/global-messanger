import { messagingApi } from '../../services/advanced-api';

export const advancedMessages = messagingApi;

export async function shareCurrentLocation(conversationId: string, live = false, durationMinutes = 30) {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
  if (live) {
    const expiresAt = new Date(Date.now() + durationMinutes * 60_000).toISOString();
    return messagingApi.liveLocation(conversationId, position.coords.latitude, position.coords.longitude, expiresAt);
  }
  return messagingApi.location(conversationId, position.coords.latitude, position.coords.longitude);
}
