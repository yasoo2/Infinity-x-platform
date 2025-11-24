
import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";

export default [
  // 1. General recommended rules for all files
  pluginJs.configs.recommended,

  // 2. Backend specific configuration for Node.js environment
  {
    files: ['backend/**/*.js', 'backend/**/*.mjs', 'backend/**/*.cjs', '*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node, // Use Node.js global variables
      },
    },
  },

  // 3. Frontend specific configuration for Browser environment
  {
    files: ['dashboard-x/**/*.{js,jsx}', 'public-site/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser, // Use Browser global variables
      },
    },
  },

  // 4. React specific configuration, applied ONLY to the dashboard
  {
    files: ['dashboard-x/**/*.{js,jsx}'],
    ...pluginReactConfig,
    settings: {
        react: {
            version: 'detect' // Automatically detect the React version
        }
    },
    rules: {
      ...pluginReactConfig.rules,
      "react/react-in-jsx-scope": "off", // Not needed with modern JSX transform
      "react/prop-types": "off", // Disabled as per original config
    },
  },

  // 5. Global rule overrides - applies to all files
  {
    rules: {
      "no-unused-vars": ["warn", { "args": "none" }], // Warn about unused variables, but not args
      "no-undef": "error" // Keep undefined variable checks as a critical error
    }
  }
];
