module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          // Inlined shared folder — apps/_shared was a sibling of the
          // app root and EAS Build only uploads the project folder, so
          // imports of "@shared/..." failed to resolve in the cloud
          // build environment. Each app now keeps its own copy under
          // src/shared. Run apps/sync-shared.ps1 if you change anything
          // in apps/_shared and want to propagate.
          alias: { "@shared": "./src/shared" },
        },
      ],
    ],
  };
};
