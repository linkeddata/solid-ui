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
import { graph, namedNode, NamedNode, Namespace, serialize, st, Statement, sym, BlankNode } from 'rdflib'
import solidAuthClient from 'solid-auth-client'
import { PaneDefinition } from 'pane-registry'
import Signup from './signup'
import widgets from '../widgets'
import ns from '../ns.js'
import utils from '../utils.js'
import { alert } from '../log'
import authSession from './authSession'
import { AppDetails, AuthenticationContext } from './types'
import * as debug from '../debug'
import { textInputStyle, buttonStyle, commentStyle } from '../style'
// eslint-disable-next-line camelcase
import { Quad_Object } from 'rdflib/lib/tf-types'
import { solidLogicSingleton } from '../logic'
import { CrossOriginForbiddenError, FetchError, NotFoundError, SameOriginForbiddenError, UnauthorizedError, ACL_LINK } from 'solid-logic'

export { authSession }

// const userCheckSite = 'https://databox.me/'

/**
 * Look for and load the User who has control over it
 */
export function findOriginOwner (doc: NamedNode | string): string | boolean {
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
  webId: NamedNode | string | null,
  context?: AuthenticationContext
): NamedNode | null {
  // @@ TODO Remove the need for having context as output argument
  let webIdUri: string
  if (webId) {
    webIdUri = (typeof webId === 'string') ? webId : webId.uri
    const me = namedNode(webIdUri)
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
export function defaultTestUser (): NamedNode | null {
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
export function currentUser (): NamedNode | null {
  if (authSession.info.webId) {
    return sym(authSession.info.webId)
  }
  return offlineTestID()
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
        context.me = sym(webId as string)
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
export async function logInLoadProfile (context: AuthenticationContext): Promise<AuthenticationContext> {
  // console.log('Solid UI logInLoadProfile')
  if (context.publicProfile) {
    return context
  } // already done
  try {
    const loggedInContext = await logIn(context)
    if (!loggedInContext.me) {
      throw new Error('Could not log in')
    }
    context.publicProfile = await solidLogicSingleton.loadProfile(loggedInContext.me)
  } catch (err) {
    if (context.div && context.dom) {
      context.div.appendChild(
        widgets.errorMessageBlock(context.dom, err.message)
      )
    }
    throw new Error(`Can't log in: ${err}`)
  }
  return context
}

/**
 * Loads preference file
 * Do this after having done log in and load profile
 *
 * @private
 *
 * @param context
 */
export async function logInLoadPreferences (context: AuthenticationContext): Promise<AuthenticationContext> {
  // console.log('Solid UI logInLoadPreferences')
  if (context.preferencesFile) return Promise.resolve(context) // already done

  const statusArea = context.statusArea || context.div || null
  let progressDisplay
  function complain (message) {
    message = `logInLoadPreferences: ${message}`
    if (statusArea) {
      // statusArea.innerHTML = ''
      statusArea.appendChild(
        widgets.errorMessageBlock(context.dom, message)
      )
    }
    debug.log(message)
    // reject(new Error(message))
  }
  try {
    context = await logInLoadProfile(context)

    // console.log('back in Solid UI after logInLoadProfile', context)
    const preferencesFile = await solidLogicSingleton.loadPreferences(context.me as NamedNode)
    if (progressDisplay) {
      progressDisplay.parentNode.removeChild(progressDisplay)
    }
    context.preferencesFile = preferencesFile
  } catch (err) {
    let m2: string
    if (err instanceof UnauthorizedError) {
      m2 = 'Strange - you are not authenticated (properly logged in) to read preference file.'
      alert(m2)
    } else if (err instanceof CrossOriginForbiddenError) {
      m2 = `Unauthorized: Assuming preference file blocked for origin ${window.location.origin}`
      context.preferencesFileError = m2
      return context
    } else if (err instanceof SameOriginForbiddenError) {
      m2 = 'You are not authorized to read your preference file. This may be because you are using an untrusted web app.'
      debug.warn(m2)
    } else if (err instanceof NotFoundError) {
      if (
        confirm(`You do not currently have a preference file. OK for me to create an empty one? ${(err as any).preferencesFile || ''}`)
      ) {
        // @@@ code me  ... weird to have a name of the file but no file
        alert(`Sorry; I am not prepared to do this. Please create an empty file at ${(err as any).preferencesFile || '(?)'}`)
        complain(
          new Error('Sorry; no code yet to create a preference file at ')
        )
      } else {
        throw (
          new Error(`User declined to create a preference file at ${(err as any).preferencesFile || '(?)'}`)
        )
      }
    } else if (err instanceof FetchError) {
      m2 = `Strange: Error ${err.status} trying to read your preference file.${err.message}`
      alert(m2)
    } else {
      throw new Error(`(via loadPrefs) ${err}`)
    }
  }
  return context
}

/**
 * Resolves with the same context, outputting
 * output: index.public, index.private
 *
 * @see https://github.com/solid/solid/blob/master/proposals/data-discovery.md#discoverability
 */
async function loadIndex (
  context: AuthenticationContext,
  isPublic: boolean
): Promise<AuthenticationContext> {
  const indexes = await solidLogicSingleton.loadIndexes(
    context.me as NamedNode,
    (isPublic ? context.publicProfile || null : null),
    (isPublic ? null : context.preferencesFile || null),
    async (err: Error) => widgets.complain(context, err.message)
  )
  context.index = context.index || {}
  context.index.private = indexes.private || context.index.private
  context.index.public = indexes.public || context.index.public
  return context
}

export async function loadTypeIndexes (context: AuthenticationContext) {
  const indexes = await solidLogicSingleton.loadIndexes(
    context.me as NamedNode,
    context.publicProfile || null,
    context.preferencesFile || null,
    async (err: Error) => widgets.complain(context, err.message)
  )
  context.index = context.index || {}
  context.index.private = indexes.private || context.index.private
  context.index.public = indexes.public || context.index.public
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
        await solidLogicSingleton.createEmptyRdfDoc(newIndex, 'Blank initial Type index')
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
      newIndex = sym(`${relevant.dir().uri + visibility}TypeIndex.ttl`)
      debug.log(`Linking to new fresh type index ${newIndex}`)
      if (!confirm(`OK to create a new empty index file at ${newIndex}, overwriting anything that is now there?`)) {
        throw new Error('cancelled by user')
      }
      debug.log(`Linking to new fresh type index ${newIndex}`)
      const addMe = [
        st(context.me, ns.solid(`${visibility}TypeIndex`), newIndex, relevant)
      ]
      try {
        await solidLogicSingleton.updatePromise([], addMe)
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
        await solidLogicSingleton.load(ixs)
      } catch (err) {
        widgets.complain(context, `ensureOneTypeIndex: loading indexes ${err}`)
      }
    }
  } // makeIndexIfNecessary

  try {
    await loadIndex(context, isPublic)
    if (context.index) {
      debug.log(
        `ensureOneTypeIndex: Type index exists already ${isPublic
          ? context.index.public[0]
          : context.index.private[0]
        }`
      )
    }
    return context
  } catch (error) {
    await makeIndexIfNecessary(context, isPublic)
    // widgets.complain(context, 'calling loadIndex:' + error)
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
  theClass: NamedNode,
  isPublic?: boolean
): Promise<AuthenticationContext> {
  // console.log('findAppInstances', { context, theClass, isPublic })
  if (isPublic === undefined) {
    // Then both public and private
    // console.log('finding public app instance')
    await findAppInstances(context, theClass, true)
    // console.log('finding private app instance')
    await findAppInstances(context, theClass, false)
    // console.log('found public & private app instance', context)
    return context
  }

  // Loading preferences is more than loading profile
  try {
    // console.log('calling logInLoad', isPublic)
    await (isPublic
      ? logInLoadProfile(context)
      : logInLoadPreferences(context))
    // console.log('called logInLoad', isPublic)
  } catch (err) {
    widgets.complain(context, `loadIndex: login and load problem ${err}`)
  }
  // console.log('awaited LogInLoad!', context)
  const visibility = isPublic ? 'public' : 'private'
  try {
    await loadIndex(context, isPublic)
  } catch (err) {
  }
  const index = context.index as { [key: string]: Array<NamedNode> }
  // eslint-disable-next-line no-console
  console.log({ index, visibility })
  const thisIndex = index[visibility]
  // eslint-disable-next-line no-console
  console.log('Failing test?', thisIndex.map(ix => solidLogicSingleton.store.each(undefined, ns.solid('forClass'), theClass, ix)))
  const registrations = thisIndex
    .map(ix => solidLogicSingleton.store.each(undefined, ns.solid('forClass'), theClass, ix))
    .flat()
  const instances = registrations
    .map(reg => solidLogicSingleton.store.each(reg as NamedNode, ns.solid('instance')))
    .flat()
  const containers = registrations
    .map(reg => solidLogicSingleton.store.each(reg as NamedNode, ns.solid('instanceContainer')))
    .flat()

  function unique (arr: NamedNode[]): NamedNode[] {
    return Array.from(new Set(arr))
  }
  context.instances = context.instances || []
  context.instances = unique(context.instances.concat(instances as NamedNode[]))

  context.containers = context.containers || []
  context.containers = unique(context.containers.concat(containers as NamedNode[]))
  if (!containers.length) {
    return context
  }
  // If the index gives containers, then look up all things within them
  try {
    await solidLogicSingleton.load(containers as NamedNode[])
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
      solidLogicSingleton.getContainerElements(cont as NamedNode) as NamedNode[]
    )
  }
  return context
}

/**
 * Register a new app in a type index
 */
export async function registerInTypeIndex (
  context: AuthenticationContext,
  instance: NamedNode,
  theClass: NamedNode,
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
    st(registration, ns.rdf('type'), ns.solid('TypeRegistration'), index),
    st(registration, ns.solid('forClass'), theClass, index),
    st(registration, ns.solid('instance'), instance, index)
  ]
  try {
    await solidLogicSingleton.updatePromise([], ins)
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
      const form = new BlankNode() // @@ say for now

      const registrationStatements = function (index) {
        const registrations = solidLogicSingleton.getRegistrations(instance, theClass)
        const reg = registrations.length
          ? registrations[0]
          : widgets.newThing(index)
        return [
          st(reg, ns.solid('instance'), instance, index),
          st(reg, ns.solid('forClass'), theClass, index)
        ]
      }

      let index, statements

      if (context.index && context.index.public && context.index.public.length > 0) {
        index = context.index.public[0]
        statements = registrationStatements(index)
        tbody.children[0].appendChild(
          widgets.buildCheckBoxForm(
            context.dom,
            solidLogicSingleton.store,
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
          widgets.buildCheckBoxForm(
            context.dom,
            solidLogicSingleton.store,
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
  type?: NamedNode
}): Promise<AuthenticationContext> {
  const dom = context.dom as HTMLDocument
  const div = context.div as HTMLElement

  const box = dom.createElement('div')
  div.appendChild(box)

  return ensureTypeIndexes(context).then(_indexes => {
    box.innerHTML = '<table><tbody></tbody></table>' // tbody will be inserted anyway
    box.setAttribute('style', 'font-size: 120%; text-align: right; padding: 1em; border: solid #eee 0.5em;')
    const table = box.firstChild as HTMLElement

    let ix: Array<NamedNode> = []
    let sts: Statement[] = []
    const vs = ['private', 'public']
    vs.forEach(function (visibility) {
      if (context.index && options[visibility]) {
        ix = ix.concat(context.index[visibility][0])
        sts = sts.concat(
          solidLogicSingleton.store.statementsMatching(
            undefined,
            ns.solid('instance'),
            undefined,
            context.index[visibility][0]
          )
        )
      }
    })

    for (let i = 0; i < sts.length; i++) {
      const statement: Statement = sts[i]
      if (options.type) { // now check  terms:forClass
        if (!solidLogicSingleton.store.holds(statement.subject, ns.solid('forClass'), options.type, statement.why)) {
          continue // skip irrelevant ones
        }
      }
      // const cla = statement.subject
      const inst = statement.object
      table.appendChild(widgets.personTR(dom, ns.solid('instance'), inst, {
        deleteFunction: function (_x) {
          if (!solidLogicSingleton.store.updater) {
            throw new Error('Cannot delete this, store has no updater')
          }
          solidLogicSingleton.store.updater.update([statement], [], function (uri, ok, errorBody) {
            if (ok) {
              debug.log(`Removed from index: ${statement.subject}`)
            } else {
              debug.log(`Error: Cannot delete ${statement}: ${errorBody}`)
            }
          })
        }
      }))
    } // registrationList

    /*
       //const containers = solidLogicSingleton.store.each(theClass, ns.solid('instanceContainer'));
       if (containers.length) {
       fetcher.load(containers).then(function(xhrs){
       for (const i=0; i<containers.length; i++) {
       const cont = containers[i];
       instances = instances.concat(solidLogicSingleton.store.each(cont, ns.ldp('contains')));
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
  docURI: string,
  me: NamedNode,
  options: {
    defaultForNew?: boolean,
    public?: []
  }
): Promise<NamedNode> {
  const aclDoc = solidLogicSingleton.store.any(
    solidLogicSingleton.store.sym(docURI),
    ACL_LINK
  )

  return Promise.resolve()
    .then(() => {
      if (aclDoc) {
        return aclDoc as NamedNode
      }

      return fetchACLRel(docURI).catch(err => {
        throw new Error(`Error fetching rel=ACL header for ${docURI}: ${err}`)
      })
    })
    .then(aclDoc => {
      const aclText = genACLText(docURI, me, aclDoc.uri, options)
      if (!solidLogicSingleton.store.fetcher) {
        throw new Error('Cannot PUT this, store has no fetcher')
      }
      return solidLogicSingleton.store.fetcher
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
function fetchACLRel (docURI: string): Promise<NamedNode> {
  const fetcher = solidLogicSingleton.store.fetcher
  if (!fetcher) {
    throw new Error('Cannot fetch ACL rel, store has no fetcher')
  }

  return fetcher.load(docURI).then(result => {
    if (!result.ok) {
      throw new Error('fetchACLRel: While loading:' + (result as any).error)
    }

    const aclDoc = solidLogicSingleton.store.any(
      solidLogicSingleton.store.sym(docURI),
      ACL_LINK
    )

    if (!aclDoc) {
      throw new Error('fetchACLRel: No Link rel=ACL header for ' + docURI)
    }

    return aclDoc as NamedNode
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
  docURI: string,
  me: NamedNode,
  aclURI: string,
  options: {
    defaultForNew?: boolean,
    public?: []
  } = {}
): string | undefined {
  const optPublic = options.public || []
  const g = graph()
  const auth = Namespace('http://www.w3.org/ns/auth/acl#')
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
  return serialize(acl, g, aclURI)
}

/**
 * Returns `sym($SolidTestEnvironment.username)` if
 * `$SolidTestEnvironment.username` is defined as a global
 * @returns {NamedNode|null}
 */
export function offlineTestID (): NamedNode | null {
  const { $SolidTestEnvironment }: any = window
  if (
    typeof $SolidTestEnvironment !== 'undefined' &&
    $SolidTestEnvironment.username
  ) {
    // Test setup
    debug.log('Assuming the user is ' + $SolidTestEnvironment.username)
    return sym($SolidTestEnvironment.username)
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
    /* me = solidLogicSingleton.store.any(subject, ns.acl('owner')); // when testing on plane with no WebID
     */
    debug.log('Assuming user is ' + id)
    return sym(id)
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
  ;(box as any).style = 'display:flex;' // @@ fix all typecasts like this

  // Sign in button with PopUP
  const signInPopUpButton = dom.createElement('input') // multi
  box.appendChild(signInPopUpButton)
  signInPopUpButton.setAttribute('type', 'button')
  signInPopUpButton.setAttribute('value', 'Log in')
  signInPopUpButton.setAttribute('style', `${signInButtonStyle}background-color: #eef;`)

  authSession.onLogin(() => {
    const sessionInfo = authSession.info
    if (sessionInfo && sessionInfo.isLoggedIn) {
      const webIdURI = sessionInfo.webId
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
    }
  })

  signInPopUpButton.addEventListener('click', () => {
    const offline = offlineTestID()
    if (offline) return setUserCallback(offline.uri)

    const thisUrl = new URL(window.location.href).origin
    // HACK solid-client-authn-js no longer comes with its own UI for selecting
    // an IDP. This was the easiest way to get the user to select.
    // TODO: make a nice UI to select an IDP
    const issuer = prompt('Enter an issuer', thisUrl)
    authSession.login({
      // @ts-ignore this library requires a specific kind of URL that isn't global
      redirectUrl: window.location.href,
      // @ts-ignore
      oidcIssuer: issuer
    })
  }, false)

  // Sign up button
  const signupButton = dom.createElement('input')
  box.appendChild(signupButton)
  signupButton.setAttribute('type', 'button')
  signupButton.setAttribute('value', 'Sign Up for Solid')
  signupButton.setAttribute('style', `${signInButtonStyle}background-color: #efe;`)

  signupButton.addEventListener('click', function (_event) {
    const signupMgr = new Signup()
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
function webIdFromSession (session?: { webId?: string }): string | null {
  const webId = session?.webId ? session.webId : null
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

// HACK this global variable exists to prevent authSession.handleIncomingRedirect
// From being called twice. It would not be needed if it automatically redirected
// by iteself. See https://github.com/inrupt/solid-client-authn-js/issues/514
var checkingRedirect = false

/**
 * Retrieves currently logged in webId from either
 * defaultTestUser or SolidAuthn
 * @param [setUserCallback] Optional callback
 *
 * @returns Resolves with webId uri, if no callback provided
 */
export async function checkUser<T> (
  setUserCallback?: (me: NamedNode | null) => T
): Promise<NamedNode | T | null> {
  /**
   * Handle a successful authentication redirect
   */
  // HACK normally you wouldn't need to do a check to see if 'code' is in the
  // query, but it was removed from solid-client-authn-js
  // See https://github.com/inrupt/solid-client-authn-js/issues/421
  // Remove this after
  const authCode = new URL(window.location.href).searchParams.get('code')
  if (authCode && !checkingRedirect) {
    checkingRedirect = true
    // Being redirected after requesting a token
    await authSession
      .handleIncomingRedirect(window.location.href)
    // HACK solid-client-authn-js should automatically remove code and state
    // from the URL, but it doesn't, so we do it manually here
    // see https://github.com/inrupt/solid-client-authn-js/issues/514
    const newPageUrl = new URL(window.location.href)
    newPageUrl.searchParams.delete('code')
    newPageUrl.searchParams.delete('state')
    window.history.replaceState({}, '', newPageUrl.toString())
  }

  // Check to see if already logged in / have the WebID
  let me = defaultTestUser()
  if (me) {
    return Promise.resolve(setUserCallback ? setUserCallback(me) : me)
  }

  // doc = solidLogicSingleton.store.any(doc, ns.link('userMirror')) || doc
  const webId = webIdFromSession(authSession.info)

  me = saveUser(webId)

  if (me) {
    debug.log(`(Logged in as ${me} by authentication)`)
  }

  return Promise.resolve(setUserCallback ? setUserCallback(me) : me)
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
    me = sym(uri)
    box.refresh()
    if (listener) listener(me.uri)
  }

  function logoutButtonHandler (_event) {
    // UI.preferences.set('me', '')
    authSession.logout().then(
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
        solidLogicSingleton.store.any(me, ns.foaf('nick')) ||
        solidLogicSingleton.store.any(me, ns.foaf('name'))
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
    const sessionInfo = authSession.info
    if (sessionInfo && sessionInfo.webId) {
      me = sym(sessionInfo.webId)
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
  }

  function trackSession () {
    const sessionInfo = authSession.info
    if (sessionInfo && sessionInfo.webId) {
      me = sym(sessionInfo.webId)
    } else {
      me = null
    }
    box.refresh()
  }

  trackSession()
  authSession.onLogin(trackSession)
  authSession.onLogout(trackSession)

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
    const newBaseNode: NamedNode = solidLogicSingleton.store.any(ws, ns.space('uriPrefix')) as NamedNode
    let newBaseString: string
    if (!newBaseNode) {
      newBaseString = ws.uri.split('#')[0]
    } else {
      newBaseString = newBaseNode.value
    }
    if (newBaseString.slice(-1) !== '/') {
      debug.log(`${appPathSegment}: No / at end of uriPrefix ${newBaseString}`) // @@ paramater?
      newBaseString = `${newBaseString}/`
    }
    const now = new Date()
    newBaseString += `${appPathSegment}/id${now.getTime()}/` // unique id
    return newBaseString
  }

  function displayOptions (context) {
    // console.log('displayOptions!', context)
    async function makeNewWorkspace (_event) {
      const row = table.appendChild(dom.createElement('tr'))
      const cell = row.appendChild(dom.createElement('td'))
      cell.setAttribute('colspan', '3')
      cell.style.padding = '0.5em'
      const newBase = encodeURI(await widgets.askName(dom, solidLogicSingleton.store, cell, ns.solid('URL'), ns.space('Workspace'), 'Workspace'))
      const newWs = widgets.newThing(context.preferencesFile)
      const newData = [st(context.me, ns.space('workspace'), newWs, context.preferencesFile),
        // eslint-disable-next-line camelcase
        st(newWs, ns.space('uriPrefix'), newBase as unknown as Quad_Object, context.preferencesFile)]
      if (!solidLogicSingleton.store.updater) {
        throw new Error('store has no updater')
      }
      await solidLogicSingleton.store.updater.update([], newData)
      // @@ now refresh list of workspaces
    }

    // const status = ''
    const id = context.me
    const preferencesFile = context.preferencesFile
    let newBase: any = null

    // A workspace specifically defined in the private preference file:
    let w: any = solidLogicSingleton.store.each(id, ns.space('workspace'), undefined, preferencesFile) // Only trust preference file here

    // A workspace in a storage in the public profile:
    const storages = solidLogicSingleton.store.each(id, ns.space('storage')) // @@ No provenance requirement at the moment
    if (w.length === 0 && storages) {
      say(`You don't seem to have any workspaces. You have ${storages.length} storage spaces.`)
      storages.map(function (s: any) {
        w = w.concat(solidLogicSingleton.store.each(s, ns.ldp('contains')))
        return w
      }).filter(file => ['public', 'private'].includes(file.id().toLowerCase()))
    }

    if (w.length === 1) {
      say(`Workspace used: ${w[0].uri}`) // @@ allow user to see URI
      newBase = figureOutBase(w[0])
      // callbackWS(w[0], newBase)
    // } else if (w.length === 0) {
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
    ;(p as any).style = commentStyle
    p.textContent = `Where would you like to store the data for the ${noun}?
    Give the URL of the folder where you would like the data stored.
    It can be anywhere in solid world - this URI is just an idea.`
    // @@ TODO Remove the need to cast baseField to any
    const baseField: any = box.appendChild(dom.createElement('input'))
    baseField.setAttribute('type', 'text')
    ;(baseField as any).style = textInputStyle
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
    ;(button as any).style = buttonStyle
    button.textContent = `Start new ${noun} at this URI`
    button.addEventListener('click', function (_event) {
      let newBase = baseField.value.replace(' ', '%20') // do not re-encode in general, as % encodings may exist
      if (newBase.slice(-1) !== '/') {
        newBase += '/'
      }
      callbackWS(null, newBase)
    })

    // Now go set up the table of spaces

    // const row = 0
    w = w.filter(function (x) {
      return !solidLogicSingleton.store.holds(
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
        col1.setAttribute('rowspan', `${w.length}`)
        col1.textContent = 'Choose a workspace for this:'
        col1.setAttribute('style', 'vertical-align:middle;')
        tr.appendChild(col1)
      }
      col2 = dom.createElement('td')
      style = solidLogicSingleton.store.anyValue(ws, ns.ui('style'))
      if (!style) {
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
      let label = solidLogicSingleton.store.any(ws, ns.rdfs('label'))
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

      comment = solidLogicSingleton.store.any(ws, ns.rdfs('comment'))
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
    col2.addEventListener('click', makeNewWorkspace)
    trLast.appendChild(col2)
    table.appendChild(trLast)
  } // displayOptions

  // console.log('kicking off async operation')
  logInLoadPreferences(context) // kick off async operation
    .then(displayOptions)
    .catch(err => {
      // console.log("err from async op")
      box.appendChild(widgets.errorMessageBlock(context.dom, err))
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
    // log.debug("newAppInstance: Selected workspace = " + (ws? ws.uri : 'none'))
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
export async function getUserRoles (): Promise<Array<NamedNode>> {
  try {
    const {
      me,
      preferencesFile,
      preferencesFileError
    } = await logInLoadPreferences({})
    if (!preferencesFile || preferencesFileError) {
      throw new Error(preferencesFileError)
    }
    return solidLogicSingleton.store.each(me, ns.rdf('type'), null, preferencesFile.doc()) as NamedNode[]
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

function isMatchingAudience (pane: PaneDefinition, userRoles: Array<NamedNode>): boolean {
  const audience = pane.audience || []
  return audience.reduce(
    (isMatch, audienceRole) => isMatch && !!userRoles.find(role => role.equals(audienceRole)),
    true as boolean
  )
}
