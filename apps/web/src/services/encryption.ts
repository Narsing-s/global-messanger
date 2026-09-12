export type DeviceKeyState = { publicKey?: string; version?: number; verified?: boolean };

export function getDeviceKeyState(): DeviceKeyState {
  try { return JSON.parse(localStorage.getItem('gm_device_key_state') || '{}'); } catch { return {}; }
}

export function setDeviceKeyState(state: DeviceKeyState) {
  localStorage.setItem('gm_device_key_state', JSON.stringify(state));
}
