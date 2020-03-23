/**
 * Signing in, signing up, profile and preferences reloading
 * Type index management
 *
 * Many functions in this module take a context object which
 * holds various RDF symbols, add to it, and return a promise of it.
 *
 * * `me`                RDF symbol for the user's WebID
 * * `publicProfile`     The user's public profile, iff loaded
 * * `preferencesFile`   The user's personal preference file, iff loaded
 * * `index.public`      The user's public type index file
 * * `index.private`     The user's private type index file
 *
 * Not RDF symbols:
 * * `noun`            A string in english for the type of thing -- like "address book"
 * * `instance`        An array of nodes which are existing instances
 * * `containers`      An array of nodes of containers of instances
 * * `div`             A DOM element where UI can be displayed
 * * `statusArea`      A DOM element (opt) progress stuff can be displayed, or error messages
 * @packageDocumentation
 */
import SolidTls from 'solid-auth-tls'
import * as $rdf from 'rdflib'
import widgets from '../widgets'
import solidAuthClient from 'solid-auth-client'
import ns from '../ns.js'
import kb from '../store.js'
import utils from '../utils.js'
import { alert } from '../log'
import { AppDetails, AuthenticationContext } from './types'
import { PaneDefinition } from 'pane-registry'
import * as debug from '../debug'

export { solidAuthClient }

// const userCheckSite = 'https://databox.me/'

/**
 * Look for and load the User who has control over it
 */
export function findOriginOwner (doc: $rdf.NamedNode | string): string | boolean {
  const uri = (typeof doc === 'string') ? doc : doc.uri
  const i = uri.indexOf('://')
  if (i < 0) return false
  const j = uri.indexOf('/', i + 3)
  if (j < 0) return false
  const origin = uri.slice(0, j + 1) // @@ TBC
  return origin
}

/**
 * Saves `webId` in `context.me`
 * @param webId
 * @param context
 *
 * @returns Returns the WebID, after setting it
 */
export function saveUser (
  webId: $rdf.NamedNode | string | null,
  context?: AuthenticationContext
): $rdf.NamedNode | null {
  // @@ TODO Remove the need for having context as output argument
  let webIdUri: string
  if (webId) {
    webIdUri = (typeof webId === 'string') ? webId : webId.uri
    const me = $rdf.namedNode(webIdUri)
    if (context) {
      context.me = me
    }
    return me
  }
  return null
}

/**
 * Wrapper around [[offlineTestID]]
 * @returns {NamedNode|null}
 */
export function defaultTestUser (): $rdf.NamedNode | null {
  // Check for offline override
  const offlineId = offlineTestID()

  if (offlineId) {
    return offlineId
  }

  return null
}

/**
 * Checks synchronously whether user is logged in
 *
 * @returns Named Node or null
 */
export function currentUser (): $rdf.NamedNode | null {
  const str = localStorage['solid-auth-client']
  if (str) {
    const da = JSON.parse(str)
    if (da.session && da.session.webId) {
      // @@ TODO check has not expired
      return $rdf.sym(da.session.webId)
    }
  }
  return offlineTestID() // null unless testing
  // JSON.parse(localStorage['solid-auth-client']).session.webId
}

/**
 * Resolves with the logged in user's WebID
 *
 * @param context
 */
export function logIn (context: AuthenticationContext): Promise<AuthenticationContext> {
  const me = defaultTestUser() // me is a NamedNode or null

  if (me) {
    context.me = me
    return Promise.resolve(context)
  }

  return new Promise(resolve => {
    checkUser().then(webId => {
      // Already logged in?
      if (webId) {
        context.me = $rdf.sym(webId as string)
        debug.log(`logIn: Already logged in as ${context.me}`)
        return resolve(context)
      }
      if (!context.div || !context.dom) {
        return resolve(context)
      }
      const box = loginStatusBox(context.dom, webIdUri => {
        saveUser(webIdUri, context)
        resolve(context) // always pass growing context
      })
      context.div.appendChild(box)
    })
  })
}

/**
 * Logs the user in and loads their WebID profile document into the store
 *
 * @param context
 *
 * @returns Resolves with the context after login / fetch
 */
export function logInLoadProfile (context: AuthenticationContext): Promise<AuthenticationContext> {
  if (context.publicProfile) {
    return Promise.resolve(context)
  } // already done
  const fetcher = kb.fetcher
  let profileDocument
  return new Promise(function (resolve, reject) {
    return logIn(context)
      .then(context => {
        const webID = context.me
        if (!webID) {
          return reject(new Error('Could not log in'))
        }
        profileDocument = webID.doc()
        // Load the profile into the knowledge base (fetcher.store)
        //   withCredentials: Web arch should let us just load by turning off creds helps CORS
        //   reload: Gets around a specific old Chrome bug caching/origin/cors
        fetcher
          .load(profileDocument, { withCredentials: false, cache: 'reload' })
          .then(_response => {
            context.publicProfile = profileDocument
            resolve(context)
          })
          .catch(err => {
            const message = `Logged in but cannot load profile ${profileDocument} : ${err}`
            if (context.div && context.dom) {
              context.div.appendChild(
                widgets.errorMessageBlock(context.dom, message)
              )
            }
            reject(message)
          })
      })
      .catch(err => {
        reject(new Error(`Can't log in: ${err}`))
      })
  })
}

/**
 * Loads preference file
 * Do this after having done log in and load profile
 *
 * @private
 *
 * @param context
 */
