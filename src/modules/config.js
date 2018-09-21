/**
 * (c) Copyright Reserved EVRYTHNG Limited 2018.
 * All rights reserved. Use of this material is subject to license.
 */

const { validate } = require('jsonschema');
const fs = require('fs');
const os = require('os');
const { isAbsolute, resolve, sep } = require('path');

const DEFAULT_CONFIG = {
  using: '',
  operators: {},
  options: {
    errorDetail: false,
    noConfirm: true,
    showHttp: false,
    logLevel: 'info',
  },
  regions: {
    us: 'https://api.evrythng.com',
    eu: 'https://api-eu.evrythng.com',
  },
};

const CONFIG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['using', 'operators', 'options', 'regions'],
  properties: {
    using: { type: 'string' },
    operators: {
      type: 'object',
      patternProperties: {
        '(.*)': {
          type: 'object',
          additionalProperties: false,
          required: ['apiKey', 'region'],
          properties: {
            apiKey: {
              type: 'string',
              minLength: 80,
              maxLength: 80,
            },
            region: { type: 'string' },
          },
        },
      },
    },
    options: {
      type: 'object',
      additionalProperties: false,
      required: ['errorDetail', 'noConfirm', 'showHttp', 'logLevel', 'defaultPerPage'],
      properties: {
        errorDetail: { type: 'boolean' },
        noConfirm: { type: 'boolean' },
        showHttp: { type: 'boolean' },
        logLevel: {
          type: 'string',
          enum: ['info', 'error'],
        },
        defaultPerPage: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
        },
      },
    },
    regions: { type: 'object' },
  },
};

const DEFAULT_DEFAULT_PER_PAGE = 30;

const LEGACY_PATH = `${os.homedir()}/.evrythng-cli-config`;
const PATH = `${os.homedir()}/.evrythng`;
const FILE = 'config';

let data;

const validateConfig = (input) => {
  const results = validate(input, CONFIG_SCHEMA);
  if (results.errors && results.errors.length) {
    throw new Error(`\nConfiguration is invalid:\n- ${results.errors.map(item => item.stack).join('\n- ')}`);
  }
};

const write = () => fs.writeFileSync(resolve(PATH, FILE), JSON.stringify(data, null, 2), 'utf8');

const migrateConfig = (input) => {
  // v1.1.0 - new defaultPerPage option
  if (!input.options.defaultPerPage) {
    input.options.defaultPerPage = DEFAULT_DEFAULT_PER_PAGE;
  }

  write();
};

const load = async () => {
  // Create the full path to the config, if it does not exist.
  PATH.split(sep).reduce((parent, child) => {
    const pwd = resolve(parent, child);
    if (!fs.existsSync(pwd)) {
      fs.mkdirSync(pwd);
    }

    return pwd;
  }, '/');

  // If configuration exists in the old location, read the file and unlink it.
  if (fs.existsSync(LEGACY_PATH)) {
    data = JSON.parse(fs.readFileSync(LEGACY_PATH, 'utf8'));
    fs.unlinkSync(LEGACY_PATH);
    return write();
  } else if (!fs.existsSync(resolve(PATH, FILE))) {
    data = DEFAULT_CONFIG;
    return write();
  }

  data = JSON.parse(fs.readFileSync(resolve(PATH, FILE), 'utf8'));
  migrateConfig(data);
  validateConfig(data);
};

const get = key => data[key];

const set = (key, value) => {
  data[key] = value;
  write();
};

module.exports = {
  PATH,
  get,
  set,
  validateConfig,
};

load();
