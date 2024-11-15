const fs = require("fs");
const { resolve } = require("path");

const DEFAULT_PATTERN = ".env[.node_env][.local]";
const LOCAL_PLACEHOLDER_REGEX = /\[(\W*\blocal\b\W*)]/g;
const NODE_ENV_PLACEHOLDER_REGEX = /\[(\W*\b)node_env(\b\W*)]/g;
const CONFIG_OPTION_KEYS = [
  "node_env",
  "default_node_env",
  "path",
  "pattern",
  "files",
  "encoding",
  "purge_dotenv",
  "silent",
];
const DOTENV_SUBSTITUTION_REGEX =
  /(\\)?(\$)(?!\()(\{?)([\w.]+)(?::?-((?:\$\{(?:\$\{(?:\$\{[^}]*\}|[^}])*}|[^}])*}|[^}])+))?(\}?)/gi;
const KEY_REGEX = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*/;
const QUOTE_REGEX = /^(['"`])/;
const CLOSING_QUOTE_REGEX = (quote) => new RegExp(`(?<!\\\\)${quote}`);

function _interpolate(value, processEnv, parsed) {
  return value.replace(
    DOTENV_SUBSTITUTION_REGEX,
    (
      match,
      escaped,
      dollarSign,
      openBrace,
      processKey,
      defaultValue,
      closeBrace
    ) => {
      if (escaped === "\\") {
        return match.slice(1); // retain escaped $ as literal
      }

      // Check if the variable exists in processEnv or parsed
      if (processEnv[processKey]) {
        if (processEnv[processKey] === parsed[processKey]) {
          return processEnv[processKey];
        }
        return _interpolate(processEnv[processKey], processEnv, parsed);
      }

      if (parsed[processKey]) {
        if (parsed[processKey] !== value) {
          return _interpolate(parsed[processKey], processEnv, parsed);
        }
      }

      if (defaultValue) {
        if (defaultValue.startsWith("$")) {
          return _interpolate(defaultValue, processEnv, parsed);
        }
        return defaultValue;
      }

      return "";
    }
  );
}

function _isStringEmpty(str) {
  for (let i = 0, l = str.length; i < l; i++) {
    const a = str.charCodeAt(i);
    if (
      (a < 9 || a > 13) &&
      a !== 32 &&
      a !== 133 &&
      a !== 160 &&
      a !== 5760 &&
      a !== 6158 &&
      (a < 8192 || a > 8205) &&
      a !== 8232 &&
      a !== 8233 &&
      a !== 8239 &&
      a !== 8287 &&
      a !== 8288 &&
      a !== 12288 &&
      a !== 65279
    ) {
      return false;
    }
  }
  return true;
}

function _resolveValue(value) {
  const nextVal = value.toString().replace(/\\\$/g, "$");

  // if the value is wrapped in bacticks e.g. (`value`) then just return its value
  if (
    nextVal.indexOf("`") === 0 &&
    nextVal.lastIndexOf("`") === nextVal.length - 1
  ) {
    return nextVal.slice(1, nextVal.length - 1);
  }

  // if the value ends in an asterisk then just return its value
  if (nextVal.lastIndexOf("*") === nextVal.length - 1) {
    return nextVal.slice(0, Math.max(0, nextVal.length - 1));
  }

  // Boolean
  if (["true", "false"].includes(nextVal.toLowerCase())) {
    return nextVal.toLowerCase() === "true";
  }

  // Number
  if (
    typeof nextVal === "string" &&
    !_isStringEmpty(nextVal) &&
    !Number.isNaN(Number(nextVal))
  ) {
    return Number(nextVal);
  }

  // Array/Object
  const isArray = nextVal.startsWith("[") && nextVal.endsWith("]");
  if (isArray || (nextVal.startsWith("{") && nextVal.endsWith("}"))) {
    try {
      return JSON.parse(nextVal);
    } catch {
      return isArray ? [] : {};
    }
  }

  return nextVal;
}

/**
 * Compose a filename from a given `patten`.
 *
 * @param {string} pattern
 * @param {object} [options]
 * @param {boolean} [options.local]
 * @param {string} [options.node_env]
 * @return {string} filename
 */
function composeFilename(pattern, options) {
  let filename = pattern.toString();

  filename = filename.replace(
    LOCAL_PLACEHOLDER_REGEX,
    options && options.local ? "$1" : ""
  );

  filename = filename.replace(
    NODE_ENV_PLACEHOLDER_REGEX,
    options && options.node_env ? `$1${options.node_env}$2` : ""
  );

  return filename;
}

/**
 * Returns a list of existing `.env*` filenames depending on the given `options`.
 *
 * The resulting list is ordered by the env files'
 * variables overwriting priority from lowest to highest.
 *
 * This can also be referenced as "env files' environment cascade"
 * or "order of ascending priority."
 *
 * ⚠️ Note that the `.env.local` file is not listed for "test" environment,
 * since normally you expect tests to produce the same results for everyone.
 *
 * @param {object} [options] - `.env*` files listing options
 * @param {string} [options.node_env] - node environment (development/test/production/etc.)
 * @param {string} [options.path] - path to the working directory (default: `process.cwd()`)
 * @param {string} [options.pattern] - `.env*` files' naming convention pattern
 *                                       (default: ".env[.node_env][.local]")
 * @param {boolean} [options.debug] - turn on debug messages
 * @return {string[]}
 */
function listFiles(options = {}) {
  options.debug && debug("listing effective `.env*` files…");

  const { node_env, path = process.cwd(), pattern = DEFAULT_PATTERN } = options;

  const hasLocalPlaceholder = LOCAL_PLACEHOLDER_REGEX.test(pattern);

  const filenames = {};

  if (pattern === DEFAULT_PATTERN) {
    filenames[".env.defaults"] = ".env.defaults"; // for seamless transition from ".env + .env.defaults"
  }

  filenames[".env"] = composeFilename(pattern);

  if (hasLocalPlaceholder) {
    const envlocal = composeFilename(pattern, { local: true });

    if (node_env !== "test") {
      filenames[".env.local"] = envlocal;
    } else if (options.debug && fs.existsSync(resolve(path, envlocal))) {
      debug(
        '[!] note that `%s` is being skipped for "test" environment',
        envlocal
      );
    }
  }

  if (node_env && NODE_ENV_PLACEHOLDER_REGEX.test(pattern)) {
    filenames[".env.node_env"] = composeFilename(pattern, { node_env });

    if (hasLocalPlaceholder) {
      filenames[".env.node_env.local"] = composeFilename(pattern, {
        node_env,
        local: true,
      });
    }
  }

  return [
    ".env.defaults",
    ".env",
    ".env.local",
    ".env.node_env",
    ".env.node_env.local",
  ].reduce((list, basename) => {
    if (!filenames[basename]) {
      return list;
    }

    const filename = resolve(path, filenames[basename]);
    if (fs.existsSync(filename)) {
      options.debug && debug(">> %s", filename);
      list.push(filename);
    }

    return list;
  }, []);
}

/**
 * Parses a given file or a list of files.
 *
 * When a list of filenames is given, the files will be parsed and merged in the same order as given.
 *
 * @param {string|string[]} filenames - filename or a list of filenames to parse and merge
 * @param {{ encoding?: string, debug?: boolean }} [options] - parse options
 * @return {Object<string, string>} the resulting map of `{ env_var: value }` as an object
 */
function parse(filenames, options = {}) {
  const parseValue = (rawValue) => {
    const value = rawValue.trim();
    if (!value) return "";

    // Check if value starts with a quote
    const quoteMatch = value.match(QUOTE_REGEX);
    if (quoteMatch) {
      const [, quote] = quoteMatch;
      const content = value.slice(1, -1); // Remove quotes
      switch (quote) {
        case '"':
          return content
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\\\/g, "\\")
            .replace(/\\"/g, '"');
        case "'":
          return content;
        case "`":
          return content;
      }
    }

    // Handle unquoted value
    return value.replace(/\\\n\s*/g, "");
  };

  const parseFile = (filename) => {
    options.debug && debug('parsing "%s"...', filename);
    try {
      const parsed = {};
      const content = fs
        .readFileSync(
          filename,
          options.encoding ? { encoding: options.encoding } : "utf8"
        )
        .toString();

      // Normalize line endings
      const lines = content.replace(/\r\n?/g, "\n").split("\n");

      let currentKey = null;
      let currentValue = [];
      let inQuotedValue = false;
      let quoteChar = null;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Skip empty lines and comments when not in a quoted value
        if (!inQuotedValue && (!line.trim() || line.trim().startsWith("#"))) {
          continue;
        }

        if (!currentKey) {
          // Look for new key
          const keyMatch = line.match(KEY_REGEX);
          if (keyMatch) {
            currentKey = keyMatch[1];
            // Get the value part after the =
            let valueStart = line.slice(keyMatch[0].length);

            // Check if value starts with a quote
            const quoteMatch = valueStart.trim().match(QUOTE_REGEX);
            if (quoteMatch) {
              quoteChar = quoteMatch[1];
              inQuotedValue = true;
              // Check if quote closes on the same line
              const closingQuoteRegex = CLOSING_QUOTE_REGEX(quoteChar);
              const remainingValue = valueStart.trim().slice(1);
              const closingMatch = remainingValue.match(closingQuoteRegex);

              if (closingMatch) {
                // Single line quoted value
                parsed[currentKey] = parseValue(valueStart.trim());
                currentKey = null;
                inQuotedValue = false;
                quoteChar = null;
              } else {
                // Start of multi-line quoted value
                currentValue.push(valueStart.trim().slice(1));
              }
            } else {
              // Unquoted value
              if (valueStart.endsWith("\\")) {
                // Line continuation
                currentValue.push(valueStart.slice(0, -1).trim());
              } else {
                // Single line unquoted value
                parsed[currentKey] = parseValue(valueStart);
                currentKey = null;
              }
            }
          }
        } else {
          // Continuing a value
          if (inQuotedValue) {
            const closingQuoteRegex = CLOSING_QUOTE_REGEX(quoteChar);
            const closingMatch = line.match(closingQuoteRegex);

            if (closingMatch) {
              // End of quoted value
              currentValue.push(line.slice(0, closingMatch.index));
              parsed[currentKey] = parseValue(
                `${quoteChar}${currentValue.join("\n")}${quoteChar}`
              );
              currentKey = null;
              currentValue = [];
              inQuotedValue = false;
              quoteChar = null;
            } else {
              // Continue quoted value
              currentValue.push(line);
            }
          } else {
            // Continue unquoted value
            if (line.endsWith("\\")) {
              currentValue.push(line.slice(0, -1).trim());
            } else {
              currentValue.push(line.trim());
              parsed[currentKey] = parseValue(currentValue.join("\n"));
              currentKey = null;
              currentValue = [];
            }
          }
        }
      }

      // Handle any remaining value
      if (currentKey && currentValue.length > 0) {
        if (inQuotedValue) {
          parsed[currentKey] = parseValue(
            `${quoteChar}${currentValue.join("\n")}${quoteChar}`
          );
        } else {
          parsed[currentKey] = parseValue(currentValue.join("\n"));
        }
      }

      if (options.debug) {
        Object.keys(parsed).forEach((key) =>
          debug(">> %s=%s", key, parsed[key])
        );
      }
      return parsed;
    } catch (_err) {
      const { error } = failure(_err, options);
      throw error;
    }
  };

  return [...(Array.isArray(filenames) ? filenames : [filenames])]
    .filter((filename) => typeof filename === "string")
    .reduce(
      (result, filename) => Object.assign(result, parseFile(filename)),
      {}
    );
}

/**
 * Parses variables defined in given file(s) and assigns them to `process.env`.
 *
 * Variables that are already defined in `process.env` will not be overwritten,
 * thus giving a higher priority to environment variables predefined by the shell.
 *
 * If the loading is successful, an object with `parsed` property is returned.
 * The `parsed` property contains parsed variables' `key => value` pairs merged in order using
 * the "overwrite merge" strategy.
 *
 * If parsing fails for any of the given files, `process.env` is being left untouched,
 * and an object with `error` property is returned.
 * The `error` property, if present, references to the occurred error.
 *
 * @param {string|string[]} filenames - filename or a list of filenames to parse and merge
 * @param {object} [options] - file loading options
 * @param {string} [options.encoding="utf8"] - encoding of `.env*` files
 * @param {boolean} [options.debug=false] - turn on debug messages
 * @param {boolean} [options.silent=false] - suppress console errors and warnings
 * @return {{ error: Error } | { parsed: Object<string, string> }}
 */
function load(filenames, options = {}) {
  try {
    const parsed = parse(filenames, {
      encoding: options.encoding,
      debug: options.debug,
    });

    options.debug &&
      debug("safe-merging parsed environment variables into `process.env`…");

    const processEnv = Object.assign({}, process.env);

    for (const processKey of Object.keys(parsed)) {
      if (!Object.hasOwn(processEnv, processKey)) {
        options.debug && debug(">> process.env.%s", processKey);
        parsed[processKey] = _resolveValue(
          _interpolate(parsed[processKey], processEnv, parsed)
        );
      } else if (
        options.debug &&
        processEnv[processKey] !== parsed[processKey]
      ) {
        debug(
          "environment variable `%s` is predefined and not being overwritten",
          processKey
        );
      }
    }

    process.env = Object.assign(processEnv, parsed);

    return { parsed };
  } catch (_err) {
    return failure(_err, options);
  }
}

/**
 * Unload variables defined in a given file(s) from `process.env`.
 *
 * This function can gracefully resolve the following issue:
 *
 * In some cases, the original "dotenv" library can be used by one of the dependent npm modules.
 * It causes calling the original `dotenv.config()` that loads the `.env` file from your project before you can call `envify.config()`.
 * Such cases break `.env*` files priority because the previously loaded environment variables are treated as shell-defined thus having a higher priority.
 *
 * Unloading the previously loaded `.env` file can be activated when using the `envify.config()` with the `purge_dotenv` option set to `true`.
 *
 * @param {string|string[]} filenames - filename or a list of filenames to unload
 * @param {object} [options] - `fs.readFileSync` options
 */
function unload(filenames, options = {}) {
  const parsed = parse(filenames, options);
  Object.keys(parsed).forEach((processKey) => {
    if (process.env[processKey] === parsed[processKey]) {
      delete process.env[processKey];
    }
  });
}

/**
 * Returns effective (computed) `node_env`.
 *
 * @param {object} [options]
 * @param {string} [options.node_env]
 * @param {string} [options.default_node_env]
 * @param {boolean} [options.debug]
 * @return {string|undefined} node_env
 */
function getEffectiveNodeEnv(options = {}) {
  if (options.node_env) {
    options.debug &&
      debug(
        `operating in "${options.node_env}" environment (set by \`options.node_env\`)`
      );
    return options.node_env;
  }

  if (process.env.NODE_ENV) {
    options.debug &&
      debug(
        `operating in "${process.env.NODE_ENV}" environment (as per \`process.env.NODE_ENV\`)`
      );
    return process.env.NODE_ENV;
  }

  if (options.default_node_env) {
    options.debug &&
      debug(
        `operating in "${options.default_node_env}" environment (taken from \`options.default_node_env\`)`
      );
    return options.default_node_env;
  }

  options.debug &&
    debug(
      'operating in "no environment" mode (no environment-related options are set)'
    );
  return undefined;
}

/**
 * "envify" initialization function (API entry point).
 *
 * Allows configuring envify programmatically.
 *
 * @param {object} [options] - configuration options
 * @param {string} [options.node_env=process.env.NODE_ENV] - node environment (development/test/production/etc.)
 * @param {string} [options.default_node_env] - the default node environment
 * @param {string} [options.path=process.cwd()] - path to `.env*` files directory
 * @param {string} [options.pattern=".env[.node_env][.local]"] - `.env*` files' naming convention pattern
 * @param {string[]} [options.files] - an explicit list of `.env*` files to load (note that `options.[default_]node_env` and `options.pattern` are ignored in this case)
 * @param {string} [options.encoding="utf8"] - encoding of `.env*` files
 * @param {boolean} [options.purge_dotenv=false] - perform the `.env` file {@link unload}
 * @param {boolean} [options.debug=false] - turn on detailed logging to help debug why certain variables are not being set as you expect
 * @param {boolean} [options.silent=false] - suppress all kinds of warnings including ".env*" files' loading errors
 * @return {{ parsed?: object, error?: Error }} with a `parsed` key containing the loaded content or an `error` key with an error that is occurred
 */
function config(options = {}) {
  if (options.debug) {
    debug("initializing…");

    CONFIG_OPTION_KEYS.filter((processKey) =>
      Object.hasOwn(options, processKey)
    ).forEach((processKey) =>
      debug(`| options.${processKey} =`, options[processKey])
    );
  }

  const { path = process.cwd(), pattern = DEFAULT_PATTERN } = options;

  if (options.purge_dotenv) {
    options.debug &&
      debug(
        "`options.purge_dotenv` is enabled, unloading potentially pre-loaded `.env`…"
      );

    const dotenvFile = resolve(path, ".env");
    try {
      fs.existsSync(dotenvFile) &&
        unload(dotenvFile, { encoding: options.encoding });
    } catch (_err) {
      failure(_err, options);
    }
  }

  try {
    let filenames;

    if (Array.isArray(options.files)) {
      options.debug &&
        debug(
          "using explicit list of `.env*` files: %s…",
          options.files.join(", ")
        );

      filenames = options.files.reduce((list, basename) => {
        const filename = resolve(path, basename);

        if (fs.existsSync(filename)) {
          list.push(filename);
        } else if (options.debug) {
          debug(">> %s does not exist, skipping…", filename);
        }

        return list;
      }, []);
    } else {
      const node_env = getEffectiveNodeEnv(options);

      filenames = listFiles({ node_env, path, pattern, debug: options.debug });

      if (filenames.length === 0) {
        const _pattern = node_env
          ? pattern.replace(NODE_ENV_PLACEHOLDER_REGEX, `[$1${node_env}$2]`)
          : pattern;

        return failure(
          new Error(
            `no ".env*" files matching pattern "${_pattern}" in "${path}" dir`
          ),
          options
        );
      }
    }

    const result = load(filenames, {
      encoding: options.encoding,
      debug: options.debug,
      silent: options.silent,
    });

    options.debug && debug("initialization completed.");

    return result;
  } catch (_err) {
    return failure(_err, options);
  }
}

function failure(error, options) {
  if (!options.silent) {
    warn(`".env*" files loading failed: ${error.message || error}`);
  }

  return { error };
}

function warn(message, error) {
  if (error) {
    message += ": %s";
  }

  console.warn(`[envify]: ${message}`, error);
}

function debug(message, ...values) {
  console.debug(`[envify]: ${message}`, ...values);
}

module.exports = {
  DEFAULT_PATTERN,
  listFiles,
  parse,
  load,
  unload,
  config,
};