export function logInLoadPreferences (context: AuthenticationContext): Promise<AuthenticationContext> {
  if (context.preferencesFile) return Promise.resolve(context) // already done

  const statusArea = context.statusArea || context.div || null
  let progressDisplay
  return new Promise(function (resolve, reject) {
    return logInLoadProfile(context)
      .then(context => {
        const preferencesFile = kb.any(context.me, ns.space('preferencesFile'))

        function complain (message) {
          message = `logInLoadPreferences: ${message}`
          if (statusArea) {
            // statusArea.innerHTML = ''
            statusArea.appendChild(
              widgets.errorMessageBlock(context.dom, message)
            )
          }
          debug.log(message)
          reject(new Error(message))
        }

        /**
         * Are we working cross-origin?
         * Returns True if we are in a webapp at an origin, and the file origin is different
         */
        function differentOrigin (): boolean {
          return `${window.location.origin}/` !== preferencesFile.site().uri
        }

        if (!preferencesFile) {
          return reject(new Error(`Can't find a preference file pointer in profile ${context.publicProfile}`))
        }

        // //// Load preference file
        return kb.fetcher
          .load(preferencesFile, { withCredentials: true })
          .then(function () {
            if (progressDisplay) {
              progressDisplay.parentNode.removeChild(progressDisplay)
            }
            context.preferencesFile = preferencesFile
            return resolve(context)
          })
          .catch(function (err) {
            // Really important to look at why
            const status = err.status
            const message = err.message
            debug.log(
              `HTTP status ${status} for preference file ${preferencesFile}`
            )
            let m2
            if (status === 401) {
              m2 = 'Strange - you are not authenticated (properly logged in) to read preference file.'
              alert(m2)
            } else if (status === 403) {
              if (differentOrigin()) {
                m2 = `Unauthorized: Assuming preference file blocked for origin ${window.location.origin}`
                context.preferencesFileError = m2
                return resolve(context)
              }
              m2 = 'You are not authorized to read your preference file. This may be because you are using an untrusted web app.'
              debug.warn(m2)
            } else if (status === 404) {
              if (
                confirm(`You do not currently have a preference file. OK for me to create an empty one? ${preferencesFile}`)
              ) {
                // @@@ code me  ... weird to have a name of the file but no file
                alert(`Sorry; I am not prepared to do this. Please create an empty file at ${preferencesFile}`)
                return complain(
                  new Error('Sorry; no code yet to create a preference file at ')
                )
              } else {
                reject(
                  new Error(`User declined to create a preference file at ${preferencesFile}`)
                )
              }
            } else {
              m2 = `Strange: Error ${status} trying to read your preference file.${message}`
              alert(m2)
            }
          }) // load preference file then
      })
      .catch(err => {
        // Fail initial login load preferences
        reject(new Error(`(via loadPrefs) ${err}`))
      })
  })
}

/**
 * Resolves with the same context, outputting
 * output: index.public, index.private
 *
 * @see https://github.com/solid/solid/blob/master/proposals/data-discovery.md#discoverability
 */
export async function loadTypeIndexes (context: AuthenticationContext): Promise<AuthenticationContext> {
  await loadPublicTypeIndex(context)
  await loadPrivateTypeIndex(context)
  return context
}

async function loadPublicTypeIndex (context: AuthenticationContext): Promise<AuthenticationContext> {
  return loadIndex(context, ns.solid('publicTypeIndex'), true)
}

async function loadPrivateTypeIndex (context: AuthenticationContext): Promise<AuthenticationContext> {
  return loadIndex(context, ns.solid('privateTypeIndex'), false)
}

async function loadOneTypeIndex (context: AuthenticationContext, isPublic: boolean): Promise<AuthenticationContext> {
  const predicate = isPublic
    ? ns.solid('publicTypeIndex')
    : ns.solid('privateTypeIndex')
  return loadIndex(context, predicate, isPublic)
}

async function loadIndex (
  context: AuthenticationContext,
  predicate: $rdf.NamedNode,
  isPublic: boolean
): Promise<AuthenticationContext> {
  // Loading preferences is more than loading profile
  try {
    ;(await isPublic)
      ? logInLoadProfile(context)
      : logInLoadPreferences(context)
  } catch (err) {
    widgets.complain(context, `loadPubicIndex: login and load problem ${err}`)
  }
  const me = context.me
  let ixs
  context.index = context.index || {}

  if (isPublic) {
    ixs = kb.each(me, predicate, undefined, context.publicProfile)
    context.index.public = ixs
  } else {
    if (!context.preferencesFileError) {
      ixs = kb.each(
        me,
        ns.solid('privateTypeIndex'),
        undefined,
        context.preferencesFile
      )
      context.index.private = ixs
      if (ixs.length === 0) {
        widgets.complain(`Your preference file ${context.preferencesFile} does not point to a private type index.`)
        return context
      }
    } else {
      debug.log(
        'We know your preference file is not available, so we are not bothering with private type indexes.'
      )
    }
  }

  try {
    await kb.fetcher.load(ixs)
  } catch (err) {
    widgets.complain(context, `loadPubicIndex: loading public type index ${err}`)
  }
  return context
}

/**
 * Resolves with the same context, outputting
 * @see https://github.com/solid/solid/blob/master/proposals/data-discovery.md#discoverability
 */
async function ensureTypeIndexes (context: AuthenticationContext): Promise<AuthenticationContext> {
  await ensureOneTypeIndex(context, true)
  await ensureOneTypeIndex(context, false)
  return context
}

