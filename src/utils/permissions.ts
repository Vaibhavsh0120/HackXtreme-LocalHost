import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const permission = Platform.select({
      ios: PERMISSIONS.IOS.MICROPHONE,
      android: PERMISSIONS.ANDROID.RECORD_AUDIO,
    });

    if (!permission) return false;

    const result = await check(permission);

    if (result === RESULTS.GRANTED) {
      return true;
    }

    if (result === RESULTS.DENIED) {
      const requestResult = await request(permission);
      return requestResult === RESULTS.GRANTED;
    }

    return false;
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
};
