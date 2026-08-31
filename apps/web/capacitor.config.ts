import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.globalmessenger.app',
  appName: 'Global Messenger',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  android: {
    backgroundColor: '#f7f8fc'
  }
};

export default config;
