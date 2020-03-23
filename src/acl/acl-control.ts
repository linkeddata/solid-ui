/**
 * Functions for rendering the ACL User Interface.
 * See https://github.com/solid/userguide/blob/master/views/sharing/userguide.md#view
 * for a screenshot.
 * @packageDocumentation
 */

import ns from '../ns'
import utils from '../utils.js'
import { getACLorDefault, getProspectiveHolder } from './acl'
import { IndexedFormula, NamedNode } from 'rdflib'
import { DataBrowserContext } from 'pane-registry'
import { AccessController } from './access-controller'
import { getClasses } from '../jss'
import { styles } from './styles'
import * as debug from '../debug'

/**
 * See https://coshx.com/preventing-drag-and-drop-disasters-with-a-chrome-userscript
 * Without this dropping anything onto a browser page will cause chrome etc to jump to diff page
 * throwing away all the user's work.
 *
 * In apps which may use drag and drop, this utility takes care of the fact
 * by default in a browser, an uncaught user drop into a browser window
 * causes the browser to lose all its work in that window and navigate to another page
 *
 * @param document  The DOM
 * @returns void
 */
export function preventBrowserDropEvents (document: HTMLDocument): void {
  debug.log('preventBrowserDropEvents called.')
  const global: any = window
  if (typeof global !== 'undefined') {
    if (global.preventBrowserDropEventsDone) return
    global.preventBrowserDropEventsDone = true
  }

  function preventDrag (e) {
    e.stopPropagation()
    e.preventDefault()
  }

  function handleDrop (e) {
    if (e.dataTransfer.files.length > 0) {
      if (
        !confirm(
          'Are you sure you want to drop this file here? ' +
          '(Cancel opens it in a new tab)'
        )
      ) {
        e.stopPropagation()
        e.preventDefault()
        debug.log(
          '@@@@ document-level DROP suppressed: ' + e.dataTransfer.dropEffect
        )
      }
    }
  }

  document.addEventListener('drop', handleDrop, false)
  document.addEventListener('dragenter', preventDrag, false)
  document.addEventListener('dragover', preventDrag, false)
}

/**
 * Get a folder's own filename in the directory tree. Also works for
 * domain names; the URL protocol ('https://') acts as the tree root
 * with short name '/' (see also test/unit/acl/acl-control.test.ts).
 *
 * ```typescript
 * shortNameForFolder($rdf.namedNode('http://example.com/some/folder/'))
 * // 'folder'
 *
 * shortNameForFolder($rdf.namedNode('http://example.com/some/folder'))
 * // 'folder'
 *
 * shortNameForFolder($rdf.namedNode('http://example.com/'))
 * // 'example.com'
 *
 * shortNameForFolder($rdf.namedNode('http://example.com'))
 * // 'example.com'
 *
 * shortNameForFolder($rdf.namedNode('http://'))
 * // '/'
 * ```
 *
 * It also works with relative URLs:
 * ```typescript
 * shortNameForFolder($rdf.namedNode('../folder/'))
 * // 'folder'
 * ```
 *
 * @param x  RDF Node for the folder URL
 * @returns  Short name for the folder
 */
export function shortNameForFolder (x: NamedNode): string {
  let str = x.uri

  // Strip the trailing slash
  if (str.slice(-1) === '/') {
    str = str.slice(0, -1)
  }

  // Remove the path if present, keeping only the part
  // after the last slash.
  const slash = str.lastIndexOf('/')
  if (slash >= 0) {
    str = str.slice(slash + 1)
  }
  // Return the folder's filename, or '/' if nothing found
  // (but see https://github.com/solid/solid-ui/issues/196
  // regarding whether this happens at the domain root or
  // not)
  return str || '/'
}

