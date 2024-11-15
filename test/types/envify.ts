import envify, { DEFAULT_PATTERN } from '../../src/envify';

envify.listFiles({});
envify.listFiles({ node_env: 'development' });
envify.listFiles({ path: '/path/to/project' });
envify.listFiles({ pattern: DEFAULT_PATTERN });
envify.listFiles({ debug: true });
envify.listFiles({
  node_env: 'development',
  path: '/path/to/project',
  pattern: DEFAULT_PATTERN,
  debug: true,
});

envify.parse('/path/to/project/.env');
envify.parse('/path/to/project/.env', {});
envify.parse('/path/to/project/.env', { encoding: 'utf8' });
envify.parse('/path/to/project/.env', { debug: true });
envify.parse('/path/to/project/.env', {
  encoding: 'utf8',
  debug: true,
});

envify.parse(['/path/to/project/.env']);
envify.parse(['/path/to/project/.env'], {});
envify.parse(['/path/to/project/.env'], { encoding: 'utf8' });
envify.parse(['/path/to/project/.env'], { debug: true });
envify.parse(['/path/to/project/.env'], {
  encoding: 'utf8',
  debug: true,
});

const parsed: { [name: string]: string } = envify.parse('/path/to/project/.env');
const typed: { VARNAME: string } = envify.parse('/path/to/project/.env');

// --

envify.load('/path/to/project/.env');
envify.load('/path/to/project/.env', {});
envify.load('/path/to/project/.env', { encoding: 'utf8' });
envify.load('/path/to/project/.env', { debug: true });
envify.load('/path/to/project/.env', { silent: true });
envify.load('/path/to/project/.env', {
  encoding: 'utf8',
  debug: true,
  silent: false,
});

envify.load(['/path/to/project/.env']);
envify.load(['/path/to/project/.env'], {});
envify.load(['/path/to/project/.env'], { encoding: 'utf8' });
envify.load(['/path/to/project/.env'], { debug: true });
envify.load(['/path/to/project/.env'], { silent: true });
envify.load(['/path/to/project/.env'], {
  encoding: 'utf8',
  debug: true,
  silent: false,
});

const defaultLoadResult = envify.load('/path/to/project/.env');
const value1: string | undefined = defaultLoadResult.parsed?.['VARNAME'];
const error1: Error | undefined = defaultLoadResult.error;

const typedLoadResult = envify.load<{ VARNAME: string }>('/path/to/project/.env');
const value2: string | undefined = typedLoadResult.parsed?.VARNAME;
const error2: Error | undefined = typedLoadResult.error;

// --

envify.unload('/path/to/project/.env');
envify.unload('/path/to/project/.env', {});
envify.unload('/path/to/project/.env', { encoding: 'utf8' });

envify.unload(['/path/to/project/.env']);
envify.unload(['/path/to/project/.env'], {});
envify.unload(['/path/to/project/.env'], { encoding: 'utf8' });

// --

envify.config();
envify.config({});
envify.config({ node_env: 'production' });
envify.config({ default_node_env: 'development' });
envify.config({ path: '/path/to/project' });
envify.config({ pattern: '.env[.node_env][.local]' });
envify.config({ files: ['.env', '.env.local'] });
envify.config({ encoding: 'utf8' });
envify.config({ purge_dotenv: true });
envify.config({ debug: true });
envify.config({ silent: true });
envify.config({
  node_env: 'production',
  default_node_env: 'development',
  path: '/path/to/project',
  pattern: '.env[.node_env][.local]',
  files: ['.env', '.env.local'],
  encoding: 'utf8',
  purge_dotenv: true,
  debug: true,
  silent: false,
});

const defaultConfigResult = envify.config();
const value3: string | undefined = defaultConfigResult.parsed?.['VARNAME'];
const error3: Error | undefined = defaultConfigResult.error;

const typedConfigResult = envify.config<{ VARNAME: string }>();
const value4: string | undefined = typedConfigResult.parsed?.VARNAME;
const error4: Error | undefined = typedConfigResult.error;
