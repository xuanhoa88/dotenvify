const CLI_OPTIONS = {
  "--node-env": "node_env",
  "--default-node-env": "default_node_env",
  "--envify-path": "path",
  "--envify-pattern": "pattern",
  "--envify-encoding": "encoding",
  "--envify-purge-dotenv": "purge_dotenv",
  "--envify-debug": "debug",
  "--envify-silent": "silent",
};

const CLI_OPTION_KEYS = Object.keys(CLI_OPTIONS);

/**
 * Get CLI options for `envify#config()`.
 *
 * @param {string[]} [argv=process.argv]
 * @return {{node_env?: string, default_node_env?: string, path?: string, encoding?: string, purge_dotenv?: string, silent?: string}}
 */
module.exports = function cli_options(argv = process.argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg in CLI_OPTIONS) {
      options[CLI_OPTIONS[arg]] = argv[++i];
      continue;
    }

    for (let j = 0; j < CLI_OPTION_KEYS.length; j++) {
      const flag = CLI_OPTION_KEYS[j];

      if (arg.startsWith(flag + "=")) {
        options[CLI_OPTIONS[flag]] = arg.slice(flag.length + 1);
        break;
      }
    }
  }
  return options;
};