/**
 * A wrapper that retrieves ACL data and uses it
 * to render an [[AccessController]] component.
 * Presumably the '5' is a version number of some sort,
 * but all we know is it was already called ACLControlBox5
 * when it was introduced into solid-ui in
 * https://github.com/solid/solid-ui/commit/948b874bd93e7bf5160e6e224821b888f07d15f3#diff-4192a29f38a0ababd563b36b47eba5bbR54
 */
export function ACLControlBox5 (
  subject: NamedNode,
  context: DataBrowserContext,
  noun: string,
  kb: IndexedFormula
): HTMLElement {
  const dom = context.dom
  const doc = subject.doc() // The ACL is actually to the doc describing the thing
  const classes = getClasses(dom.head, styles).classes

  const container = dom.createElement('div')
  container.classList.add(classes.aclControlBoxContainer)

  const header = container.appendChild(dom.createElement('h1'))
  header.textContent = `Sharing for ${noun} ${utils.label(subject)}`
  header.classList.add(classes.aclControlBoxHeader)

  const status = container.appendChild(dom.createElement('div'))
  status.classList.add(classes.aclControlBoxStatus)

  try {
    loadController(doc, kb, subject, noun, context, classes, dom, status)
      .then(controller => container.appendChild(controller.render()))
  } catch (error) {
    status.innerText = error
  }

  return container
}

async function loadController (
  doc: NamedNode,
  kb: IndexedFormula,
  subject: NamedNode,
  noun: string,
  context: DataBrowserContext,
  classes: Record<string, string>,
  dom: HTMLDocument,
  status: HTMLElement
): Promise<AccessController> {
  return new Promise((resolve, reject) => getACLorDefault(doc, async (
    ok,
    isDirectACL,
    targetDoc,
    targetACLDoc,
    defaultHolder,
    defaultACLDoc
  ) => {
    if (!ok) {
      return reject(new Error(`Error reading ${isDirectACL ? '' : ' default '}ACL. status ${targetDoc}: ${targetACLDoc}`))
    }
    const targetDirectory = getDirectory(targetDoc as NamedNode)
    const targetIsProtected = isStorage(targetDoc as NamedNode, targetACLDoc as NamedNode, kb) || hasProtectedAcl(targetDoc as NamedNode)
    if (!targetIsProtected && targetDirectory) {
      try {
        const prospectiveDefaultHolder = await getProspectiveHolder(targetDirectory)
        return resolve(getController(prospectiveDefaultHolder))
      } catch (error) {
        // No need to show this error in status, but good to warn about it in console
        debug.warn(error)
      }
    }
    return resolve(getController())

    function getController (prospectiveDefaultHolder?: NamedNode) {
      return new AccessController(subject, noun, context, status, classes, targetIsProtected, targetDoc as NamedNode, targetACLDoc as NamedNode, defaultHolder as NamedNode,
        defaultACLDoc as NamedNode, prospectiveDefaultHolder, kb, dom)
    }
  }))
}

function getDirectory (doc: NamedNode): string | null {
  const str = doc.uri.split('#')[0]
  const p = str.slice(0, -1).lastIndexOf('/')
  const q = str.indexOf('//')
  return (q >= 0 && p < q + 2) || p < 0 ? null : str.slice(0, p + 1)
}

function isStorage (doc: NamedNode, aclDoc: NamedNode, store: IndexedFormula): boolean {
  // @@ TODO: The methods used for targetIsStorage are HACKs - it should not be relied upon, and work is
  // @@ underway to standardize a behavior that does not rely upon this hack
  // @@ hopefully fixed as part of https://github.com/solid/data-interoperability-panel/issues/10
  return store.holds(doc, ns.rdf('type'), ns.space('Storage'), aclDoc)
}

function hasProtectedAcl (targetDoc: NamedNode): boolean {
  // @@ TODO: This is hacky way of knowing whether or not a certain ACL file can be removed
  // Hopefully we'll find a better, standardized solution to this - https://github.com/solid/specification/issues/37
  return targetDoc.uri === targetDoc.site().uri
}
