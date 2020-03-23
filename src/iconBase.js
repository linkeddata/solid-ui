/* global $SolidTestEnvironment */
// Works in FF extension - what about browserify??

import * as debug from './debug'

if (module.scriptURI) {
  // FF extension
  module.exports.iconBase =
    '' +
    module.scriptURI.slice(0, module.scriptURI.lastIndexOf('/')) +
    '/icons/'
  module.exports.originalIconBase =
    '' +
    module.scriptURI.slice(0, module.scriptURI.lastIndexOf('/')) +
    '/originalIcons/'
} else {
  // Node or browserify
  var iconsOnGithub = 'https://solid.github.io/solid-ui/src'

  if (
    typeof $SolidTestEnvironment !== 'undefined' &&
    $SolidTestEnvironment.iconBase
  ) {
    module.exports.iconBase = $SolidTestEnvironment.iconBase
    module.exports.originalIconBase = $SolidTestEnvironment.originalIconBase
  } else {
    module.exports.iconBase = iconsOnGithub + '/icons/'
    module.exports.originalIconBase = iconsOnGithub + '/originalIcons/'
  }
}
debug.log('   Icon base is: ' + module.exports.iconBase)