/**
 * Load or create ONE type index
 * Find one or make one or fail
 * Many reasons for failing including script not having permission etc
 *
 * Adds its output to the context
 * @see https://github.com/solid/solid/blob/master/proposals/data-discovery.md#discoverability
 */
async function ensureOneTypeIndex (context: AuthenticationContext, isPublic: boolean): Promise<AuthenticationContext | void> {
  async function makeIndexIfNecessary (context, isPublic) {
    const relevant = isPublic ? context.publicProfile : context.preferencesFile
    const visibility = isPublic ? 'public' : 'private'

    async function putIndex (newIndex) {
      try {
        await kb.fetcher.webOperation('PUT', newIndex.uri, {
          data: `# ${new Date()} Blank initial Type index
`,
          contentType: 'text/turtle'
        })
        return context
      } catch (e) {
        const msg = `Error creating new index ${e}`
        widgets.complain(context, msg)
      }
    } // putIndex

    context.index = context.index || {}
    context.index[visibility] = context.index[visibility] || []
    let newIndex
    if (context.index[visibility].length === 0) {
      newIndex = $rdf.sym(`${relevant.dir().uri + visibility}TypeIndex.ttl`)
      debug.log(`Linking to new fresh type index ${newIndex}`)
      if (!confirm(`OK to create a new empty index file at ${newIndex}, overwriting anything that is now there?`)) {
        throw new Error('cancelled by user')
      }
      debug.log(`Linking to new fresh type index ${newIndex}`)
      const addMe = [
        $rdf.st(context.me, ns.solid(`${visibility}TypeIndex`), newIndex, relevant)
      ]
      try {
        await updatePromise(kb.updater, [], addMe)
      } catch (err) {
        const msg = `Error saving type index link saving back ${newIndex}: ${err}`
        widgets.complain(context, msg)
        return context
      }

      debug.log(`Creating new fresh type index file${newIndex}`)
      await putIndex(newIndex)
      context.index[visibility].push(newIndex) // @@ wait
    } else {
      // officially exists
      const ixs = context.index[visibility]
      try {
        await kb.fetcher.load(ixs)
      } catch (err) {
        widgets.complain(context, `ensureOneTypeIndex: loading indexes ${err}`)
      }
    }
  } // makeIndexIfNecessary

  try {
    await loadOneTypeIndex(context, isPublic)
    if (context.index) {
      debug.log(
        `ensureOneTypeIndex: Type index exists already ${isPublic}`
          ? context.index.public[0]
          : context.index.private[0]
      )
    }
    return context
  } catch (error) {
    await makeIndexIfNecessary(context, isPublic)
    // widgets.complain(context, 'calling loadOneTypeIndex:' + error)
  }
}

/**
 * Returns promise of context with arrays of symbols
 *
 * 2016-12-11 change to include forClass arc a la
 * https://github.com/solid/solid/blob/master/proposals/data-discovery.md
 */
export async function findAppInstances (
  context: AuthenticationContext,
  theClass: $rdf.NamedNode,
  isPublic: boolean
): Promise<AuthenticationContext> {
  const fetcher = kb.fetcher
  if (isPublic === undefined) {
    // Then both public and private
    await findAppInstances(context, theClass, true)
    await findAppInstances(context, theClass, false)
    return context
  }

  const visibility = isPublic ? 'public' : 'private'
  try {
    await loadOneTypeIndex(context, isPublic)
  } catch (err) {
  }
  const index = context.index as { [key: string]: Array<$rdf.NamedNode> }
  const thisIndex = index[visibility]
  const registrations = thisIndex
    .map(ix => kb.each(undefined, ns.solid('forClass'), theClass, ix))
    .flat()
  const instances = registrations
    .map(reg => kb.each(reg, ns.solid('instance')))
    .flat()
  const containers = registrations
    .map(reg => kb.each(reg, ns.solid('instanceContainer')))
    .flat()

  context.instances = context.instances || []
  context.instances = context.instances.concat(instances)

  context.containers = context.containers || []
  context.containers = context.containers.concat(containers)
  if (!containers.length) {
    return context
  }
  // If the index gives containers, then look up all things within them
  try {
    await fetcher.load(containers)
  } catch (err) {
    const e = new Error(`[FAI] Unable to load containers${err}`)
    debug.log(e) // complain
    widgets.complain(context, `Error looking for ${utils.label(theClass)}:  ${err}`)
    // but then ignore it
    // throw new Error(e)
  }
  for (let i = 0; i < containers.length; i++) {
    const cont = containers[i]
    context.instances = context.instances.concat(
      kb.each(cont, ns.ldp('contains'))
    )
  }
  return context
}

// @@@@ use the one in rdflib.js when it is available and delete this
function updatePromise (
  updater: $rdf.UpdateManager,
  del: Array<$rdf.Statement>,
  ins: Array<$rdf.Statement> = []
): Promise<void> {
  return new Promise(function (resolve, reject) {
    updater.update(del, ins, function (uri, ok, errorBody) {
      if (!ok) {
        reject(new Error(errorBody))
      } else {
        resolve()
      }
    }) // callback
  }) // promise
}

/**
 * Register a new app in a type index
 */
