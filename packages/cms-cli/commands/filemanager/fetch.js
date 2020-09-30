const { version } = require('../../package.json');

const {
  loadConfig,
  validateConfig,
  checkAndWarnGitInclusion,
} = require('@hubspot/cms-lib');
const { downloadFileOrFolder } = require('@hubspot/cms-lib/fileManager');
const { logger } = require('@hubspot/cms-lib/logger');
const { resolveLocalPath } = require('../../lib/filesystem');

const {
  addConfigOptions,
  addPortalOptions,
  addLoggerOptions,
  addUseEnvironmentOptions,
  setLogLevel,
  getPortalId,
} = require('../../lib/commonOpts');
const { logDebugInfo } = require('../../lib/debugInfo');
const { validatePortal } = require('../../lib/validation');
const {
  trackCommandUsage,
  addHelpUsageTracking,
} = require('../../lib/usageTracking');

const FETCH_COMMAND_NAME = 'filemanager-fetch';
const FETCH_DESCRIPTION =
  'Download a folder or file from the HubSpot File Manager to your computer';

const action = async ({ src, dest }, options) => {
  setLogLevel(options);
  logDebugInfo(options);

  const { config: configPath } = options;
  loadConfig(configPath, options);
  checkAndWarnGitInclusion();

  if (!validateConfig() || !(await validatePortal(options))) {
    process.exit(1);
  }

  if (typeof src !== 'string') {
    logger.error('A source to fetch is required');
    process.exit(1);
  }

  dest = resolveLocalPath(dest);

  const portalId = getPortalId(options);

  trackCommandUsage(FETCH_COMMAND_NAME, {}, portalId);

  // Fetch and write file/folder.
  downloadFileOrFolder(portalId, src, dest, options);
};

const command = 'fetch <src> [dest]';
const describe = FETCH_DESCRIPTION;
const handler = async argv => action({ src: argv.src, dest: argv.dest }, argv);
const builder = yargs => {
  addConfigOptions(yargs, true);
  addPortalOptions(yargs, true);
  addUseEnvironmentOptions(yargs, true);

  yargs.positional('src', {
    describe: 'Path in HubSpot Design Tools',
    type: 'string',
    demand: true,
  });
  yargs.positional('dest', {
    describe:
      'Path to the local directory you would like the files to be placed, relative to your current working directory. If omitted, this argument will default to your current working directory',
    type: 'string',
  });
  yargs.option('include-archived', {
    alias: ['i'],
    describe: 'Include files that have been marked as "archived"',
    type: 'boolean',
  });
};

const configureCommanderFileManagerFetchCommand = commander => {
  commander
    .version(version)
    .description(FETCH_DESCRIPTION)
    .arguments('<src> [dest]')
    .option(
      '--include-archived',
      'Include files that have been marked as "archived"'
    )
    .action((src, dest) => action({ src, dest }, commander));

  addConfigOptions(commander);
  addPortalOptions(commander);
  addLoggerOptions(commander);
  addUseEnvironmentOptions(commander);
  addHelpUsageTracking(commander, FETCH_COMMAND_NAME);
};

module.exports = {
  FETCH_DESCRIPTION,
  // Yargs
  command,
  describe,
  handler,
  builder,
  // Commander
  configureCommanderFileManagerFetchCommand,
};