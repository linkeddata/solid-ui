/**
 * Non-UI functions for access control.
 * See https://github.com/solid/web-access-control-spec
 * for the spec that defines how ACL documents work.
 * @packageDocumentation
 */

import * as $rdf from 'rdflib'
import ns from '../ns'
import kb from '../store.js'
import utils from '../utils'
import { AgentMapMap, ComboList } from './types'
import * as debug from '../debug'

/**
 * Take the "default" ACL and convert it into the equivlent ACL
 * which the resource would have had. Return it as a new separate store.
 * The "defaultForNew" predicate is also accepted, as a deprecated
 * synonym for "default".
 */
export function adoptACLDefault (
  doc: $rdf.NamedNode,
  aclDoc: $rdf.NamedNode,
  defaultResource: $rdf.NamedNode,
  defaultACLdoc: $rdf.NamedNode
): $rdf.IndexedFormula {
  const ACL = ns.acl
  const isContainer = doc.uri.slice(-1) === '/' // Give default for all directories
  const defaults = kb
    .each(undefined, ACL('default'), defaultResource, defaultACLdoc)
    .concat(
      kb.each(undefined, ACL('defaultForNew'), defaultResource, defaultACLdoc)
    )
  let proposed: Array<$rdf.Statement> = []
  defaults.map(function (da) {
    proposed = proposed
      .concat(kb.statementsMatching(da, ACL('agent'), undefined, defaultACLdoc))
      .concat(kb.statementsMatching(da, ACL('agentClass'), undefined, defaultACLdoc))
      .concat(kb.statementsMatching(da, ACL('agentGroup'), undefined, defaultACLdoc))
      .concat(kb.statementsMatching(da, ACL('origin'), undefined, defaultACLdoc))
      .concat(kb.statementsMatching(da, ACL('originClass'), undefined, defaultACLdoc))
      .concat(kb.statementsMatching(da, ACL('mode'), undefined, defaultACLdoc))
    proposed.push($rdf.st(da, ACL('accessTo'), doc, defaultACLdoc)) // Suppose
    if (isContainer) {
      // By default, make this apply to folder contents too
      proposed.push($rdf.st(da, ACL('default'), doc, defaultACLdoc))
    }
  })
  const kb2 = $rdf.graph() // Potential - derived is kept apart
  proposed.map(function (st) {
    const move = function (sym) {
      const y = defaultACLdoc.uri.length // The default ACL file
      return $rdf.sym(
        sym.uri.slice(0, y) === defaultACLdoc.uri
          ? aclDoc.uri + sym.uri.slice(y)
          : sym.uri
      )
    }
    kb2.add(
      move(st.subject),
      move(st.predicate),
      move(st.object),
      $rdf.sym(aclDoc.uri)
    )
  })

  return kb2
}

/**
 * Read and canonicalize the ACL for x in aclDoc
 *
 * Accumulate the access rights which each agent or class has
 */
export function readACL (
  x: $rdf.NamedNode,
  aclDoc: $rdf.NamedNode,
  kb2: $rdf.IndexedFormula = kb,
  getDefaults?: boolean
): AgentMapMap {
  const auths: Array<$rdf.NamedNode> = getDefaults
    ? getDefaultsFallback(kb2, ns)
    : kb2.each(undefined, ns.acl('accessTo'), x)

  const ACL = ns.acl
  const ac = {
    agent: {},
    agentClass: {},
    agentGroup: {},
    origin: {},
    originClass: {}
  }
  Object.keys(ac).forEach(pred => {
    auths.forEach(function (a) {
      (kb2.each(a, ACL('mode')) as Array<$rdf.NamedNode>).forEach(function (mode) {
        (kb2.each(a, ACL(pred)) as Array<$rdf.NamedNode>).forEach(function (agent) {
          ac[pred][agent.uri] = ac[pred][agent.uri] || {}
          ac[pred][agent.uri][mode.uri] = a // could be "true" but leave pointer just in case
        })
      })
    })
  })
  return ac

  function getDefaultsFallback (kb, ns) {
    return kb
      .each(undefined, ns.acl('default'), x)
      .concat(kb.each(undefined, ns.acl('defaultForNew'), x))
  }
}

/**
 * Compare two ACLs
 */
