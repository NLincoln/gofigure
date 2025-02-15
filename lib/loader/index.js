const _ = require('lodash');
const path = require('path');
const glob = require('glob');
const FileLoader = require('./FileLoader');
const helpers = require('../helpers');

const globP = helpers.denodeify(glob);

const createGlobPattern = (location) => {
  if (location === undefined) {
    return null;
  }
  if (/\.json$/.test(location)) {
    return location;
  }
  return path.resolve(location, '**/*.json');
};

const createLoader = (options) => {
  if (options.file) {
    return new FileLoader(options);
  }
  throw new Error('Unable to determine loader type please specify a file location');
};

const normalizeLocations = (locations, options) =>
  locations.map((location) => _.merge({}, options, _.isString(location) ? { file: location } : location));

const createLocationsFromGlobedFiles = (location, globedFiles) =>
  globedFiles.map((file) => _.merge({}, location, { file }));

const createLoadersSync = (loaderConfig, options) => {
  let loaders = [];
  if (loaderConfig.locations) {
    const files = normalizeLocations(loaderConfig.locations, options).reduce((globedFiles, location) => {
      const globPattern = createGlobPattern(location.file);
      const filesFromGlob = glob.sync(globPattern);
      return [...globedFiles, ...createLocationsFromGlobedFiles(location, filesFromGlob)];
    }, []);
    loaders = files.map((location) => createLoader(location));
  }
  return loaders;
};

const createLoadersAsync = (loaderConfig, options) => {
  let loadersPromise = Promise.resolve([]);
  if (loaderConfig.locations) {
    const globFilesPromise = normalizeLocations(loaderConfig.locations, options).reduce(
      (globedFilesPromise, location) =>
        globedFilesPromise.then((globedFiles) => {
          const globPattern = createGlobPattern(location.file);
          return globP(globPattern).then((filesFromGlob) => [
            ...globedFiles,
            ...createLocationsFromGlobedFiles(location, filesFromGlob),
          ]);
        }),
      Promise.resolve([]),
    );
    loadersPromise = globFilesPromise.then((files) => files.map((location) => createLoader(location)));
  }
  return loadersPromise;
};

module.exports = {
  createLoadersSync,
  createLoadersAsync,
};
