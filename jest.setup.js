/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { configure: jest.fn(), addEventListener: jest.fn(() => jest.fn()) },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => 'jeton-test'),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const chaine = new Proxy(function () {}, { get: () => () => chaine, apply: () => chaine });
  const R = require('react');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => true,
    withTiming: (v) => v,
    withRepeat: (v) => v,
    withSequence: (...v) => v[0],
    ReduceMotion: { System: 'system' },
    SlideInLeft: chaine, SlideInRight: chaine, SlideOutLeft: chaine, SlideOutRight: chaine,
    SlideInUp: chaine, SlideOutUp: chaine, FadeInDown: chaine,
    R,
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
