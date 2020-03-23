/**
 * Tools for doing things with a message
 * Let us be creative here.  Allow all sorts of things to
 * be done to a message - linking to new or old objects in an open way
 *
 * Ideas: Bookmark, Like, star, pin at top of chat, reply as new thread,
 * If you made it originally: edit, delete, attach
 * @packageDocumentation
 */

/* global $rdf */

const UI = {
  authn: require('../authn/authn'),
  icons: require('../iconBase'),
  ns: require('../ns'),
  media: require('../media-capture'),
  pad: require('../pad'),
  rdf: require('rdflib'),
  store: require('../store'),
  style: require('../style'),
  utils: require('../utils'),
  widgets: require('../widgets')
}

const bookmarks = require('./bookmarks')

const dom = window.document

const kb = UI.store
const ns = UI.ns
// const label = UI.utils.label

// THE UNUSED ICONS are here as reminders for possible future functionality
// const BOOKMARK_ICON = 'noun_45961.svg'
// const HEART_ICON = 'noun_130259.svg' -> Add this to my (private) favorites
// const MENU_ICON = 'noun_897914.svg'
// const PAPERCLIP_ICON = 'noun_25830.svg' -> add attachments to this message
// const PIN_ICON = 'noun_562340.svg'  -> pin this message permanently in the chat UI
// const PENCIL_ICON = 'noun_253504.svg'
// const SPANNER_ICON = 'noun_344563.svg' -> settings
const THUMBS_UP_ICON = 'noun_1384132.svg'
const THUMBS_DOWN_ICON = 'noun_1384135.svg'

// module.export = { messageTools, sentimentStripLinked, sentimentStrip }

// @@@@ use the one in rdflib.js when it is avaiable and delete this
function updatePromise (del, ins) {
  return new Promise(function (resolve, reject) {
    kb.updater.update(del, ins, function (uri, ok, errorBody) {
      if (!ok) {
        reject(new Error(errorBody))
      } else {
        resolve()
      }
    }) // callback
  }) // promise
}

/**
 * Emoji in Unicode
 */

var emoji = {}
emoji[ns.schema('AgreeAction')] = '👍'
emoji[ns.schema('DisagreeAction')] = '👎'
emoji[ns.schema('EndorseAction')] = '⭐️'
emoji[ns.schema('LikeAction')] = '❤️'

/**
 * Create strip of sentiments expressed
 */
export function sentimentStrip (target, doc) {
  const actions = kb.each(null, ns.schema('target'), target, doc)
  const sentiments = actions.map(a => kb.any(a, ns.rdf('type'), null, doc))
  sentiments.sort()
  const strings = sentiments.map(x => emoji[x] || '')
  return dom.createTextNode(strings.join(' '))
}
/**
 * Create strip of sentiments expressed, with hyperlinks
 *
 * @param target {NamedNode} - The thing about which they are expressed
 * @param doc {NamedNode} - The document in which they are expressed
 */
export function sentimentStripLinked (target, doc) {
  var strip = dom.createElement('span')
  function refresh () {
    strip.innerHTML = ''
    const actions = kb.each(null, ns.schema('target'), target, doc)
    const sentiments = actions.map(a => [
      kb.any(a, ns.rdf('type'), null, doc),
      kb.any(a, ns.schema('agent'), null, doc)
    ])
    sentiments.sort()
    sentiments.forEach(ss => {
      const [theClass, agent] = ss
      var res
      if (agent) {
        res = dom.createElement('a')
        res.setAttribute('href', agent.uri)
      } else {
        res = dom.createTextNode('')
      }
      res.textContent = emoji[theClass] || '*'
      strip.appendChild(res)
    })
  }
  refresh()
  strip.refresh = refresh
  return strip
}

/**
 * Creates a message toolbar component
 */
