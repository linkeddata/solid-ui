// This module of solid-ui has a main quadstore for the app to use
//

import * as debug from './debug'

var rdf = require('rdflib')
var store = (module.exports = rdf.graph()) // Make a Quad store
rdf.fetcher(store) // Attach a web I/O module, store.fetcher
store.updater = new rdf.UpdateManager(store) // Add real-time live updates store.updater

debug.log('Unique quadstore initialized.')

// ends
