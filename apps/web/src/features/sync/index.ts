export const syncFeature = {
  id: 'sync',
  scope: [
    'multi-device',
    'message-sync',
    'read-state-sync',
    'draft-sync',
    'settings-sync',
    'device-trust',
    'cloud-backup',
    'encrypted-backup',
    'restore',
    'account-export',
    'offline-queue',
    'conflict-recovery'
  ] as const
};