export function sameACL (a: AgentMapMap, b: AgentMapMap): boolean {
  const contains = function (a, b) {
    for (const pred in {
      agent: true,
      agentClass: true,
      agentGroup: true,
      origin: true,
      originClass: true
    }) {
      if (a[pred]) {
        for (const agent in a[pred]) {
          for (const mode in a[pred][agent]) {
            if (!b[pred][agent] || !b[pred][agent][mode]) {
              return false
            }
          }
        }
      }
    }
    return true
  }
  return contains(a, b) && contains(b, a)
}

/**
 * Union N ACLs
 */
export function ACLunion (list: Array<AgentMapMap>): AgentMapMap {
  const b = list[0]
  let a, ag
  for (let k = 1; k < list.length; k++) {
    ;['agent', 'agentClass', 'agentGroup', 'origin', 'originClass'].map(
      function (pred) {
        a = list[k]
        if (a[pred]) {
          for (ag in a[pred]) {
            for (const mode in a[pred][ag]) {
              if (!b[pred][ag]) b[pred][ag] = []
              b[pred][ag][mode] = true
            }
          }
        }
      }
    )
  }
  return b
}

/**
 * Merge ACLs lists from things to form union
 */
export function loadUnionACL (subjectList: Array<$rdf.NamedNode>, callbackFunction: Function): void {
  const aclList: Array<AgentMapMap> = []
  const doList = function (list) {
    if (list.length) {
      const doc = list.shift().doc()
      getACLorDefault(doc, function (
        ok,
        p2,
        targetDoc,
        targetACLDoc,
        defaultHolder,
        defaultACLDoc
      ) {
        const defa = !p2
        if (!ok || !defaultHolder || !defaultACLDoc) return callbackFunction(ok, targetACLDoc)
        const acl = defa
          ? readACL(defaultHolder, defaultACLDoc)
          : readACL(targetDoc as $rdf.NamedNode, targetACLDoc as $rdf.NamedNode)
        aclList.push(acl)
        doList(list.slice(1))
      })
    } else {
      // all gone
      callbackFunction(true, ACLunion(aclList))
    }
  }
  doList(subjectList)
}

/**
 * Represents these as an RDF graph by combination of modes
 *
 * Each agent can only be in one place in this model, one combination of modes.
 * Combos are like full control, read append, read only etc.
 */
export function ACLbyCombination (ac: AgentMapMap): ComboList {
  const byCombo = {}
  ;['agent', 'agentClass', 'agentGroup', 'origin', 'originClass'].map(function (pred) {
    for (const agent in ac[pred]) {
      const combo: string[] = []
      for (const mode in ac[pred][agent]) {
        combo.push(mode)
      }
      combo.sort()
      const combo2 = combo.join('\n')
      if (!byCombo[combo2]) byCombo[combo2] = []
      byCombo[combo2].push([pred, agent])
    }
  })
  return byCombo
}

/**
 * Write ACL graph to store from AC
 */
export function makeACLGraph (kb: $rdf.IndexedFormula, x: $rdf.NamedNode, ac: AgentMapMap, aclDoc: $rdf.NamedNode): void {
  const byCombo = ACLbyCombination(ac)
  return makeACLGraphbyCombo(kb, x, byCombo, aclDoc)
}

/**
 * Write ACL graph to store from combo
 */
export function makeACLGraphbyCombo (
  kb: $rdf.IndexedFormula,
  x: $rdf.NamedNode,
  byCombo: ComboList,
  aclDoc: $rdf.NamedNode,
  main?: boolean,
  defa?: boolean
): void {
  const ACL = ns.acl
  for (const combo in byCombo) {
    const modeURIs = combo.split('\n')
    let short = modeURIs
      .map(function (u) {
        return u.split('#')[1]
      })
      .join('')
    if (defa && !main) short += 'Default' // don't muddle authorizations
    const a = kb.sym(aclDoc.uri + '#' + short)
    kb.add(a, ns.rdf('type'), ACL('Authorization'), aclDoc)
    if (main) {
      kb.add(a, ACL('accessTo'), x, aclDoc)
    }
    if (defa) {
      kb.add(a, ACL('default'), x, aclDoc)
    }
    for (let i = 0; i < modeURIs.length; i++) {
      kb.add(a, ACL('mode'), kb.sym(modeURIs[i]), aclDoc)
    }
    const pairs = byCombo[combo]
    for (let i = 0; i < pairs.length; i++) {
      const pred = pairs[i][0]
      const ag = pairs[i][1]
      kb.add(a, ACL(pred), kb.sym(ag), aclDoc)
    }
  }
}

