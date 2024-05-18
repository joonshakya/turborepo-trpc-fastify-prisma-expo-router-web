import type { Config } from "tailwindcss";

import colors from "@acme/common-utils/colors";
import baseConfig from "@acme/tailwind-config";

export default {
  content: ["./app/**/*.tsx"],
  presets: [baseConfig],
  theme: {
    extend: {
      colors,
    },
  },
  plugins: [],
  colors,
} satisfies Config;