export async function registerInTypeIndex (
  context: AuthenticationContext,
  instance: $rdf.NamedNode,
  theClass: $rdf.NamedNode,
  isPublic: boolean
): Promise<AuthenticationContext> {
  await ensureOneTypeIndex(context, isPublic)
  if (!context.index) {
    throw new Error('registerInTypeIndex: No type index found')
  }
  const indexes = isPublic ? context.index.public : context.index.private
  if (!indexes.length) {
    throw new Error('registerInTypeIndex: What no type index?')
  }
  const index = indexes[0]
  const registration = widgets.newThing(index)
  const ins = [
    // See https://github.com/solid/solid/blob/master/proposals/data-discovery.md
    $rdf.st(registration, ns.rdf('type'), ns.solid('TypeRegistration'), index),
    $rdf.st(registration, ns.solid('forClass'), theClass, index),
    $rdf.st(registration, ns.solid('instance'), instance, index)
  ]
  try {
    await updatePromise(kb.updater, [], ins)
  } catch (e) {
    debug.log(e)
    alert(e)
  }
  return context
}

/**
 * UI to control registration of instance
 */
export function registrationControl (
  context: AuthenticationContext,
  instance,
  theClass
): Promise<AuthenticationContext | void> {
  const dom = context.dom
  if (!dom || !context.div) {
    return Promise.resolve()
  }
  const box = dom.createElement('div')
  context.div.appendChild(box)

  return ensureTypeIndexes(context)
    .then(function () {
      box.innerHTML = '<table><tbody><tr></tr><tr></tr></tbody></table>' // tbody will be inserted anyway
      box.setAttribute('style', 'font-size: 120%; text-align: right; padding: 1em; border: solid gray 0.05em;')
      const tbody = box.children[0].children[0]
      const form = kb.bnode() // @@ say for now

      const registrationStatements = function (index) {
        const registrations = kb
          .each(undefined, ns.solid('instance'), instance)
          .filter(function (r) {
            return kb.holds(r, ns.solid('forClass'), theClass)
          })
        const reg = registrations.length
          ? registrations[0]
          : widgets.newThing(index)
        return [
          $rdf.st(reg, ns.solid('instance'), instance, index),
          $rdf.st(reg, ns.solid('forClass'), theClass, index)
        ]
      }

      let index, statements

      if (context.index && context.index.public && context.index.public.length > 0) {
        index = context.index.public[0]
        statements = registrationStatements(index)
        tbody.children[0].appendChild(
          widgets.buildCheckboxForm(
            context.dom,
            kb,
            `Public link to this ${context.noun}`,
            null,
            statements,
            form,
            index
          )
        )
      }

      if (context.index && context.index.private && context.index.private.length > 0) {
        index = context.index.private[0]
        statements = registrationStatements(index)
        tbody.children[1].appendChild(
          widgets.buildCheckboxForm(
            context.dom,
            kb,
            `Personal note of this ${context.noun}`,
            null,
            statements,
            form,
            index
          )
        )
      }
      return context
    },
    function (e) {
      let msg
      if (context.div && context.preferencesFileError) {
        msg = '(Preferences not available)'
        context.div.appendChild(dom.createElement('p')).textContent = msg
      } else if (context.div) {
        msg = `registrationControl: Type indexes not available: ${e}`
        context.div.appendChild(widgets.errorMessageBlock(context.dom, e))
      }
      debug.log(msg)
    }
    )
    .catch(function (e) {
      const msg = `registrationControl: Error making panel: ${e}`
      if (context.div) {
        context.div.appendChild(widgets.errorMessageBlock(context.dom, e))
      }
      debug.log(msg)
    })
}

/**
 * UI to List at all registered things
 */
export function registrationList (context: AuthenticationContext, options: {
  private?: boolean
  public?: boolean
}): Promise<AuthenticationContext> {
  const dom = context.dom as HTMLDocument
  const div = context.div as HTMLElement

  const box = dom.createElement('div')
  div.appendChild(box)

  return ensureTypeIndexes(context).then(_indexes => {
    box.innerHTML = '<table><tbody></tbody></table>' // tbody will be inserted anyway
    box.setAttribute('style', 'font-size: 120%; text-align: right; padding: 1em; border: solid #eee 0.5em;')
    const table = box.firstChild as HTMLElement

    let ix: Array<$rdf.NamedNode> = []
    let sts = []
    const vs = ['private', 'public']
    vs.forEach(function (visibility) {
      if (context.index && options[visibility]) {
        ix = ix.concat(context.index[visibility][0])
        sts = sts.concat(
          kb.statementsMatching(
            undefined,
            ns.solid('instance'),
            undefined,
            context.index[visibility][0]
          )
        )
      }
    })

    for (let i = 0; i < sts.length; i++) {
      const statement: $rdf.Statement = sts[i]
      // const cla = statement.subject
      const inst = statement.object
      // if (false) {
      //   const tr = table.appendChild(dom.createElement('tr'))
      //   const anchor = tr.appendChild(dom.createElement('a'))
      //   anchor.setAttribute('href', inst.uri)
      //   anchor.textContent = utils.label(inst)
      // } else {
      // }

      table.appendChild(widgets.personTR(dom, ns.solid('instance'), inst, {
        deleteFunction: function (_x) {
          kb.updater.update([statement], [], function (uri, ok, errorBody) {
            if (ok) {
              debug.log(`Removed from index: ${statement.subject}`)
            } else {
              debug.log(`Error: Cannot delete ${statement}: ${errorBody}`)
            }
          })
        }
      }))
    }

    /*
       //const containers = kb.each(theClass, ns.solid('instanceContainer'));
       if (containers.length) {
       fetcher.load(containers).then(function(xhrs){
       for (const i=0; i<containers.length; i++) {
       const cont = containers[i];
       instances = instances.concat(kb.each(cont, ns.ldp('contains')));
       }
       });
       }
       */

    return context
  })
}