export function messageToolbar (message, messageRow, userContext) {
  const div = dom.createElement('div')
  function closeToolbar () {
    div.parentElement.parentElement.removeChild(div.parentElement) // remive the TR
  }

  async function deleteThingThen (x) {
    await updatePromise(kb.connectedStatements(x), [])
  }

  // Things only the original author can do
  let me = UI.authn.currentUser() // If already logged on
  if (me && kb.holds(message, ns.foaf('maker'), me)) {
    // button to delete the message
    const deleteButton = UI.widgets.deleteButtonWithCheck(
      dom,
      div,
      'message',
      async function () {
        await kb.updater.update(kb.connectedStatements[message], [])
        closeToolbar()
      }
    )
    div.appendChild(deleteButton)
  } // if mine

  // Things anyone can do if they have a bookmark list async
  /*
 var bookmarkButton = await bookmarks.renderBookmarksButton(userContext)
 if (bookmarkButton) {
   div.appendChild(bookmarkButton)
 }
 */
  // Things anyone can do if they have a bookmark list

  bookmarks.renderBookmarksButton(userContext).then(bookmarkButton => {
    if (bookmarkButton) div.appendChild(bookmarkButton)
  })

  /**   Button to allow user to express a sentiment (like, endorse, etc) about a target
   *
   * @param context {Object} - Provide dom and me
   * @param target {NamedNode} - The thing the user expresses an opnion about
   * @param icon {uristring} - The icon to be used for the button
   * @param actionClass {NamedNode} - The RDF class  - typically a subclass of schema:Action
   * @param doc - {NamedNode} - the Solid document iunto which the data should be written
   * @param mutuallyExclusive {Array<NamedNode>} - Any RDF classes of sentimentswhich are mutiually exclusive
   */
  function sentimentButton (
    context,
    target,
    icon,
    actionClass,
    doc,
    mutuallyExclusive
  ) {
    function setColor () {
      button.style.backgroundColor = action ? 'yellow' : 'white'
    }
    var button = UI.widgets.button(
      dom,
      icon,
      UI.utils.label(actionClass),
      async function (_event) {
        if (action) {
          await deleteThingThen(action)
          action = null
          setColor()
        } else {
          // no action
          action = UI.widgets.newThing(doc)
          var insertMe = [
            $rdf.st(action, ns.schema('agent'), context.me, doc),
            $rdf.st(action, ns.rdf('type'), actionClass, doc),
            $rdf.st(action, ns.schema('target'), target, doc)
          ]
          await updatePromise([], insertMe)
          setColor()

          if (mutuallyExclusive) {
            // Delete incompative sentiments
            var dirty = false
            for (let i = 0; i < mutuallyExclusive.length; i++) {
              const a = existingAction(mutuallyExclusive[i])
              if (a) {
                await deleteThingThen(a) // but how refresh? refreshTree the parent?
                dirty = true
              }
            }
            if (dirty) {
              // UI.widgets.refreshTree(button.parentNode) // requires them all to be immediate siblings
              UI.widgets.refreshTree(messageRow) // requires them all to be immediate siblings
            }
          }
        }
      }
    )
    function existingAction (actionClass) {
      var actions = kb
        .each(null, ns.schema('agent'), context.me, doc)
        .filter(x => kb.holds(x, ns.rdf('type'), actionClass, doc))
        .filter(x => kb.holds(x, ns.schema('target'), target, doc))
      return actions.length ? actions[0] : null
    }
    function refresh () {
      action = existingAction(actionClass)
      setColor()
    }
    var action
    button.refresh = refresh // If the file changes, refresh live
    refresh()
    return button
  }

  // THUMBS_UP_ICON
  // https://schema.org/AgreeAction
  me = UI.authn.currentUser() // If already logged on
  if (me) {
    // Things you mnust be logged in for
    var context1 = { me, dom, div }
    div.appendChild(
      sentimentButton(
        context1,
        message, // @@ TODO use UI.widgets.sentimentButton
        UI.icons.iconBase + THUMBS_UP_ICON,
        ns.schema('AgreeAction'),
        message.doc(),
        [ns.schema('DisagreeAction')]
      )
    )
    // Thumbs down
    div.appendChild(
      sentimentButton(
        context1,
        message,
        UI.icons.iconBase + THUMBS_DOWN_ICON,
        ns.schema('DisagreeAction'),
        message.doc(),
        [ns.schema('AgreeAction')]
      )
    )
  }
  // X button to remove the tool UI itself
  const cancelButton = div.appendChild(UI.widgets.cancelButton(dom))
  cancelButton.style.float = 'right'
  cancelButton.firstChild.style.opacity = '0.3'
  cancelButton.addEventListener('click', closeToolbar)
  return div
}