/**
 * Debugging short strings for dumping ACL
 * and possibly in the UI
 */
export function ACLToString (ac: AgentMapMap): string {
  return comboToString(ACLbyCombination(ac))
}

/**
 * Convert a [[ComboList]] to a string
 */
export function comboToString (byCombo: ComboList): string {
  let str = ''
  for (const combo in byCombo) {
    const modeURIs = combo.split('\n')
    const initials = modeURIs
      .map(function (u) {
        return u.split('#')[1][0]
      })
      .join('')
    str += initials + ':'
    const pairs = byCombo[combo]
    for (let i = 0; i < pairs.length; i++) {
      const pred = pairs[i][0]
      const ag = $rdf.sym(pairs[i][1])
      str += pred === 'agent' ? '@' : ''
      str += ag.sameTerm(ns.foaf('Agent')) ? '*' : utils.label(ag)
      if (i < pairs.length - 1) str += ','
    }
    str += ';'
  }
  return '{' + str.slice(0, -1) + '}' // drop extra semicolon
}

/**
 * Write ACL graph as Turtle
 */
export function makeACLString (x: $rdf.NamedNode, ac: AgentMapMap, aclDoc: $rdf.NamedNode): string {
  const kb2 = $rdf.graph()
  makeACLGraph(kb2, x, ac, aclDoc)
  // @@ TODO Remove casting
  return ($rdf as any).serialize(aclDoc, kb2, aclDoc.uri, 'text/turtle')
}

/**
 * Write ACL graph to web
 */
export function putACLObject (
  kb: $rdf.IndexedFormula,
  x: $rdf.NamedNode,
  ac: AgentMapMap,
  aclDoc: $rdf.NamedNode,
  callbackFunction
): void {
  const byCombo = ACLbyCombination(ac)
  return putACLbyCombo(kb, x, byCombo, aclDoc, callbackFunction)
}

/**
 * Write ACL graph to web from a [[ComboList]]
 */
export function putACLbyCombo (
  kb: $rdf.IndexedFormula,
  x: $rdf.NamedNode,
  byCombo: ComboList,
  aclDoc: $rdf.NamedNode,
  callbackFunction: (ok: boolean, message?: string) => void
): void {
  const kb2 = $rdf.graph()
  makeACLGraphbyCombo(kb2, x, byCombo, aclDoc, true)

  // const str = makeACLString = function(x, ac, aclDoc)
  // @@ TODO Remove casting of kb.updater and kb.fetcher
  ;(kb.updater as $rdf.UpdateManager).put(
    aclDoc,
    kb2.statementsMatching(undefined, undefined, undefined, aclDoc),
    'text/turtle',
    function (uri, ok, message) {
      if (!ok) {
        callbackFunction(ok, message)
      } else {
        ;(kb as any).fetcher.unload(aclDoc)
        makeACLGraphbyCombo(kb, x, byCombo, aclDoc, true)
        ;(kb as any).fetcher.requested[aclDoc.uri] = 'done' // missing: save headers
        callbackFunction(ok)
      }
    }
  )
}

/**
 * Fix the ACl for an individual card as a function of the groups it is in
 *
 * All group files must be loaded first
 */
export function fixIndividualCardACL (person: $rdf.NamedNode, log: Function, callbackFunction: Function): void {
  const groups = kb.each(undefined, ns.vcard('hasMember'), person)
  // const doc = person.doc()
  if (groups) {
    fixIndividualACL(person, groups, log, callbackFunction)
  } else {
    log('This card is in no groups')
    callbackFunction(true) // fine, no requirements to access. default should be ok
  }
  // @@ if no groups, then use default for People container or the book top container.?
}

/**
 * This function is used by [[fixIndividualCardACL]]
 */