/**
 * Simple Access Control
 *
 * This function sets up a simple default ACL for a resource, with
 * RWC for the owner, and a specified access (default none) for the public.
 * In all cases owner has read write control.
 * Parameter lists modes allowed to public
 *
 * @param options
 * @param options.public eg ['Read', 'Write']
 *
 * @returns Resolves with aclDoc uri on successful write
 */
export function setACLUserPublic (
  docURI: $rdf.NamedNode,
  me: $rdf.NamedNode,
  options: {
    defaultForNew?: boolean,
    public?: []
  }
): Promise<$rdf.NamedNode> {
  const aclDoc = kb.any(
    kb.sym(docURI),
    kb.sym('http://www.iana.org/assignments/link-relations/acl')
  )

  return Promise.resolve()
    .then(() => {
      if (aclDoc) {
        return aclDoc
      }

      return fetchACLRel(docURI).catch(err => {
        throw new Error(`Error fetching rel=ACL header for ${docURI}: ${err}`)
      })
    })
    .then(aclDoc => {
      const aclText = genACLText(docURI, me, aclDoc.uri, options)

      return kb.fetcher
        .webOperation('PUT', aclDoc.uri, {
          data: aclText,
          contentType: 'text/turtle'
        })
        .then(result => {
          if (!result.ok) {
            throw new Error('Error writing ACL text: ' + result.error)
          }

          return aclDoc
        })
    })
}

/**
 * @param docURI
 * @returns
 */
function fetchACLRel (docURI: $rdf.NamedNode): Promise<$rdf.NamedNode> {
  const fetcher = kb.fetcher

  return fetcher.load(docURI).then(result => {
    if (!result.ok) {
      throw new Error('fetchACLRel: While loading:' + result.error)
    }

    const aclDoc = kb.any(
      kb.sym(docURI),
      kb.sym('http://www.iana.org/assignments/link-relations/acl')
    )

    if (!aclDoc) {
      throw new Error('fetchACLRel: No Link rel=ACL header for ' + docURI)
    }

    return aclDoc
  })
}

/**
 * @param docURI
 * @param me
 * @param aclURI
 * @param options
 *
 * @returns Serialized ACL
 */
function genACLText (
  docURI: $rdf.NamedNode,
  me: $rdf.NamedNode,
  aclURI: $rdf.NamedNode,
  options: {
    defaultForNew?: boolean,
    public?: []
  } = {}
): string {
  const optPublic = options.public || []
  const g = $rdf.graph()
  const auth = $rdf.Namespace('http://www.w3.org/ns/auth/acl#')
  let a = g.sym(`${aclURI}#a1`)
  const acl = g.sym(aclURI)
  const doc = g.sym(docURI)
  g.add(a, ns.rdf('type'), auth('Authorization'), acl)
  g.add(a, auth('accessTo'), doc, acl)
  if (options.defaultForNew) {
    // TODO: Should this be auth('default') instead?
    g.add(a, auth('defaultForNew'), doc, acl)
  }
  g.add(a, auth('agent'), me, acl)
  g.add(a, auth('mode'), auth('Read'), acl)
  g.add(a, auth('mode'), auth('Write'), acl)
  g.add(a, auth('mode'), auth('Control'), acl)

  if (optPublic.length) {
    a = g.sym(`${aclURI}#a2`)
    g.add(a, ns.rdf('type'), auth('Authorization'), acl)
    g.add(a, auth('accessTo'), doc, acl)
    g.add(a, auth('agentClass'), ns.foaf('Agent'), acl)
    for (let p = 0; p < optPublic.length; p++) {
      g.add(a, auth('mode'), auth(optPublic[p]), acl) // Like 'Read' etc
    }
  }
  // @@ TODO Remove casting of $rdf
  return ($rdf as any).serialize(acl, g, aclURI, 'text/turtle')
}

/**
 * Returns `$rdf.sym($SolidTestEnvironment.username)` if
 * `$SolidTestEnvironment.username` is defined as a global
 * @returns {NamedNode|null}
 */
export function offlineTestID (): $rdf.NamedNode | null {
  const { $SolidTestEnvironment }: any = window
  if (
    typeof $SolidTestEnvironment !== 'undefined' &&
    $SolidTestEnvironment.username
  ) {
    // Test setup
    debug.log('Assuming the user is ' + $SolidTestEnvironment.username)
    return $rdf.sym($SolidTestEnvironment.username)
  }

  if (
    typeof document !== 'undefined' &&
    document.location &&
    ('' + document.location).slice(0, 16) === 'http://localhost'
  ) {
    const div = document.getElementById('appTarget')
    if (!div) return null
    const id = div.getAttribute('testID')
    if (!id) return null
    /* me = kb.any(subject, ns.acl('owner')); // when testing on plane with no WebID
     */
    debug.log('Assuming user is ' + id)
    return $rdf.sym(id)
  }
  return null
}

function getDefaultSignInButtonStyle (): string {
  return 'padding: 1em; border-radius:0.5em; margin: 2em; font-size: 100%;'
}

/**
 * Bootstrapping identity
 * (Called by `loginStatusBox()`)
 *
 * @param dom
 * @param setUserCallback
 *
 * @returns
 */
