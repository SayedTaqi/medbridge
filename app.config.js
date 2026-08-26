export default ({config}) => ({
  ...config,
  name:'MedBridge',
  slug:'medbridge',
  version:'1.0.0',
  orientation:'portrait',
  plugins:['expo-location','expo-notifications'],
  android:{...(config.android||{}),package:'com.medbridge.app',permissions:['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION','POST_NOTIFICATIONS']},
  ios:{...(config.ios||{}),bundleIdentifier:'com.medbridge.app',infoPlist:{...(config.ios?.infoPlist||{}),NSLocationWhenInUseUsageDescription:'MedBridge uses your location to find nearby verified pharmacies.'}},
  extra:{...(config.extra||{}),eas:{projectId:process.env.EXPO_PUBLIC_EAS_PROJECT_ID}}
});