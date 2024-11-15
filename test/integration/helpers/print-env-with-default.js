require('../../../src/envify').config({
  default_node_env: 'development',
});

// eslint-disable-next-line no-console
console.log(JSON.stringify(process.env));
