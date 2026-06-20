import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.madoromi',
  appName: 'Madoromi',
  webDir: 'dist',
  backgroundColor: '#1a1430',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#876ac8',
    },
  },
};

export default config;
