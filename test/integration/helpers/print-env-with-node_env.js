require('../../../src/envify').config({
  node_env: process.env.CUSTOM_ENV,
});

// eslint-disable-next-line no-console
console.log(JSON.stringify(process.env));
