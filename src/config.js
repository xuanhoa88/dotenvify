require("./envify").config({
  ...require("./env-options")(),
  ...require("./cli-options")(),
});
