import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sandrogarcia.tvcinema',
  appName: 'TV & Cinema',
  webDir: 'out',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000'
    }
  }
};

export default config;