export function fixIndividualACL (item: $rdf.NamedNode, subjects: Array<$rdf.NamedNode>, log: Function, callbackFunction: Function): void {
  log = log || debug.log
  const doc = item.doc()
  getACLorDefault(doc, function (
    ok,
    exists,
    targetDoc,
    targetACLDoc,
    defaultHolder,
    defaultACLDoc
  ) {
    if (!ok || !defaultHolder || !defaultACLDoc) return callbackFunction(false, targetACLDoc) // ie message
    const ac = exists
      ? readACL(targetDoc as $rdf.NamedNode, targetACLDoc as $rdf.NamedNode)
      : readACL(defaultHolder, defaultACLDoc)
    loadUnionACL(subjects, function (ok, union) {
      if (!ok) return callbackFunction(false, union)
      if (sameACL(union, ac)) {
        log('Nice - same ACL. no change ' + utils.label(item) + ' ' + doc)
      } else {
        log('Group ACLs differ for ' + utils.label(item) + ' ' + doc)

        // log("Group ACLs: " + makeACLString(targetDoc, union, targetACLDoc))
        // log((exists ? "Previous set" : "Default") + " ACLs: " +
        // makeACLString(targetDoc, ac, targetACLDoc))

        putACLObject(
          kb,
          targetDoc as $rdf.NamedNode,
          union,
          targetACLDoc as $rdf.NamedNode,
          callbackFunction
        )
      }
    })
  })
}

/**
 * Set an ACL
 */
export function setACL (
  docURI: $rdf.NamedNode,
  aclText: string,
  callbackFunction: (ok: boolean, message: string) => void
): void {
  const aclDoc = kb.any(
    kb.sym(docURI),
    kb.sym('http://www.iana.org/assignments/link-relations/acl')
  ) // @@ check that this get set by web.js
  if (aclDoc) {
    // Great we already know where it is
    kb.fetcher
      .webOperation('PUT', aclDoc.uri, {
        data: aclText,
        contentType: 'text/turtle'
      })
      .then(callbackFunction) // @@@ check params
  } else {
    kb.fetcher.nowOrWhenFetched(docURI, undefined, function (ok, body) {
      if (!ok) return callbackFunction(ok, 'Gettting headers for ACL: ' + body)
      const aclDoc = kb.any(
        kb.sym(docURI),
        kb.sym('http://www.iana.org/assignments/link-relations/acl')
      ) // @@ check that this get set by web.js
      if (!aclDoc) {
        // complainIfBad(false, "No Link rel=ACL header for " + docURI)
        callbackFunction(false, 'No Link rel=ACL header for ' + docURI)
      } else {
        kb.fetcher
          .webOperation('PUT', aclDoc.uri, {
            data: aclText,
            contentType: 'text/turtle'
          })
          .then(callbackFunction)
      }
    })
  }
}

/**
 * Get ACL file or default if necessary
 *
 * @param callbackFunction  Will be called in the following ways, in the following cases:
 * * `callbackFunction(true, true, doc, aclDoc)` if the ACL did exist
 * * `callbackFunction(true, false, doc, aclDoc, defaultHolder, defaultACLDoc)` if the ACL file did not exist but a default did
 * * `callbackFunction(false, false, status, message)` when there was an error getting the original
 * * `callbackFunction(false, true, status, message)` when there was an error getting the default
 */
