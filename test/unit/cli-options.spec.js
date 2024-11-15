const { expect } = require("chai");
const cli_options = require("../../src/cli-options");

describe("cli_options", () => {
  it("maps related `--switches` to options", () => {
    expect(
      cli_options([
        "node",
        "-r",
        "envify/config",
        "--node-env",
        "production",
        "--default-node-env",
        "development",
        "--envify-path",
        "/path/to/project",
        "--envify-encoding",
        "latin1",
        "--envify-purge-dotenv",
        "yes",
        "--envify-debug",
        "enabled",
        "--envify-silent",
        "true",
      ])
    ).to.deep.equal({
      node_env: "production",
      default_node_env: "development",
      path: "/path/to/project",
      encoding: "latin1",
      purge_dotenv: "yes",
      debug: "enabled",
      silent: "true",
    });
  });

  it("supports `--switch=value` syntax", () => {
    expect(
      cli_options([
        "node",
        "-r",
        "envify/config",
        "--node-env=production",
        "--default-node-env=development",
        "--envify-path=/path/to/project",
        "--envify-pattern=config/[local/].env[.node_env]",
        "--envify-encoding=latin1",
        "--envify-purge-dotenv=yes",
        "--envify-debug=enabled",
        "--envify-silent=true",
      ])
    ).to.deep.equal({
      node_env: "production",
      default_node_env: "development",
      path: "/path/to/project",
      pattern: "config/[local/].env[.node_env]",
      encoding: "latin1",
      purge_dotenv: "yes",
      debug: "enabled",
      silent: "true",
    });
  });

  it("doesn't include undefined switches", () => {
    expect(
      cli_options([
        "node",
        "-r",
        "envify/config",
        "--default-node-env",
        "development",
        "--envify-encoding",
        "latin1",
      ])
    ).to.have.keys(["default_node_env", "encoding"]);
  });

  it("ignores unrelated `--switches`", () => {
    expect(cli_options(["--foo", "bar", "--baz=qux"])).to.be.empty;
  });
});
