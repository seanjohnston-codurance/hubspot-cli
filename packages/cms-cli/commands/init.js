const { version } = require('../package.json');
const inquirer = require('inquirer');
const {
  getConfigPath,
  writeNewPortalApiKeyConfig,
  createEmptyConfigFile,
  deleteEmptyConfigFile,
} = require('@hubspot/cms-lib/lib/config');
const {
  logFileSystemErrorInstance,
  logErrorInstance,
} = require('@hubspot/cms-lib/errorHandlers');
const {
  DEFAULT_HUBSPOT_CONFIG_YAML_FILE_NAME,
  AUTH_METHODS,
} = require('@hubspot/cms-lib/lib/constants');
const { logger } = require('@hubspot/cms-lib/logger');
const {
  trackCommandUsage,
  addHelpUsageTracking,
} = require('../lib/usageTracking');
const {
  PORTAL_API_KEY,
  PORTAL_ID,
  PORTAL_NAME,
  AUTH_METHOD,
} = require('../lib/prompts');
const { addLoggerOptions, setLogLevel } = require('../lib/commonOpts');
const { logDebugInfo } = require('../lib/debugInfo');
const { authAction } = require('./auth');

const COMMAND_NAME = 'init';

const promptUser = async promptConfig => {
  const prompt = inquirer.createPromptModule();
  return prompt(promptConfig);
};

const oauthConfigSetup = async ({ options }) => {
  try {
    createEmptyConfigFile();
    process.on('exit', deleteEmptyConfigFile);
    await authAction(AUTH_METHODS.oauth, options);
  } catch (e) {
    deleteEmptyConfigFile();
    logErrorInstance(e, AUTH_METHODS.oauth);
  }

  trackCommandUsage(COMMAND_NAME, {
    authType: AUTH_METHODS.oauth,
  });
};

const apiKeyConfigSetup = async ({ configPath }) => {
  const configData = await promptUser([PORTAL_NAME, PORTAL_ID, PORTAL_API_KEY]);

  try {
    writeNewPortalApiKeyConfig(configData);
  } catch (err) {
    logFileSystemErrorInstance(err, {
      filepath: configPath,
      configData,
    });
  }

  trackCommandUsage(COMMAND_NAME, {
    authType: AUTH_METHODS.api,
  });
};

function initializeConfigCommand(program) {
  program
    .version(version)
    .description(
      `initialize ${DEFAULT_HUBSPOT_CONFIG_YAML_FILE_NAME} for a HubSpot portal`
    )
    .option(
      '--api',
      `initialize ${DEFAULT_HUBSPOT_CONFIG_YAML_FILE_NAME} using ${AUTH_METHODS.api}`
    )
    .option(
      '--oauth',
      `initialize ${DEFAULT_HUBSPOT_CONFIG_YAML_FILE_NAME} using ${AUTH_METHODS.oauth}`
    )
    .action(async options => {
      setLogLevel(options);
      logDebugInfo(options);

      const configPath = getConfigPath();
      let authMethod;

      if (configPath) {
        logger.error(`The config file '${configPath}' already exists.`);
        process.exit(1);
      }

      if (!options.api && !options.oauth) {
        ({ authMethod } = await promptUser(AUTH_METHOD));
      }

      if (options.api || authMethod === AUTH_METHODS.api) {
        apiKeyConfigSetup({
          configPath,
        });
      } else if (options.oauth || authMethod === AUTH_METHODS.oauth) {
        oauthConfigSetup({
          options,
        });
      } else {
        logErrorInstance('Unrecognized auth method passed to hs init');
      }
    });

  addLoggerOptions(program);
  addHelpUsageTracking(program, COMMAND_NAME);
}

module.exports = {
  initializeConfigCommand,
};
