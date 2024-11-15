const ENV_OPTIONS = {
  NODE_ENV: "node_env",
  DEFAULT_NODE_ENV: "default_node_env",
  ENVIFY_PATH: "path",
  ENVIFY_PATTERN: "pattern",
  ENVIFY_ENCODING: "encoding",
  ENVIFY_PURGE_DOTENV: "purge_dotenv",
  ENVIFY_DEBUG: "debug",
  ENVIFY_SILENT: "silent",
};

/**
 * Get environment variable defined options for `envify#config()`.
 *
 * @param {object} [env=process.env]
 * @return {{node_env?: string, default_node_env?: string, path?: string, encoding?: string, purge_dotenv?: string, silent?: string}}
 */
module.exports = function env_options(env = process.env) {
  return Object.keys(ENV_OPTIONS).reduce((options, key) => {
    if (Object.hasOwn(env, key)) {
      options[ENV_OPTIONS[key]] = env[key];
    }
    return options;
  }, {});
};
