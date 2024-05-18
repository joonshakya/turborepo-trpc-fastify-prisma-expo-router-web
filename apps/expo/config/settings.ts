import Constants from "expo-constants";

const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost?.split(":")[0] || "localhost";
const apiUrl = `http://${localhost}:4000`;

const wsUrl = `ws://${localhost}:4000`;

// console.log({
//   apiUrl,
//   wsUrl,
// });

export const storageDomain = "https://d1d6nnj4w5qin.cloudfront.net";

const settings = {
  dev: {
    apiUrl,
    wsUrl,
  },
  prod: {
    apiUrl: "https://heerhack-2024.joon.com.np",
    wsUrl: "wss://heerhack-2024.joon.com.np",
  },
};

const getCurrentSettings = () => {
  // eslint-disable-next-line no-undef
  if (__DEV__) return settings.dev;
  return settings.prod;
};

export default getCurrentSettings();