function signInOrSignUpBox (
  dom: HTMLDocument,
  setUserCallback: (user: string) => void,
  options: {
    buttonStyle?: string
  } = {}
): HTMLElement {
  options = options || {}
  const signInButtonStyle = options.buttonStyle || getDefaultSignInButtonStyle()

  // @@ TODO Remove the need to cast HTML element to any
  const box: any = dom.createElement('div')
  const magicClassName = 'SolidSignInOrSignUpBox'
  debug.log('widgets.signInOrSignUpBox')
  box.setUserCallback = setUserCallback
  box.setAttribute('class', magicClassName)
  box.style = 'display:flex;'

  // Sign in button with PopUP
  const signInPopUpButton = dom.createElement('input') // multi
  box.appendChild(signInPopUpButton)
  signInPopUpButton.setAttribute('type', 'button')
  signInPopUpButton.setAttribute('value', 'Log in')
  signInPopUpButton.setAttribute('style', `${signInButtonStyle}background-color: #eef;`)

  signInPopUpButton.addEventListener('click', () => {
    const offline = offlineTestID()
    if (offline) return setUserCallback(offline.uri)
    return solidAuthClient.popupLogin().then(session => {
      const webIdURI = session.webId
      // setUserCallback(webIdURI)
      const divs = dom.getElementsByClassName(magicClassName)
      debug.log(`Logged in, ${divs.length} panels to be serviced`)
      // At the same time, satisfy all the other login boxes
      for (let i = 0; i < divs.length; i++) {
        const div: any = divs[i]
        // @@ TODO Remove the need to manipulate HTML elements
        if (div.setUserCallback) {
          try {
            div.setUserCallback(webIdURI)
            const parent = div.parentNode
            if (parent) {
              parent.removeChild(div)
            }
          } catch (e) {
            debug.log(`## Error satisfying login box: ${e}`)
            div.appendChild(widgets.errorMessageBlock(dom, e))
          }
        }
      }
    })
  }, false)

  // Sign up button
  const signupButton = dom.createElement('input')
  box.appendChild(signupButton)
  signupButton.setAttribute('type', 'button')
  signupButton.setAttribute('value', 'Sign Up for Solid')
  signupButton.setAttribute('style', `${signInButtonStyle}background-color: #efe;`)

  signupButton.addEventListener('click', function (_event) {
    const signupMgr = new SolidTls.Signup()
    signupMgr.signup().then(function (uri) {
      debug.log('signInOrSignUpBox signed up ' + uri)
      setUserCallback(uri)
    })
  }, false)
  return box
}

/**
 * @returns {Promise<string|null>} Resolves with WebID URI or null
 */
function webIdFromSession (session?: { webId: string }): string | null {
  const webId = session ? session.webId : null
  if (webId) {
    saveUser(webId)
  }
  return webId
}

/**
 * @returns {Promise<string|null>} Resolves with WebID URI or null
 */

/*
function checkCurrentUser () {
  return checkUser()
}
*/

/**
 * Retrieves currently logged in webId from either
 * defaultTestUser or SolidAuthClient
 * @param [setUserCallback] Optional callback
 *
 * @returns Resolves with webId uri, if no callback provided
 */
export function checkUser<T> (
  setUserCallback?: (me: $rdf.NamedNode | null) => T
): Promise<$rdf.NamedNode | T> {
  // Check to see if already logged in / have the WebID
  const me = defaultTestUser()
  if (me) {
    return Promise.resolve(setUserCallback ? setUserCallback(me) : me)
  }

  // doc = kb.any(doc, ns.link('userMirror')) || doc

  return solidAuthClient
    .currentSession()
    .then(webIdFromSession)
    .catch(err => {
      debug.log('Error fetching currentSession:', err)
    })
    .then(webId => {
      // if (webId.startsWith('dns:')) {  // legacy rww.io pseudo-users
      //   webId = null
      // }
      const me = saveUser(webId)

      if (me) {
        debug.log(`(Logged in as ${me} by authentication)`)
      }

      return setUserCallback ? setUserCallback(me) : me
    })
}

/**
 * Login status box
 *
 * A big sign-up/sign in box or a logout box depending on the state
 *
 * @param dom
 * @param listener
 *
 * @returns
 */
export function loginStatusBox (
  dom: HTMLDocument,
  listener: ((uri: string | null) => void) | null = null,
  options: {
    buttonStyle?: string
  } = {}
): HTMLElement {
  // 20190630
  let me = defaultTestUser()
  // @@ TODO Remove the need to cast HTML element to any
  const box: any = dom.createElement('div')

  function setIt (newidURI) {
    if (!newidURI) {
      return
    }

    const uri = newidURI.uri || newidURI
    //    UI.preferences.set('me', uri)
    me = $rdf.sym(uri)
    box.refresh()
    if (listener) listener(me.uri)
  }

  function logoutButtonHandler (_event) {
    // UI.preferences.set('me', '')
    solidAuthClient.logout().then(
      function () {
        const message = `Your WebID was ${me}. It has been forgotten.`
        me = null
        try {
          alert(message)
        } catch (e) {
          window.alert(message)
        }
        box.refresh()
        if (listener) listener(null)
      },
      err => {
        alert('Fail to log out:' + err)
      }
    )
  }

  function logoutButton (me, options) {
    const signInButtonStyle = options.buttonStyle || getDefaultSignInButtonStyle()
    let logoutLabel = 'WebID logout'
    if (me) {
      const nick =
        kb.any(me, ns.foaf('nick')) ||
        kb.any(me, ns.foaf('name'))
      if (nick) {
        logoutLabel = 'Logout ' + nick.value
      }
    }
    const signOutButton = dom.createElement('input')
    // signOutButton.className = 'WebIDCancelButton'
    signOutButton.setAttribute('type', 'button')
    signOutButton.setAttribute('value', logoutLabel)
    signOutButton.setAttribute('style', `${signInButtonStyle}background-color: #eee;`)
    signOutButton.addEventListener('click', logoutButtonHandler, false)
    return signOutButton
  }

  box.refresh = function () {
    solidAuthClient.currentSession().then(
      session => {
        if (session && session.webId) {
          me = $rdf.sym(session.webId)
        } else {
          me = null
        }
        if ((me && box.me !== me.uri) || (!me && box.me)) {
          widgets.clearElement(box)
          if (me) {
            box.appendChild(logoutButton(me, options))
          } else {
            box.appendChild(signInOrSignUpBox(dom, setIt, options))
          }
        }
        box.me = me ? me.uri : null
      },
      err => {
        alert(`loginStatusBox: ${err}`)
      }
    )
  }

  if (solidAuthClient.trackSession) {
    solidAuthClient.trackSession(session => {
      if (session && session.webId) {
        me = $rdf.sym(session.webId)
      } else {
        me = null
      }
      box.refresh()
    })
  }

  box.me = '99999' // Force refresh
  box.refresh()
  return box
}

