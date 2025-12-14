import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kestipro.app',
  appName: 'Kesti Pro',
  webDir: 'build',
  server: {
    url: 'https://kestipro.com/login',
    allowNavigation: ['kestipro.com', '*.kestipro.com', '*.supabase.co']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff'
    }
  }
};

export default config;