export function getACLorDefault (
  doc: $rdf.NamedNode,
  callbackFunction: (
    a: boolean,
    b: boolean,
    statusOrMessage: number | $rdf.NamedNode,
    message: string | $rdf.NamedNode,
    c?: $rdf.NamedNode,
    d?: $rdf.NamedNode
  ) => void
): void {
  getACL(doc, function (ok, status, aclDoc, message) {
    const ACL = ns.acl
    if (!ok) return callbackFunction(false, false, status as number, message as string)

    // Recursively search for the ACL file which gives default access
    const tryParent = function (uri) {
      if (uri.slice(-1) === '/') {
        uri = uri.slice(0, -1)
      }
      const right = uri.lastIndexOf('/')
      const left = uri.indexOf('/', uri.indexOf('//') + 2)
      if (left > right) {
        return callbackFunction(false, true, 404, 'Found no ACL resource')
      }
      uri = uri.slice(0, right + 1)
      const doc2 = $rdf.sym(uri)
      getACL(doc2, function (ok, status, defaultACLDoc) {
        if (!ok) {
          return callbackFunction(
            false,
            true,
            status as number,
            `( No ACL pointer ${uri} ${status})${defaultACLDoc}`
          )
        } else if (status === 403) {
          return callbackFunction(
            false,
            true,
            status,
            `( default ACL file FORBIDDEN. Stop.${uri})`
          )
        } else if (status === 404) {
          return tryParent(uri)
        } else if (status !== 200) {
          return callbackFunction(
            false,
            true,
            status as number,
            `Error status '${status}' searching for default for ${doc2}`
          )
        }
        // 200
        // statusBlock.textContent += (" ACCESS set at " + uri + ". End search.")
        const defaults = kb
          .each(undefined, ACL('default'), kb.sym(uri), defaultACLDoc)
          .concat(
            kb.each(undefined, ACL('defaultForNew'), kb.sym(uri), defaultACLDoc)
          )
        if (!defaults.length) {
          return tryParent(uri) // Keep searching
        }
        const defaultHolder = kb.sym(uri)
        return callbackFunction(
          true,
          false,
          doc,
          aclDoc as $rdf.NamedNode,
          defaultHolder,
          defaultACLDoc as $rdf.NamedNode
        )
      })
    } // tryParent

    if (!ok) {
      return callbackFunction(
        false,
        false,
        status as number,
        `Error accessing Access Control information for ${doc}) ${message}`
      )
    } else if (status === 404) {
      tryParent(doc.uri) //  @@ construct default one - the server should do that
    } else if (status === 403) {
      return callbackFunction(
        false,
        false,
        status,
        `(Sharing not available to you)${message}`
      )
    } else if (status !== 200) {
      return callbackFunction(
        false,
        false,
        status as number,
        `Error ${status} accessing Access Control information for ${doc}: ${message}`
      )
    } else {
      // 200
      return callbackFunction(true, true, doc, aclDoc as $rdf.NamedNode)
    }
  }) // Call to getACL
}

/**
 * Calls back `(ok, status, acldoc, message)` as follows
 *
 * * `(false, 900, errormessage)` if no link header
 * * `(true, 403, documentSymbol, fileaccesserror)` if not authorized
 * * `(true, 404, documentSymbol, fileaccesserror)` if does not exist
 * * `(true, 200, documentSymbol)` if file exists and read OK
 */
export function getACL (
  doc: $rdf.NamedNode,
  callbackFunction: (
    ok: boolean,
    messageOrStatus: number | string,
    messageOrDoc?: $rdf.NamedNode | string,
    message?: string
  ) => void
): void {
  kb.fetcher.nowOrWhenFetched(doc, undefined, function (ok, body) {
    if (!ok) {
      return callbackFunction(ok, `Can't get headers to find ACL for ${doc}: ${body}`)
    }
    const aclDoc = kb.any(
      doc,
      kb.sym('http://www.iana.org/assignments/link-relations/acl')
    ) // @@ check that this get set by web.js
    if (!aclDoc) {
      callbackFunction(false, 900, `No Link rel=ACL header for ${doc}`)
    } else {
      if (kb.fetcher.nonexistent[aclDoc.uri]) {
        return callbackFunction(
          true,
          404,
          aclDoc,
          `ACL file ${aclDoc} does not exist.`
        )
      }
      kb.fetcher.nowOrWhenFetched(aclDoc, undefined, function (
        ok,
        message,
        response
      ) {
        if (!ok) {
          callbackFunction(
            true,
            response.status,
            aclDoc,
            `Can't read Access Control File ${aclDoc}: ${message}`
          )
        } else {
          callbackFunction(true, 200, aclDoc)
        }
      })
    }
  })
}

/**
 * Calls [[getACLorDefault]] and then (?)
 */
export async function getProspectiveHolder (targetDirectory: string): Promise<$rdf.NamedNode | undefined> {
  return new Promise((resolve, reject) => getACLorDefault($rdf.sym(targetDirectory), (
    ok,
    isDirectACL,
    targetDoc,
    targetACLDoc,
    defaultHolder
  ) => {
    if (ok) {
      return resolve((isDirectACL ? targetDoc : defaultHolder) as $rdf.NamedNode)
    }
    return reject(new Error(`Error loading ${targetDirectory}`))
  }))
}