/**
 * Workspace selection etc
 * See https://github.com/solid/userguide/issues/16
 */

/**
 * Returns a UI object which, if it selects a workspace,
 * will callback(workspace, newBase).
 * See https://github.com/solid/userguide/issues/16 for more info on workspaces.
 *
 * If necessary, will get an account, preference file, etc. In sequence:
 *
 *   - If not logged in, log in.
 *   - Load preference file
 *   - Prompt user for workspaces
 *   - Allows the user to just type in a URI by hand
 *
 * Calls back with the workspace and the base URI
 *
 * @param dom
 * @param appDetails
 * @param callbackWS
 */
export function selectWorkspace (
  dom: HTMLDocument,
  appDetails: AppDetails,
  callbackWS: (workspace: string | null, newBase: string) => void
): HTMLElement {
  const noun = appDetails.noun
  const appPathSegment = appDetails.appPathSegment

  const me = defaultTestUser()
  const box = dom.createElement('div')
  const context: AuthenticationContext = { me: me, dom: dom, div: box }

  function say (s) {
    box.appendChild(widgets.errorMessageBlock(dom, s))
  }

  function figureOutBase (ws) {
    let newBase = kb.any(ws, ns.space('uriPrefix'))
    if (!newBase) {
      newBase = ws.uri.split('#')[0]
    } else {
      newBase = newBase.value
    }
    if (newBase.slice(-1) !== '/') {
      debug.log(`${appPathSegment}: No / at end of uriPrefix ${newBase}`) // @@ paramater?
      newBase = `${newBase}/`
    }
    const now = new Date()
    newBase += `${appPathSegment}/id${now.getTime()}/` // unique id
    return newBase
  }

  function displayOptions (context) {
    // const status = ''
    const id = context.me
    const preferencesFile = context.preferencesFile
    let newBase = null

    // A workspace specifically defined in the private preference file:
    let w = kb
      .statementsMatching(
        id,
        ns.space('workspace'), // Only trust preference file here
        undefined,
        preferencesFile
      )
      .map(function (st) {
        return st.object
      })

    // A workspace in a storage in the public profile:
    const storages = kb.each(id, ns.space('storage')) // @@ No provenance requirement at the moment
    storages.map(function (s) {
      w = w.concat(kb.each(s, ns.ldp('contains')))
    })

    if (w.length === 1) {
      say(`Workspace used: ${w[0].uri}`) // @@ allow user to see URI
      newBase = figureOutBase(w[0])
      // callbackWS(w[0], newBase)
    } else if (w.length === 0) {
      say(`You don't seem to have any workspaces. You have ${storages.length} storage spaces.`)
    }

    // Prompt for ws selection or creation
    // say( w.length + " workspaces for " + id + "Choose one.");
    const table = dom.createElement('table')
    table.setAttribute('style', 'border-collapse:separate; border-spacing: 0.5em;')

    // const popup = window.open(undefined, '_blank', { height: 300, width:400 }, false)
    box.appendChild(table)

    //  Add a field for directly adding the URI yourself

    // const hr = box.appendChild(dom.createElement('hr')) // @@
    box.appendChild(dom.createElement('hr')) // @@

    const p = box.appendChild(dom.createElement('p'))
    p.textContent = `Where would you like to store the data for the ${noun}?  Give the URL of the directory where you would like the data stored.`
    // @@ TODO Remove the need to cast baseField to any
    const baseField: any = box.appendChild(dom.createElement('input'))
    baseField.setAttribute('type', 'text')
    baseField.size = 80 // really a string
    baseField.label = 'base URL'
    baseField.autocomplete = 'on'
    if (newBase) {
      // set to default
      baseField.value = newBase
    }

    context.baseField = baseField

    box.appendChild(dom.createElement('br')) // @@

    const button = box.appendChild(dom.createElement('button'))
    button.textContent = `Start new ${noun} at this URI`
    button.addEventListener('click', function (_event) {
      let newBase = baseField.value
      if (newBase.slice(-1) !== '/') {
        newBase += '/'
      }
      callbackWS(null, newBase)
    })

    // Now go set up the table of spaces

    // const row = 0
    w = w.filter(function (x) {
      return !kb.holds(
        x,
        ns.rdf('type'), // Ignore master workspaces
        ns.space('MasterWorkspace')
      )
    })
    let col1, col2, col3, tr, ws, style, comment
    const cellStyle = 'height: 3em; margin: 1em; padding: 1em white; border-radius: 0.3em;'
    const deselectedStyle = `${cellStyle}border: 0px;`
    // const selectedStyle = cellStyle + 'border: 1px solid black;'
    for (let i = 0; i < w.length; i++) {
      ws = w[i]
      tr = dom.createElement('tr')
      if (i === 0) {
        col1 = dom.createElement('td')
        col1.setAttribute('rowspan', `${w.length}1`)
        col1.textContent = 'Choose a workspace for this:'
        col1.setAttribute('style', 'vertical-align:middle;')
        tr.appendChild(col1)
      }
      col2 = dom.createElement('td')
      style = kb.any(ws, ns.ui('style'))
      if (style) {
        style = style.value
      } else {
        // Otherwise make up arbitrary colour
        const hash = function (x) {
          return x.split('').reduce(function (a, b) {
            a = (a << 5) - a + b.charCodeAt(0)
            return a & a
          }, 0)
        }
        const bgcolor = `#${((hash(ws.uri) & 0xffffff) | 0xc0c0c0).toString(16)}` // c0c0c0  forces pale
        style = `color: black ; background-color: ${bgcolor};`
      }
      col2.setAttribute('style', deselectedStyle + style)
      tr.target = ws.uri
      let label = kb.any(ws, ns.rdfs('label'))
      if (!label) {
        label = ws.uri.split('/').slice(-1)[0] || ws.uri.split('/').slice(-2)[0]
      }
      col2.textContent = label || '???'
      tr.appendChild(col2)
      if (i === 0) {
        col3 = dom.createElement('td')
        col3.setAttribute('rowspan', `${w.length}1`)
        // col3.textContent = '@@@@@ remove';
        col3.setAttribute('style', 'width:50%;')
        tr.appendChild(col3)
      }
      table.appendChild(tr)

      comment = kb.any(ws, ns.rdfs('comment'))
      comment = comment ? comment.value : 'Use this workspace'
      col2.addEventListener('click', function (_event) {
        col3.textContent = comment ? comment.value : ''
        col3.setAttribute('style', deselectedStyle + style)
        const button = dom.createElement('button')
        button.textContent = 'Continue'
        // button.setAttribute('style', style);
        const newBase = figureOutBase(ws)
        baseField.value = newBase // show user proposed URI

        button.addEventListener('click', function (_event) {
          button.disabled = true
          callbackWS(ws, newBase)
          button.textContent = '---->'
        }, true) // capture vs bubble
        col3.appendChild(button)
      }, true) // capture vs bubble
    }

    // last line with "Make new workspace"
    const trLast = dom.createElement('tr')
    col2 = dom.createElement('td')
    col2.setAttribute('style', cellStyle)
    col2.textContent = '+ Make a new workspace'
    // addMyListener(col2, 'Set up a new workspace', '') // @@ TBD
    trLast.appendChild(col2)
    table.appendChild(trLast)
  } // displayOptions

  logInLoadPreferences(context) // kick off async operation
    .then(displayOptions)
    .catch(err => {
      box.appendChild(widgets.errorMessageBlock(err))
    })

  return box // return the box element, while login proceeds
} // selectWorkspace

