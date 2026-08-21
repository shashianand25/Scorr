module.exports = {
  extends: ["expo"],
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx", ".d.ts"],
      },
    },
  },
  rules: {
    "import/namespace": "off",
    "import/no-unresolved": "off",
    "import/first": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/array-type": "off",
    "react/display-name": "off",
    "react-hooks/exhaustive-deps": "warn",
  },
  ignorePatterns: [
    "/dist/*",
    "node_modules/",
    ".expo/",
    "coverage/",
  ],
};
