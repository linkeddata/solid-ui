/**
 * Contains the [[DateFolder]] class
 * @packageDocumentation
 */

import * as debug from '../debug'

const kb = require('../store.js')
const ns = require('../ns.js')
const $rdf = require('rdflib')

/**
 * Track back through the YYYY/MM/DD tree to find the previous/next day
 */
module.exports = class DateFolder {
  constructor (rootThing, leafFileName, membershipProperty) {
    this.root = rootThing
    this.rootFolder = rootThing.dir()
    this.leafFileName = leafFileName || 'index.ttl' // typically chat.ttl
    this.membershipProperty = membershipProperty || ns.wf('leafObject')
  }

  /* Generate the leaf document (rdf object) from date
   * @returns: <NamedNode> - document
   */
  leafDocumentFromDate (date) {
    // debug.log('incoming date: ' + date)
    const isoDate = date.toISOString() // Like "2018-05-07T17:42:46.576Z"
    var path = isoDate.split('T')[0].replace(/-/g, '/') //  Like "2018/05/07"
    path = this.root.dir().uri + path + '/' + this.leafFileName
    return kb.sym(path)
  }

  /* Generate a date object from the leaf file name
   */
  dateFromLeafDocument (doc) {
    const head = this.rootFolder.uri.length
    const str = doc.uri.slice(head, head + 10).replace(/\//g, '-')
    // let date = new Date(str + 'Z') // GMT - but fails in FF - invalid format :-(
    var date = new Date(str) // not explicitly UTC but is assumed so in spec
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
    debug.log('Date for ' + doc + ':' + date.toISOString())
    return date
  }

  async loadPrevious (date, backwards) {
    const thisDateFolder = this
    async function previousPeriod (file, level) {
      function younger (x) {
        if (backwards ? x.uri >= file.uri : x.uri <= file.uri) return false // later than we want or same -- looking for different
        return true
      }
      function suitable (x) {
        const tail = x.uri
          .slice(0, -1)
          .split('/')
          .slice(-1)[0]
        if (!'0123456789'.includes(tail[0])) return false // not numeric
        return true
      }

      async function lastNonEmpty (siblings) {
        siblings = siblings.filter(suitable)
        siblings.sort() // chronological order
        if (!backwards) siblings.reverse()
        if (level !== 3) return siblings.pop() // only length chck final leverl
        while (siblings.length) {
          const folder = siblings.pop()
          const leafDocument = kb.sym(folder.uri + thisDateFolder.leafFileName)
          await kb.fetcher.load(leafDocument)
          // files can have seealso links. skip ones with no leafObjects with a date
          if (
            kb.statementsMatching(null, ns.dct('created'), null, leafDocument)
              .length > 0
          ) {
            return folder
          }
        }
        return null
      }
      // debug.log('  previousPeriod level' + level + ' file ' + file)
      const parent = file.dir()
      await kb.fetcher.load(parent)
      var siblings = kb.each(parent, ns.ldp('contains'))
      siblings = siblings.filter(younger)
      const folder = await lastNonEmpty(siblings)
      if (folder) return folder

      if (level === 0) return null // 3:day, 2:month, 1: year  0: no

      const uncle = await previousPeriod(parent, level - 1)
      if (!uncle) return null // reached first ever
      await kb.fetcher.load(uncle)
      var cousins = kb.each(uncle, ns.ldp('contains'))
      const result = await lastNonEmpty(cousins)
      return result
    } // previousPeriod

    const folder = this.leafDocumentFromDate(date).dir()
    const found = await previousPeriod(folder, 3)
    if (found) {
      const doc = kb.sym(found.uri + this.leafFileName)
      return this.dateFromLeafDocument(doc)
    }
    return null
  } // loadPrevious

  async firstLeaf (backwards) {
    // backwards -> last leafObject
    var folderStore = $rdf.graph()
    var folderFetcher = new $rdf.Fetcher(folderStore)
    async function earliestSubfolder (parent) {
      function suitable (x) {
        const tail = x.uri
          .slice(0, -1)
          .split('/')
          .slice(-1)[0]
        if (!'0123456789'.includes(tail[0])) return false // not numeric
        return true
      }
      debug.log('            parent ' + parent)
      delete folderFetcher.requested[parent.uri]
      // try {
      await folderFetcher.load(parent, { force: true }) // Force fetch as will have changed
      // }catch (err) {
      // }

      var kids = folderStore.each(parent, ns.ldp('contains'))
      kids = kids.filter(suitable)
      if (kids.length === 0) {
        throw new Error(' @@@  No children to         parent2 ' + parent)
      }

      kids.sort()
      if (backwards) kids.reverse()
      return kids[0]
    }
    const y = await earliestSubfolder(this.root.dir())
    const month = await earliestSubfolder(y)
    const d = await earliestSubfolder(month)
    const leafDocument = $rdf.sym(d.uri + 'chat.ttl')
    await folderFetcher.load(leafDocument)
    const leafObjects = folderStore.each(
      this.root,
      this.membershipProperty,
      null,
      leafDocument
    )
    if (leafObjects.length === 0) {
      const msg =
        '  INCONSISTENCY -- no chat leafObject in file ' + leafDocument
      debug.trace(msg)
      throw new Error(msg)
    }
    const sortMe = leafObjects.map(leafObject => [
      folderStore.any(leafObject, ns.dct('created')),
      leafObject
    ])
    sortMe.sort()
    if (backwards) sortMe.reverse()
    debug.log(
      (backwards ? 'Latest' : 'Earliest') + ' leafObject is ' + sortMe[0][1]
    )
    return sortMe[0][1]
  } // firstleafObject
} // class
