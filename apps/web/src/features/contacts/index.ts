export const contactsFeature = {
  id: 'contacts',
  scope: [
    'contact-discovery',
    'phone-verification',
    'email-verification',
    'qr-scanner',
    'qr-profile-sharing',
    'username-availability',
    'contact-requests',
    'privacy-exceptions',
    'block-report'
  ] as const
};
