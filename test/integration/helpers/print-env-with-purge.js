require("../../../src/envify").config({
  purge_dotenv: true,
});

// eslint-disable-next-line no-console
console.log(JSON.stringify(process.env));
