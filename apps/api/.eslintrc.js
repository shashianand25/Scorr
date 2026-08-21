module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2022: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": "off",
    "no-control-regex": "off",
  },
  ignorePatterns: [
    "node_modules/",
    "coverage/",
  ],
};
