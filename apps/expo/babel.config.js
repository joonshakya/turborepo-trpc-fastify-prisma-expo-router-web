const path = require("path");
const loadConfig = require("tailwindcss/loadConfig");

/** @type {import("tailwindcss").Config | null} */
let _tailwindConfig = null;
/**
 * Transpiles tailwind.config.ts for babel
 * Fix until nativewind babel plugin supports tailwind.config.ts files
 */
function lazyLoadConfig() {
  return (
    _tailwindConfig ?? loadConfig(path.join(__dirname, "tailwind.config.ts"))
  );
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
      [
        "nativewind/babel",
        {
          tailwindConfig: lazyLoadConfig(),
        },
      ],
    ],
  };
};