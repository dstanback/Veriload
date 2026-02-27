// Pre-load this file via --require to mock "server-only" for scripts running outside Next.js
const Module = require("module");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") {
    return require.resolve("../tests/support/server-only.ts");
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