/**
 * Creates a new instance of an app.
 *
 * An instance of an app could be e.g. an issue tracker for a given project,
 * or a chess game, or calendar, or a health/fitness record for a person.
 *
 * Note that this use of the term 'app' refers more to entries in the user's
 * type index than to actual software applications that use the personal data
 * to which these entries point.
 *
 * @param dom
 * @param appDetails
 * @param callback
 *
 * @returns A div with a button in it for making a new app instance
 */
export function newAppInstance (
  dom: HTMLDocument,
  appDetails: AppDetails,
  callback: (workspace: string | null, newBase: string) => void
): HTMLElement {
  const gotWS = function (ws, base) {
    // $rdf.log.debug("newAppInstance: Selected workspace = " + (ws? ws.uri : 'none'))
    callback(ws, base)
  }
  const div = dom.createElement('div')
  const b = dom.createElement('button')
  b.setAttribute('type', 'button')
  div.appendChild(b)
  b.innerHTML = `Make new ${appDetails.noun}`
  b.addEventListener('click', _event => {
    div.appendChild(selectWorkspace(dom, appDetails, gotWS))
  }, false)
  div.appendChild(b)
  return div
}

/**
 * Retrieves whether the currently logged in user is a power user
 * and/or a developer
 */
export async function getUserRoles (): Promise<Array<$rdf.NamedNode>> {
  try {
    const {
      me,
      preferencesFile,
      preferencesFileError
    } = await logInLoadPreferences({})
    if (!preferencesFile || preferencesFileError) {
      throw new Error(preferencesFileError)
    }
    return kb.each(me, ns.rdf('type'), null, preferencesFile.doc())
  } catch (error) {
    debug.warn('Unable to fetch your preferences - this was the error: ', error)
  }
  return []
}

/**
 * Filters which panes should be available, based on the result of [[getUserRoles]]
 */
export async function filterAvailablePanes (panes: Array<PaneDefinition>): Promise<Array<PaneDefinition>> {
  const userRoles = await getUserRoles()
  return panes.filter(pane => isMatchingAudience(pane, userRoles))
}

function isMatchingAudience (pane: PaneDefinition, userRoles: Array<$rdf.NamedNode>): boolean {
  const audience = pane.audience || []
  return audience.reduce(
    (isMatch, audienceRole) => isMatch && !!userRoles.find(role => role.equals(audienceRole)),
    true as boolean
  )
}
