module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Inlined shared folder — EAS Build only uploads the project
      // folder, so importing from a sibling apps/_shared failed in
      // the cloud. Each app keeps its own copy under src/shared.
      ["module-resolver", { alias: { "@shared": "./src/shared" } }],
    ],
  };
};
