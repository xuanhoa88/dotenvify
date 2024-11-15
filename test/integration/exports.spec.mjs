import { createRequire } from "module";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { expect } from "chai";
import sinon from "sinon";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

describe("exports", () => {
  let _processEnvBackup;

  before("backup the original `process.env` object", () => {
    _processEnvBackup = process.env;
  });

  beforeEach("setup the `process.env` copy", () => {
    process.env = { ..._processEnvBackup };
  });

  after("restore the original `process.env` object", () => {
    process.env = _processEnvBackup;
  });

  beforeEach("stub `process.cwd()`", () => {
    sinon.stub(process, "cwd").returns(resolve(__dirname, "fixtures", "env"));
  });

  afterEach("restore `process.cwd()`", () => {
    process.cwd.restore();
  });

  describe("CommonJS", () => {
    it("should load module using require", () => {
      const dotenv = require("../../src/envify"); // self-require

      expect(dotenv).to.include.keys([
        "listFiles",
        "config",
        "parse",
        "load",
        "unload",
      ]);
    });
  });

  describe("ES Module", () => {
    const dotenvPath = resolve("./src/envify.js");
    it("should load module using import", async () => {
      const dotenv = await import(dotenvPath); // self-import
      expect(dotenv).to.include.keys([
        "listFiles",
        "config",
        "parse",
        "load",
        "unload",
        "default",
      ]);
    });
  });
});
