/* -*- coding: utf-8-dos -*-
   Outline Mode Manager
*/
var panes = require('pane-registry')
const $rdf = require('rdflib')

var YAHOO = require('./dragDrop.js')
var outlineIcons = require('./outlineIcons.js')
var UserInput = require('./userInput.js')
var queryByExample = require('./queryByExample.js')

/* global alert XPathResult sourceWidget */
// XPathResult?

// const iconHeight = '24px'

export class OutlineManager {
context

    constructor(context) {
    this.context = context
    }
  const dom = context.dom

  this.document = context.dom
  this.outlineIcons = outlineIcons
  this.labeller = this.labeller || {}
  this.labeller.LanguagePreference = '' // for now
  var outline = this // Kenny: do we need this?
  var thisOutline = this
  var selection = []
  this.selection = selection
  this.ancestor = UI.utils.ancestor // make available as outline.ancestor in callbacks
  this.sparql = UI.rdf.UpdateManager
  this.kb = UI.store
  var kb = UI.store
  var sf = UI.store.fetcher
  dom.outline = this
  this.qs = new queryByExample.QuerySource() // Track queries in queryByExample

  // var selection = []  // Array of statements which have been selected
  // this.focusTd // the <td> that is being observed
  this.UserInput = new UserInput(this)
  this.clipboardAddress = 'tabulator:clipboard' // Weird
  this.UserInput.clipboardInit(this.clipboardAddress)
  var outlineElement = this.outlineElement

  this.init = function () {
    var table = getOutlineContainer()
    table.outline = this
  }

  /** benchmark a function **/
  benchmark.lastkbsize = 0

  function benchmark (f) {
    var args = []
    for (var i = arguments.length - 1; i > 0; i--) args[i - 1] = arguments[i]
    // UI.log.debug('BENCHMARK: args=' + args.join());
    var begin = new Date().getTime()
    var returnValue = f.apply(f, args)
    var end = new Date().getTime()
    UI.log.info(
      'BENCHMARK: kb delta: ' +
            (kb.statements.length - benchmark.lastkbsize) +
            ', time elapsed for ' +
            f +
            ' was ' +
            (end - begin) +
            'ms'
    )
    benchmark.lastkbsize = kb.statements.length
    return returnValue
  } // benchmark

  // / ////////////////////// Representing data

  //  Represent an object in summary form as a table cell

  function appendRemoveIcon (node, subject, removeNode) {
    var image = UI.utils.AJARImage(
      outlineIcons.src.icon_remove_node,
      'remove',
      undefined,
      dom
    )
    image.addEventListener('click', removeNodeIconMouseDownListener)
    // image.setAttribute('align', 'right')  Causes icon to be moved down
    image.node = removeNode
    image.setAttribute('about', subject.toNT())
    image.style.marginLeft = '5px'
    image.style.marginRight = '10px'
    // image.style.border='solid #777 1px';
    node.appendChild(image)
    return image
  }

  this.appendAccessIcons = function (kb, node, obj) {
    if (obj.termType !== 'NamedNode') return
    var uris = kb.uris(obj)
    uris.sort()
    var last = null
    for (var i = 0; i < uris.length; i++) {
      if (uris[i] === last) continue
      last = uris[i]
      thisOutline.appendAccessIcon(node, last)
    }
  }

  this.appendAccessIcon = function (node, uri) {
    if (!uri) return ''
    var docuri = UI.rdf.uri.docpart(uri)
    if (docuri.slice(0, 5) !== 'http:') return ''
    var state = sf.getState(docuri)
    var icon, alt, listener
    switch (state) {
      case 'unrequested':
        icon = outlineIcons.src.icon_unrequested
        alt = 'fetch'
        listener = unrequestedIconMouseDownListener
        break
      case 'requested':
        icon = outlineIcons.src.icon_requested
        alt = 'fetching'
        listener = failedIconMouseDownListener // new: can retry yello blob
        break
      case 'fetched':
        icon = outlineIcons.src.icon_fetched
        listener = fetchedIconMouseDownListener
        alt = 'loaded'
        break
      case 'failed':
        icon = outlineIcons.src.icon_failed
        alt = 'failed'
        listener = failedIconMouseDownListener
        break
      case 'unpermitted':
        icon = outlineIcons.src.icon_failed
        listener = failedIconMouseDownListener
        alt = 'no perm'
        break
      case 'unfetchable':
        icon = outlineIcons.src.icon_failed
        listener = failedIconMouseDownListener
        alt = 'cannot fetch'
        break
      default:
        UI.log.error('?? state = ' + state)
        break
    } // switch
    var img = UI.utils.AJARImage(
      icon,
      alt,
      outlineIcons.tooltips[icon].replace(/[Tt]his resource/, docuri),
      dom
    )
    img.setAttribute('uri', uri)
    img.addEventListener('click', listener) // @@ seemed to be missing 2017-08
    addButtonCallbacks(img, docuri)
    node.appendChild(img)
    return img
  } // appendAccessIcon

  // Six different Creative Commons Licenses:
  // 1. http://creativecommons.org/licenses/by-nc-nd/3.0/
  // 2. http://creativecommons.org/licenses/by-nc-sa/3.0/
  // 3. http://creativecommons.org/licenses/by-nc/3.0/
  // 4. http://creativecommons.org/licenses/by-nd/3.0/
  // 5. http://creativecommons.org/licenses/by-sa/3.0/
  // 6. http://creativecommons.org/licenses/by/3.0/

  /** make the td for an object (grammatical object)
     *  @param obj - an RDF term
     *  @param view - a VIEW function (rather than a bool asImage)
     **/

  this.outlineObjectTD = function outlineObjectTD (
    obj,
    view,
    deleteNode,
    statement
  ) {
    var td = dom.createElement('td')
    td.setAttribute(
      'style',
      'margin: 0.2em; border: none; padding: 0; vertical-align: top;'
    )
    td.setAttribute('notSelectable', 'false')
    var theClass = 'obj'

    // check the IPR on the data.  Ok if there is any checked license which is one the document has.
    if (statement && statement.why) {
      if (UI.licenceOptions && UI.licenceOptions.checkLicence()) {
        theClass += ' licOkay' // flag as light green etc .licOkay {background-color: #dfd}
      }
    }

    // set about and put 'expand' icon
    if (
      obj.termType === 'NamedNode' ||
            obj.termType === 'BlankNode' ||
            (obj.termType === 'Literal' &&
                obj.value.slice &&
                (obj.value.slice(0, 6) === 'ftp://' ||
                    obj.value.slice(0, 8) === 'https://' ||
                    obj.value.slice(0, 7) === 'http://'))
    ) {
      td.setAttribute('about', obj.toNT())
      td.appendChild(
        UI.utils.AJARImage(
          UI.icons.originalIconBase + 'tbl-expand-trans.png',
          'expand',
          undefined,
          dom
        )
      ).addEventListener('click', expandMouseDownListener)
    }
    td.setAttribute('class', theClass) // this is how you find an object
    // @@ TAKE CSS OUT OF STYLE SHEET
    if (kb.whether(obj, UI.ns.rdf('type'), UI.ns.link('Request'))) {
      td.className = 'undetermined'
    } // @@? why-timbl

    if (!view) {
      // view should be a function pointer
      view = viewAsBoringDefault
    }
    td.appendChild(view(obj))
    if (deleteNode) {
      appendRemoveIcon(td, obj, deleteNode)
    }

    try {
      // new YAHOO.util.DDExternalProxy(td)
    } catch (e) {
      UI.log.error('YAHOO Drag and drop not supported:\n' + e)
    }

    // set DOM methods
    td.tabulatorSelect = function () {
      setSelected(this, true)
    }
    td.tabulatorDeselect = function () {
      setSelected(this, false)
    }
    // td.appendChild( iconBox.construct(document.createTextNode('bla')) );

    // Create an inquiry icon if there is proof about this triple
    if (statement) {
      var oneStatementFormula = new UI.rdf.IndexedFormula()
      oneStatementFormula.statements.push(statement) // st.asFormula()
      // The following works because Formula.hashString works fine for
      // one statement formula
      var reasons = kb.each(
        oneStatementFormula,
        kb.sym('http://dig.csail.mit.edu/TAMI/2007/amord/tms#justification')
      )
      if (reasons.length) {
        var inquirySpan = dom.createElement('span')
        if (reasons.length > 1) {
          inquirySpan.innerHTML = ' &times; ' + reasons.length
        }
        inquirySpan.setAttribute('class', 'inquiry')
        inquirySpan.insertBefore(
          UI.utils.AJARImage(
            outlineIcons.src.icon_display_reasons,
            'explain',
            undefined,
            dom
          ),
          inquirySpan.firstChild
        )
        td.appendChild(inquirySpan)
      }
    }
    td.addEventListener('click', selectableTDClickListener)
    return td
  } // outlineObjectTD

  this.outlinePredicateTD = function outlinePredicateTD (
    predicate,
    newTr,
    inverse,
    internal
  ) {
    var predicateTD = dom.createElement('TD')
    predicateTD.setAttribute('about', predicate.toNT())
    predicateTD.setAttribute('class', internal ? 'pred internal' : 'pred')

    let lab
    switch (predicate.termType) {
      case 'BlankNode': // TBD
        predicateTD.className = 'undetermined'
        break
      case 'NamedNode':
        lab = UI.utils.predicateLabelForXML(predicate, inverse)
        break
      case 'Collection': // some choices of predicate
        lab = UI.utils.predicateLabelForXML(predicate.elements[0], inverse)
    }
    lab = lab.slice(0, 1).toUpperCase() + lab.slice(1)
    // if (kb.statementsMatching(predicate,rdf('type'), UI.ns.link('Request')).length) predicateTD.className='undetermined';

    var labelTD = dom.createElement('TD')
    labelTD.setAttribute(
      'style',
      'margin: 0.2em; border: none; padding: 0; vertical-align: top;'
    )
    labelTD.setAttribute('notSelectable', 'true')
    labelTD.appendChild(dom.createTextNode(lab))
    predicateTD.appendChild(labelTD)
    labelTD.style.width = '100%'
    predicateTD.appendChild(termWidget.construct(dom)) // termWidget is global???
    for (var w in outlineIcons.termWidgets) {
      if (!newTr || !newTr.AJAR_statement) break // case for TBD as predicate
      // alert(Icon.termWidgets[w]+'   '+Icon.termWidgets[w].filter)
      if (
        outlineIcons.termWidgets[w].filter &&
                outlineIcons.termWidgets[w].filter(
                  newTr.AJAR_statement,
                  'pred',
                  inverse
                )
      ) {
        termWidget.addIcon(predicateTD, outlineIcons.termWidgets[w])
      }
    }

    try {
      // new YAHOO.util.DDExternalProxy(predicateTD)
    } catch (e) {
      UI.log.error('drag and drop not supported')
    }
    // set DOM methods
    predicateTD.tabulatorSelect = function () {
      setSelected(this, true)
    }
    predicateTD.tabulatorDeselect = function () {
      setSelected(this, false)
    }
    predicateTD.addEventListener('click', selectableTDClickListener)
    return predicateTD
  } // outlinePredicateTD

  /**
     * Render Tabbed set of home app panes
     *
     * @param {Object} [options] A set of options you can provide
     * @param {string} [options.selectedTab] To open a specific dashboard pane
     * @param {Function} [options.onClose] If given, will present an X for the dashboard, and call this method when clicked
     * @returns Promise<{Element}> - the div that holds the dashboard
     */
  async function globalAppTabs (options = {}) {
    console.log('globalAppTabs @@')
    const div = dom.createElement('div')
    const me = UI.authn.currentUser()
    if (!me) {
      alert('Must be logged in for this')
      throw new Error('Not logged in')
    }
    const items = await getDashboardItems()

    function renderTab (div, item) {
      div.dataset.globalPaneName = item.tabName || item.paneName
      div.textContent = item.label
    }

    function renderMain (containerDiv, item) {
      // Items are pane names
      const pane = panes.byName(item.paneName) // 20190701
      containerDiv.innerHTML = ''
      const table = containerDiv.appendChild(dom.createElement('table'))
      const me = UI.authn.currentUser()
      thisOutline.GotoSubject(
        item.subject || me,
        true,
        pane,
        false,
        undefined,
        table
      )
    }

    div.appendChild(
      UI.tabs.tabWidget({
        dom,
        subject: me,
        items,
        renderMain,
        renderTab,
        ordered: true,
        orientation: 0,
        backgroundColor: '#eeeeee', // black?
        selectedTab: options.selectedTab,
        onClose: options.onClose
      })
    )
    return div
  }
  this.getDashboard = globalAppTabs

  async function getDashboardItems () {
    const me = UI.authn.currentUser()
    const div = dom.createElement('div')
    const [books, pods] = await Promise.all([getAddressBooks(), getPods()])
    return [
      {
        paneName: 'home',
        label: 'Your stuff',
        icon: UI.icons.iconBase + 'noun_547570.svg'
      },
      {
        paneName: 'basicPreferences',
        label: 'Preferences',
        icon: UI.icons.iconBase + 'noun_Sliders_341315_00000.svg'
      },
      {
        paneName: 'editProfile',
        label: 'Edit your profile',
        icon: UI.icons.iconBase + 'noun_492246.svg'
      }
    ]
      .concat(books)
      .concat(pods)

    async function getPods () {
      try {
        // need to make sure that profile is loaded
        await kb.fetcher.load(me.doc())
      } catch (err) {
        console.error('Unable to load profile', err)
        return []
      }
      const pods = kb.each(me, ns.space('storage'), null, me.doc())
      return pods.map((pod, index) => {
        const label =
                    pods.length > 1 ? pod.uri.split('//')[1].slice(0, -1) : 'Your storage'
        return {
          paneName: 'folder',
          tabName: `folder-${index}`,
          label,
          subject: pod,
          icon: UI.icons.iconBase + 'noun_Cabinet_251723.svg'
        }
      })
    }

    async function getAddressBooks () {
      try {
        const context = await UI.authn.findAppInstances(
          { me, div, dom },
          ns.vcard('AddressBook')
        )
        return (context.instances || []).map((book, index) => ({
          paneName: 'contact',
          tabName: `contact-${index}`,
          label: 'Contacts',
          subject: book,
          icon: UI.icons.iconBase + 'noun_15695.svg'
        }))
      } catch (err) {
        console.error('oops in globalAppTabs AddressBook')
      }
      return []
    }
  }
  this.getDashboardItems = getDashboardItems

  /**
     * Call this method to show the global dashboard.
     *
     * @param {Object} [options] A set of options that can be passed
     * @param {string} [options.pane] To open a specific dashboard pane
     * @returns {Promise<void>}
     */
  async function showDashboard (options = {}) {
    const dashboardContainer = getDashboardContainer()
    const outlineContainer = getOutlineContainer()
    // reuse dashboard if already children already is inserted
    if (dashboardContainer.childNodes.length > 0 && options.pane) {
      outlineContainer.style.display = 'none'
      dashboardContainer.style.display = 'inherit'
      const tab = dashboardContainer.querySelector(
                `[data-global-pane-name="${options.pane}"]`
      )
      if (tab) {
        tab.click()
        return
      }
      console.warn(
        'Did not find the referred tab in global dashboard, will open first one'
      )
    }

    // create a new dashboard if not already present
    const dashboard = await globalAppTabs({
      selectedTab: options.pane,
      onClose: closeDashboard
    })

    // close the dashboard if user log out
    UI.authn.solidAuthClient.trackSession(closeDashboardIfLoggedOut)

    // finally - switch to showing dashboard
    outlineContainer.style.display = 'none'
    dashboardContainer.appendChild(dashboard)

    function closeDashboard () {
      dashboardContainer.style.display = 'none'
      outlineContainer.style.display = 'inherit'
    }

    function closeDashboardIfLoggedOut (session) {
      if (session) {
        return
      }
      closeDashboard()
    }
  }
  this.showDashboard = showDashboard

  function getDashboardContainer () {
    return getOrCreateContainer('GlobalDashboard')
  }

  function getOutlineContainer () {
    return getOrCreateContainer('outline')
  }

  /**
     * Get element with id or create a new on the fly with that id
     *
     * @param {string} id The ID of the element you want to get or create
     * @returns {HTMLElement}
     */
  function getOrCreateContainer (id) {
    return (
      document.getElementById(id) ||
            (() => {
              const dashboardContainer = document.createElement('div')
              dashboardContainer.id = id
              const mainContainer =
                    document.querySelector('[role="main"]') || document.body
              return mainContainer.appendChild(dashboardContainer)
            })()
    )
  }

  async function getRelevantPanes (subject, context) {
    const panes = context.session.paneRegistry
    const relevantPanes = panes.list.filter(
      pane => pane.label(subject, context) && !pane.global
    )
    if (relevantPanes.length === 0) {
      // there are no relevant panes, simply return default pane (which ironically is internalPane)
      return [panes.byName('internal')]
    }
    const filteredPanes = await UI.authn.filterAvailablePanes(relevantPanes)
    if (filteredPanes.length === 0) {
      // if no relevant panes are available panes because of user role, we still allow for the most relevant pane to be viewed
      return [relevantPanes[0]]
    }
    const firstRelevantPaneIndex = panes.list.indexOf(relevantPanes[0])
    const firstFilteredPaneIndex = panes.list.indexOf(filteredPanes[0])
    // if the first relevant pane is loaded before the panes available wrt role, we still want to offer the most relevant pane
    return firstRelevantPaneIndex < firstFilteredPaneIndex
      ? [relevantPanes[0]].concat(filteredPanes)
      : filteredPanes
  }

  function getPane (relevantPanes, subject) {
    return (
      relevantPanes.find(
        pane => pane.shouldGetFocus && pane.shouldGetFocus(subject)
      ) || relevantPanes[0]
    )
  }

  async function expandedHeaderTR (subject, requiredPane, options) {
    async function renderPaneIconTray (td, options = {}) {
      const paneShownStyle =
                'width: 24px; border-radius: 0.5em; border-top: solid #222 1px; border-left: solid #222 0.1em; border-bottom: solid #eee 0.1em; border-right: solid #eee 0.1em; margin-left: 1em; padding: 3px; background-color:   #ffd;'
      const paneHiddenStyle =
                'width: 24px; border-radius: 0.5em; margin-left: 1em; padding: 3px'
      const paneIconTray = td.appendChild(dom.createElement('nav'))
      paneIconTray.style =
                'display:flex; justify-content: flex-start; align-items: center;'

      const relevantPanes = options.hideList
        ? []
        : await getRelevantPanes(subject, context)
      tr.firstPane = requiredPane || getPane(relevantPanes, subject)
      const paneNumber = relevantPanes.indexOf(tr.firstPane)

      if (relevantPanes.length !== 1) {
        // if only one, simplify interface
        relevantPanes.forEach((pane, index) => {
          const label = pane.label(subject, context)
          const ico = UI.utils.AJARImage(pane.icon, label, label, dom)
          ico.style = pane === tr.firstPane ? paneShownStyle : paneHiddenStyle // init to something at least
          // ico.setAttribute('align','right');   @@ Should be better, but ffox bug pushes them down
          // ico.style.width = iconHeight
          // ico.style.height = iconHeight
          var listen = function (ico, pane) {
            // Freeze scope for event time
            ico.addEventListener(
              'click',
              function (event) {
                // Find the containing table for this subject
                for (var t = td; t.parentNode; t = t.parentNode) {
                  if (t.nodeName === 'TABLE') break
                }
                if (t.nodeName !== 'TABLE') {
                  throw new Error('outline: internal error.')
                }
                var removePanes = function (specific) {
                  for (var d = t.firstChild; d; d = d.nextSibling) {
                    if (typeof d.pane !== 'undefined') {
                      if (!specific || d.pane === specific) {
                        if (d.paneButton) {
                          d.paneButton.setAttribute('class', 'paneHidden')
                          d.paneButton.style = paneHiddenStyle
                        }
                        removeAndRefresh(d)
                        // If we just delete the node d, ffox doesn't refresh the display properly.
                        // state = 'paneHidden';
                        if (
                          d.pane.requireQueryButton &&
                                                    t.parentNode.className /* outer table */ &&
                                                    numberOfPanesRequiringQueryButton === 1 &&
                                                    dom.getElementById('queryButton')
                        ) {
                          dom
                            .getElementById('queryButton')
                            .setAttribute('style', 'display:none;')
                        }
                      }
                    }
                  }
                }
                var renderPane = function (pane) {
                  var paneDiv
                  UI.log.info('outline: Rendering pane (2): ' + pane.name)
                  if (UI.no_catch_pane_errors) {
                    // for debugging
                    paneDiv = pane.render(subject, context, options)
                  } else {
                    try {
                      paneDiv = pane.render(subject, context, options)
                    } catch (e) {
                      // Easier debugging for pane developers
                      paneDiv = dom.createElement('div')
                      paneDiv.setAttribute('class', 'exceptionPane')
                      var pre = dom.createElement('pre')
                      paneDiv.appendChild(pre)
                      pre.appendChild(
                        dom.createTextNode(UI.utils.stackString(e))
                      )
                    }
                  }
                  if (
                    pane.requireQueryButton &&
                                        dom.getElementById('queryButton')
                  ) {
                    dom.getElementById('queryButton').removeAttribute('style')
                  }
                  var second = t.firstChild.nextSibling
                  var row = dom.createElement('tr')
                  var cell = row.appendChild(dom.createElement('td'))
                  cell.appendChild(paneDiv)
                  if (second) t.insertBefore(row, second)
                  else t.appendChild(row)
                  row.pane = pane
                  row.paneButton = ico
                }
                var state = ico.getAttribute('class')
                if (state === 'paneHidden') {
                  if (!event.shiftKey) {
                    // shift means multiple select
                    removePanes()
                  }
                  renderPane(pane)
                  ico.setAttribute('class', 'paneShown')
                  ico.style = paneShownStyle
                } else {
                  removePanes(pane)
                  ico.setAttribute('class', 'paneHidden')
                  ico.style = paneHiddenStyle
                }

                var numberOfPanesRequiringQueryButton = 0
                for (var d = t.firstChild; d; d = d.nextSibling) {
                  if (d.pane && d.pane.requireQueryButton) {
                    numberOfPanesRequiringQueryButton++
                  }
                }
              },
              false
            )
          } // listen

          listen(ico, pane)
          ico.setAttribute(
            'class',
            index !== paneNumber ? 'paneHidden' : 'paneShown'
          )
          if (index === paneNumber) tr.paneButton = ico
          paneIconTray.appendChild(ico)
        })
      }
      return paneIconTray
    } // renderPaneIconTray

    // Body of expandedHeaderTR
    var tr = dom.createElement('tr')
    if (options.hover) {
      // By default no hide till hover as community deems it confusing
      tr.setAttribute('class', 'hoverControl')
    }
    var td = tr.appendChild(dom.createElement('td'))
    td.setAttribute(
      'style',
      'margin: 0.2em; border: none; padding: 0; vertical-align: top;' +
            'display:flex; justify-content: space-between; flex-direction: row;'
    )
    td.setAttribute('notSelectable', 'true')
    td.setAttribute('about', subject.toNT())
    td.setAttribute('colspan', '2')

    // Stuff at the right about the subject
    const header = td.appendChild(dom.createElement('div'))
    header.style =
            'display:flex; justify-content: flex-start; align-items: center; flex-wrap: wrap;'

    const showHeader = !!requiredPane

    if (!options.solo && !showHeader) {
      var icon = header.appendChild(
        UI.utils.AJARImage(
          UI.icons.originalIconBase + 'tbl-collapse.png',
          'collapse',
          undefined,
          dom
        )
      )
      icon.addEventListener('click', collapseMouseDownListener)

      var strong = header.appendChild(dom.createElement('h1'))
      strong.appendChild(dom.createTextNode(UI.utils.label(subject)))
      strong.style =
                'font-size: 150%; margin: 0 0.6em 0 0; padding: 0.1em 0.4em;'
      UI.widgets.makeDraggable(strong, subject)
    }

    header.appendChild(
      await renderPaneIconTray(td, {
        hideList: showHeader
      })
    )

    // set DOM methods
    tr.firstChild.tabulatorSelect = function () {
      setSelected(this, true)
    }
    tr.firstChild.tabulatorDeselect = function () {
      setSelected(this, false)
    }
    return tr
  } // expandedHeaderTR

  // / //////////////////////////////////////////////////////////////////////////

  /*  PANES
     **
     **     Panes are regions of the outline view in which a particular subject is
     ** displayed in a particular way.  They are like views but views are for query results.
     ** subject panes are currently stacked vertically.
     */

  // / ////////////////////  Specific panes are in panes/*.js
  //
  // The defaultPane is the first one registered for which the label method exists
  // Those registered first take priority as a default pane.
  // That is, those earlier in this file

  /**
     * Pane registration
     */

  // the second argument indicates whether the query button is required

  // / ///////////////////////////////////////////////////////////////////////////

  // Remove a node from the DOM so that Firefox refreshes the screen OK
  // Just deleting it cause whitespace to accumulate.
  function removeAndRefresh (d) {
    var table = d.parentNode
    var par = table.parentNode
    var placeholder = dom.createElement('table')
    placeholder.setAttribute('style', 'width: 100%;')
    par.replaceChild(placeholder, table)
    table.removeChild(d)
    par.replaceChild(table, placeholder) // Attempt to
  }

  var propertyTable = (this.propertyTable = function propertyTable (
    subject,
    table,
    pane,
    options
  ) {
    UI.log.debug('Property table for: ' + subject)
    subject = kb.canon(subject)
    // if (!pane) pane = panes.defaultPane;

    if (!table) {
      // Create a new property table
      table = dom.createElement('table')
      table.setAttribute('style', 'width: 100%;')
      expandedHeaderTR(subject, pane, options).then(tr1 => {
        table.appendChild(tr1)

        if (tr1.firstPane) {
          var paneDiv
          try {
            UI.log.info('outline: Rendering pane (1): ' + tr1.firstPane.name)
            paneDiv = tr1.firstPane.render(subject, context, options)
          } catch (e) {
            // Easier debugging for pane developers
            paneDiv = dom.createElement('div')
            paneDiv.setAttribute('class', 'exceptionPane')
            var pre = dom.createElement('pre')
            paneDiv.appendChild(pre)
            pre.appendChild(dom.createTextNode(UI.utils.stackString(e)))
          }

          var row = dom.createElement('tr')
          var cell = row.appendChild(dom.createElement('td'))
          cell.appendChild(paneDiv)
          if (
            tr1.firstPane.requireQueryButton &&
                        dom.getElementById('queryButton')
          ) {
            dom.getElementById('queryButton').removeAttribute('style')
          }
          table.appendChild(row)
          row.pane = tr1.firstPane
          row.paneButton = tr1.paneButton
        }
      })

      return table
    } else {
      // New display of existing table, keeping expanded bits
      UI.log.info('Re-expand: ' + table)
      // do some other stuff here
      return table
    }
  }) /* propertyTable */

  function propertyTR (doc, st, inverse) {
    var tr = doc.createElement('TR')
    tr.AJAR_statement = st
    tr.AJAR_inverse = inverse
    // tr.AJAR_variable = null; // @@ ??  was just 'tr.AJAR_variable'
    tr.setAttribute('predTR', 'true')
    var predicateTD = thisOutline.outlinePredicateTD(st.predicate, tr, inverse)
    tr.appendChild(predicateTD) // @@ add 'internal' to predicateTD's class for style? mno
    return tr
  }
  this.propertyTR = propertyTR

  // / ////////// Property list
  function appendPropertyTRs (parent, plist, inverse, predicateFilter) {
    // UI.log.info('@appendPropertyTRs, 'this' is %s, dom is %s, '+ // Gives 'can't access dead object'
    //                   'thisOutline.document is %s', this, dom.location, thisOutline.document.location);
    // UI.log.info('@appendPropertyTRs, dom is now ' + this.document.location);
    // UI.log.info('@appendPropertyTRs, dom is now ' + thisOutline.document.location);
    UI.log.debug('Property list length = ' + plist.length)
    if (plist.length === 0) return ''
    var sel, j, k
    if (inverse) {
      sel = function (x) {
        return x.subject
      }
      plist = plist.sort(UI.utils.RDFComparePredicateSubject)
    } else {
      sel = function (x) {
        return x.object
      }
      plist = plist.sort(UI.utils.RDFComparePredicateObject)
    }

    var max = plist.length
    for (j = 0; j < max; j++) {
      // squishing together equivalent properties I think
      var s = plist[j]
      //      if (s.object == parentSubject) continue; // that we knew

      // Avoid predicates from other panes
      if (predicateFilter && !predicateFilter(s.predicate, inverse)) continue

      var tr = propertyTR(dom, s, inverse)
      parent.appendChild(tr)
      var predicateTD = tr.firstChild // we need to kludge the rowspan later

      var defaultpropview = views.defaults[s.predicate.uri]

      //   LANGUAGE PREFERENCES WAS AVAILABLE WITH FF EXTENSION - get from elsewhere?

      var dups = 0 // How many rows have the same predicate, -1?
      var langTagged = 0 // how many objects have language tags?
      var myLang = 0 // Is there one I like?

      for (
        k = 0;
        k + j < max && plist[j + k].predicate.sameTerm(s.predicate);
        k++
      ) {
        if (k > 0 && sel(plist[j + k]).sameTerm(sel(plist[j + k - 1]))) dups++
        if (sel(plist[j + k]).lang && outline.labeller.LanguagePreference) {
          langTagged += 1
          if (
            sel(plist[j + k]).lang.indexOf(
              outline.labeller.LanguagePreference
            ) >= 0
          ) {
            myLang++
          }
        }
      }

      /* Display only the one in the preferred language
                ONLY in the case (currently) when all the values are tagged.
                Then we treat them as alternatives. */

      if (myLang > 0 && langTagged === dups + 1) {
        for (let k = j; k <= j + dups; k++) {
          if (
            outline.labeller.LanguagePreference &&
                        sel(plist[k]).lang.indexOf(outline.labeller.LanguagePreference) >= 0
          ) {
            tr.appendChild(
              thisOutline.outlineObjectTD(
                sel(plist[k]),
                defaultpropview,
                undefined,
                s
              )
            )
            break
          }
        }
        j += dups // extra push
        continue
      }

      tr.appendChild(
        thisOutline.outlineObjectTD(sel(s), defaultpropview, undefined, s)
      )

      /* Note: showNobj shows between n to 2n objects.
             * This is to prevent the case where you have a long list of objects
             * shown, and dangling at the end is '1 more' (which is easily ignored)
             * Therefore more objects are shown than hidden.
             */

      tr.showNobj = function (n) {
        var predDups = k - dups
        var show = 2 * n < predDups ? n : predDups
        var showLaterArray = []
        if (predDups !== 1) {
          predicateTD.setAttribute(
            'rowspan',
            show === predDups ? predDups : n + 1
          )
          var l
          if (show < predDups && show === 1) {
            // what case is this...
            predicateTD.setAttribute('rowspan', 2)
          }
          var displayed = 0 // The number of cells generated-1,
          // all duplicate thing removed
          for (l = 1; l < k; l++) {
            // This detects the same things
            if (
              !kb
                .canon(sel(plist[j + l]))
                .sameTerm(kb.canon(sel(plist[j + l - 1])))
            ) {
              displayed++
              s = plist[j + l]
              defaultpropview = views.defaults[s.predicate.uri]
              var trObj = dom.createElement('tr')
              trObj.style.colspan = '1'
              trObj.appendChild(
                thisOutline.outlineObjectTD(
                  sel(plist[j + l]),
                  defaultpropview,
                  undefined,
                  s
                )
              )
              trObj.AJAR_statement = s
              trObj.AJAR_inverse = inverse
              parent.appendChild(trObj)
              if (displayed >= show) {
                trObj.style.display = 'none'
                showLaterArray.push(trObj)
              }
            } else {
              // ToDo: show all the data sources of this statement
              UI.log.info('there are duplicates here: %s', plist[j + l - 1])
            }
          }
          // @@a quick fix on the messing problem.
          if (show === predDups) {
            predicateTD.setAttribute('rowspan', displayed + 1)
          }
        } // end of if (predDups!==1)

        if (show < predDups) {
          // Add the x more <TR> here
          var moreTR = dom.createElement('tr')
          var moreTD = moreTR.appendChild(dom.createElement('td'))
          moreTD.setAttribute(
            'style',
            'margin: 0.2em; border: none; padding: 0; vertical-align: top;'
          )
          moreTD.setAttribute('notSelectable', 'false')
          if (predDups > n) {
            // what is this for??
            var small = dom.createElement('a')
            moreTD.appendChild(small)

            var predToggle = (function (f) {
              return f(predicateTD, k, dups, n)
            })(function (predicateTD, k, dups, n) {
              return function (display) {
                small.innerHTML = ''
                if (display === 'none') {
                  small.appendChild(
                    UI.utils.AJARImage(
                      UI.icons.originalIconBase + 'tbl-more-trans.png',
                      'more',
                      'See all',
                      dom
                    )
                  )
                  small.appendChild(
                    dom.createTextNode(predDups - n + ' more...')
                  )
                  predicateTD.setAttribute('rowspan', n + 1)
                } else {
                  small.appendChild(
                    UI.utils.AJARImage(
                      UI.icons.originalIconBase + 'tbl-shrink.png',
                      '(less)',
                      undefined,
                      dom
                    )
                  )
                  predicateTD.setAttribute('rowspan', predDups + 1)
                }
                for (var i = 0; i < showLaterArray.length; i++) {
                  var trObj = showLaterArray[i]
                  trObj.style.display = display
                }
              }
            }) // ???
            var current = 'none'
            var toggleObj = function (event) {
              predToggle(current)
              current = current === 'none' ? '' : 'none'
              if (event) event.stopPropagation()
              return false // what is this for?
            }
            toggleObj()
            small.addEventListener('click', toggleObj, false)
          } // if(predDups>n)
          parent.appendChild(moreTR)
        } // if
      } // tr.showNobj

      tr.showAllobj = function () {
        tr.showNobj(k - dups)
      }

      tr.showNobj(10)

      j += k - 1 // extra push
    }
  } //  appendPropertyTRs

  this.appendPropertyTRs = appendPropertyTRs

  /*   termWidget
     **
     */
  var termWidget = {} // @@@@@@ global
  global.termWidget = termWidget
  termWidget.construct = function (dom) {
    dom = dom || document
    var td = dom.createElement('TD')
    td.setAttribute(
      'style',
      'margin: 0.2em; border: none; padding: 0; vertical-align: top;'
    )
    td.setAttribute('class', 'iconTD')
    td.setAttribute('notSelectable', 'true')
    td.style.width = '0px'
    return td
  }
  termWidget.addIcon = function (td, icon, listener) {
    var iconTD = td.childNodes[1]
    if (!iconTD) return
    var width = iconTD.style.width
    var img = UI.utils.AJARImage(icon.src, icon.alt, icon.tooltip, dom)
    width = parseInt(width)
    width = width + icon.width
    iconTD.style.width = width + 'px'
    iconTD.appendChild(img)
    if (listener) {
      img.addEventListener('click', listener)
    }
  }
  termWidget.removeIcon = function (td, icon) {
    var iconTD = td.childNodes[1]
    var baseURI
    if (!iconTD) return
    var width = iconTD.style.width
    width = parseInt(width)
    width = width - icon.width
    iconTD.style.width = width + 'px'
    for (var x = 0; x < iconTD.childNodes.length; x++) {
      var elt = iconTD.childNodes[x]
      var eltSrc = elt.src

      // ignore first '?' and everything after it //Kenny doesn't know what this is for
      try {
        baseURI = dom.location.href.split('?')[0]
      } catch (e) {
        console.log(e)
        baseURI = ''
      }
      var relativeIconSrc = UI.rdf.uri.join(icon.src, baseURI)
      if (eltSrc === relativeIconSrc) {
        iconTD.removeChild(elt)
      }
    }
  }
  termWidget.replaceIcon = function (td, oldIcon, newIcon, listener) {
    termWidget.removeIcon(td, oldIcon)
    termWidget.addIcon(td, newIcon, listener)
  }

  // / /////////////////////////////////////////////////// VALUE BROWSER VIEW

  // / /////////////////////////////////////////////////////// TABLE VIEW

  //  Summarize a thing as a table cell

  /**********************

     query global vars

     ***********************/

  // const doesn't work in Opera
  // const BLANK_QUERY = { pat: kb.formula(), vars: [], orderBy: [] };
  // @ pat: the query pattern in an RDFIndexedFormula. Statements are in pat.statements
  // @ vars: the free variables in the query
  // @ orderBy: the variables to order the table

  function QueryObj () {
    this.pat = kb.formula()
    this.vars = []
    // this.orderBy = []
  }

  var queries = []
  queries[0] = new QueryObj()
  /*
    function querySave () {
      queries.push(queries[0])
      var choices = dom.getElementById('queryChoices')
      var next = dom.createElement('option')
      var box = dom.createElement('input')
      var index = queries.length - 1
      box.setAttribute('type', 'checkBox')
      box.setAttribute('value', index)
      choices.appendChild(box)
      choices.appendChild(dom.createTextNode('Saved query #' + index))
      choices.appendChild(dom.createElement('br'))
      next.setAttribute('value', index)
      next.appendChild(dom.createTextNode('Saved query #' + index))
      dom.getElementById('queryJump').appendChild(next)
    }
  */
  /*
    function resetQuery () {
      function resetOutliner (pat) {
        var n = pat.statements.length
        var pattern, tr
        for (let i = 0; i < n; i++) {
          pattern = pat.statements[i]
          tr = pattern.tr
          // UI.log.debug('tr: ' + tr.AJAR_statement);
          if (typeof tr !== 'undefined') {
            delete tr.AJAR_pattern
            delete tr.AJAR_variable
          }
        }
        for (let x in pat.optional) { resetOutliner(pat.optional[x]) }
      }
      resetOutliner(myQuery.pat)
      UI.utils.clearVariableNames()
      queries[0] = myQuery = new QueryObj()
    }
  */
  function addButtonCallbacks (target, fireOn) {
    UI.log.debug('Button callbacks for ' + fireOn + ' added')
    var makeIconCallback = function (icon) {
      return function IconCallback (req) {
        if (req.indexOf('#') >= 0) {
          console.log(
            '@@ makeIconCallback: Not expecting # in URI whose state changed: ' +
                        req
          )
          // alert('Should have no hash in '+req)
        }
        if (!target) {
          return false
        }
        if (!outline.ancestor(target, 'DIV')) return false
        // if (term.termType != 'symbol') { return true } // should always ve
        if (req === fireOn) {
          target.src = icon
          target.title = outlineIcons.tooltips[icon]
        }
        return true
      }
    }
    sf.addCallback('request', makeIconCallback(outlineIcons.src.icon_requested))
    sf.addCallback('done', makeIconCallback(outlineIcons.src.icon_fetched))
    sf.addCallback('fail', makeIconCallback(outlineIcons.src.icon_failed))
  }

  //   Selection support

  function selected (node) {
    var a = node.getAttribute('class')
    if (a && a.indexOf('selected') >= 0) return true
    return false
  }

  // These woulkd be simpler using closer variables below
  function optOnIconMouseDownListener (e) {
    // outlineIcons.src.icon_opton  needed?
    var target = thisOutline.targetOf(e)
    var p = target.parentNode
    termWidget.replaceIcon(
      p.parentNode,
      outlineIcons.termWidgets.optOn,
      outlineIcons.termWidgets.optOff,
      optOffIconMouseDownListener
    )
    p.parentNode.parentNode.removeAttribute('optional')
  }

  function optOffIconMouseDownListener (e) {
    // outlineIcons.src.icon_optoff needed?
    var target = thisOutline.targetOf(e)
    var p = target.parentNode
    termWidget.replaceIcon(
      p.parentNode,
      outlineIcons.termWidgets.optOff,
      outlineIcons.termWidgets.optOn,
      optOnIconMouseDownListener
    )
    p.parentNode.parentNode.setAttribute('optional', 'true')
  }

  function setSelectedParent (node, inc) {
    var onIcon = outlineIcons.termWidgets.optOn
    var offIcon = outlineIcons.termWidgets.optOff
    for (var n = node; n.parentNode; n = n.parentNode) {
      while (true) {
        if (n.getAttribute('predTR')) {
          var num = n.getAttribute('parentOfSelected')
          if (!num) num = 0
          else num = parseInt(num)
          if (num === 0 && inc > 0) {
            termWidget.addIcon(
              n.childNodes[0],
              n.getAttribute('optional') ? onIcon : offIcon,
              n.getAttribute('optional')
                ? optOnIconMouseDownListener
                : optOffIconMouseDownListener
            )
          }
          num = num + inc
          n.setAttribute('parentOfSelected', num)
          if (num === 0) {
            n.removeAttribute('parentOfSelected')
            termWidget.removeIcon(
              n.childNodes[0],
              n.getAttribute('optional') ? onIcon : offIcon
            )
          }
          break
        } else if (n.previousSibling && n.previousSibling.nodeName === 'TR') {
          n = n.previousSibling
        } else break
      }
    }
  }

  this.statusBarClick = function (event) {
    var target = UI.utils.getTarget(event)
    if (target.label) {
      window.content.location = target.label
      // The following alternative does not work in the extension.
      // var s = UI.store.sym(target.label);
      // outline.GotoSubject(s, true);
    }
  }

  this.showURI = function showURI (about) {
    if (about && dom.getElementById('UserURI')) {
      dom.getElementById('UserURI').value =
                about.termType === 'NamedNode' ? about.uri : '' // blank if no URI
    }
  }

  this.showSource = function showSource () {
    if (typeof sourceWidget === 'undefined') return
    // deselect all before going on, this is necessary because you would switch tab,
    // close tab or so on...
    for (var uri in sourceWidget.sources) {
      sourceWidget.sources[uri].setAttribute('class', '')
    } // .class doesn't work. Be careful!
    for (var i = 0; i < selection.length; i++) {
      if (!selection[i].parentNode) {
        console.log('showSource: EH? no parentNode? ' + selection[i] + '\n')
        continue
      }
      var st = selection[i].parentNode.AJAR_statement
      if (!st) continue // for root TD
      var source = st.why
      if (source && source.uri) {
        sourceWidget.highlight(source, true)
      }
    }
  }

  this.getSelection = function getSelection () {
    return selection
  }

  function setSelected (node, newValue) {
    // UI.log.info('selection has ' +selection.map(function(item){return item.textContent;}).join(', '));
    // UI.log.debug('@outline setSelected, intended to '+(newValue?'select ':'deselect ')+node+node.textContent);
    // if (newValue === selected(node)) return; //we might not need this anymore...
    if (node.nodeName !== 'TD') {
      UI.log.debug('down' + node.nodeName)
      throw new Error(
        'Expected TD in setSelected: ' +
                node.nodeName +
                ' : ' +
                node.textContent
      )
    }
    UI.log.debug('pass')
    var cla = node.getAttribute('class')
    if (!cla) cla = ''
    if (newValue) {
      cla += ' selected'
      if (cla.indexOf('pred') >= 0 || cla.indexOf('obj') >= 0) {
        setSelectedParent(node, 1)
      }
      selection.push(node)
      // UI.log.info('Selecting '+node.textContent)

      var about = UI.utils.getTerm(node) // show uri for a newly selectedTd
      thisOutline.showURI(about)

      var st = node.AJAR_statement // show blue cross when the why of that triple is editable
      if (typeof st === 'undefined') st = node.parentNode.AJAR_statement
      // if (typeof st === 'undefined') return; // @@ Kludge?  Click in the middle of nowhere
      if (st) {
        // don't do these for headers or base nodes
        var source = st.why
        // var target = st.why
        var editable = UI.store.updater.editable(source.uri, kb)
        if (!editable) {
          // let target = node.parentNode.AJAR_inverse ? st.object : st.subject
        } // left hand side
        // think about this later. Because we update to the why for now.
        // alert('Target='+target+', editable='+editable+'\nselected statement:' + st)
        if (editable && cla.indexOf('pred') >= 0) {
          termWidget.addIcon(node, outlineIcons.termWidgets.addTri)
        } // Add blue plus
      }
    } else {
      UI.log.debug('cla=$' + cla + '$')
      if (cla === 'selected') cla = '' // for header <TD>
      cla = cla.replace(' selected', '')
      if (cla.indexOf('pred') >= 0 || cla.indexOf('obj') >= 0) {
        setSelectedParent(node, -1)
      }
      if (cla.indexOf('pred') >= 0) {
        termWidget.removeIcon(node, outlineIcons.termWidgets.addTri)
      }

      selection = selection.filter(function (x) {
        return x === node
      })

      UI.log.info('Deselecting ' + node.textContent)
    }
    if (typeof sourceWidget !== 'undefined') thisOutline.showSource() // Update the data sources display
    // UI.log.info('selection becomes [' +selection.map(function(item){return item.textContent;}).join(', ')+']');
    // UI.log.info('Setting className ' + cla);
    node.setAttribute('class', cla)
  }

  function deselectAll () {
    var n = selection.length
    for (let i = n - 1; i >= 0; i--) setSelected(selection[i], false)
    selection = []
  }

  /** Get the target of an event **/
  this.targetOf = function (e) {
    var target
    if (!e) e = window.event
    if (e.target) {
      target = e.target
    } else if (e.srcElement) {
      target = e.srcElement
    } else {
      UI.log.error("can't get target for event " + e)
      return false
    } // fail
    if (target.nodeType === 3) {
      // defeat Safari bug [sic]
      target = target.parentNode
    }
    return target
  } // targetOf

  this.walk = function walk (directionCode, inputTd) {
    var selectedTd = inputTd || selection[0]
    var newSelTd
    switch (directionCode) {
      case 'down':
        try {
          newSelTd = selectedTd.parentNode.nextSibling.lastChild
        } catch (e) {
          this.walk('up')
          return
        } // end
        deselectAll()
        setSelected(newSelTd, true)
        break
      case 'up':
        try {
          newSelTd = selectedTd.parentNode.previousSibling.lastChild
        } catch (e) {
          return
        } // top
        deselectAll()
        setSelected(newSelTd, true)
        break
      case 'right':
        deselectAll()
        if (
          selectedTd.nextSibling ||
                    selectedTd.lastChild.tagName === 'strong'
        ) {
          setSelected(selectedTd.nextSibling, true)
        } else {
          var newSelected = dom.evaluate(
            'table/div/tr/td[2]',
            selectedTd,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue
          setSelected(newSelected, true)
        }
        break
      case 'left':
        deselectAll()
        if (
          selectedTd.previousSibling &&
                    selectedTd.previousSibling.className === 'undetermined'
        ) {
          setSelected(selectedTd.previousSibling, true)
          return true // do not shrink signal
        } else {
          setSelected(UI.utils.ancestor(selectedTd.parentNode, 'TD'), true)
        } // supplied by thieOutline.focusTd
        break
      case 'moveTo':
        // UI.log.info(selection[0].textContent+'->'+inputTd.textContent);
        deselectAll()
        setSelected(inputTd, true)
        break
    }
    if (directionCode === 'down' || directionCode === 'up') {
      if (!newSelTd.tabulatorSelect) this.walk(directionCode)
    }
    // return newSelTd;
  }

  // Keyboard Input: we can consider this as...
  // 1. a fast way to modify data - enter will go to next predicate
  // 2. an alternative way to input - enter at the end of a predicate will create a new statement
  this.OutlinerKeypressPanel = function OutlinerKeypressPanel (e) {
    UI.log.info('Key ' + e.keyCode + ' pressed')

    function showURI (about) {
      if (about && dom.getElementById('UserURI')) {
        dom.getElementById('UserURI').value =
                    about.termType === 'NamedNode' ? about.uri : '' // blank if no URI
      }
    }

    function setSelectedAfterward (_uri) {
      if (arguments[3]) return true
      walk('right', selectedTd)
      showURI(UI.utils.getAbout(kb, selection[0]))
      return true
    }
    var target, editable

    if (UI.utils.getTarget(e).tagName === 'TEXTAREA') return
    if (UI.utils.getTarget(e).id === 'UserURI') return
    if (selection.length > 1) return
    if (selection.length === 0) {
      if (
        e.keyCode === 13 ||
                e.keyCode === 38 ||
                e.keyCode === 40 ||
                e.keyCode === 37 ||
                e.keyCode === 39
      ) {
        this.walk('right', thisOutline.focusTd)
        showURI(UI.utils.getAbout(kb, selection[0]))
      }
      return
    }
    var selectedTd = selection[0]
    // if not done, Have to deal with redraw...
    sf.removeCallback('done', 'setSelectedAfterward')
    sf.removeCallback('fail', 'setSelectedAfterward')

    switch (e.keyCode) {
      case 13: // enter
        if (UI.utils.getTarget(e).tagName === 'HTML') {
          // I don't know why 'HTML'
          var object = UI.utils.getAbout(kb, selectedTd)
          target = selectedTd.parentNode.AJAR_statement.why
          editable = UI.store.updater.editable(target.uri, kb)
          if (object) {
            // <Feature about='enterToExpand'>
            outline.GotoSubject(object, true)
            /* //deal with this later
                        deselectAll();
                        var newTr=dom.getElementById('outline').lastChild;
                        setSelected(newTr.firstChild.firstChild.childNodes[1].lastChild,true);
                        function setSelectedAfterward(uri){
                            deselectAll();
                            setSelected(newTr.firstChild.firstChild.childNodes[1].lastChild,true);
                            showURI(getAbout(kb,selection[0]));
                            return true;
                        }
                        sf.insertCallback('done',setSelectedAfterward);
                        sf.insertCallback('fail',setSelectedAfterward);
                        */
            // </Feature>
          } else if (editable) {
            // this is a text node and editable
            thisOutline.UserInput.Enter(selectedTd)
          }
        } else {
          // var newSelTd=thisOutline.UserInput.lastModified.parentNode.parentNode.nextSibling.lastChild;
          this.UserInput.Keypress(e)
          this.walk('down') // bug with input at the end
          // dom.getElementById('docHTML').focus(); //have to set this or focus blurs
          e.stopPropagation()
        }
        return
      case 38: // up
        // thisOutline.UserInput.clearInputAndSave();
        // ^^^ does not work because up and down not captured...
        this.walk('up')
        e.stopPropagation()
        e.preventDefault()
        break
      case 40: // down
        // thisOutline.UserInput.clearInputAndSave();
        this.walk('down')
        e.stopPropagation()
        e.preventDefault()
    } // switch

    if (UI.utils.getTarget(e).tagName === 'INPUT') return

    switch (e.keyCode) {
      case 46: // delete
      case 8: // backspace
        target = selectedTd.parentNode.AJAR_statement.why
        editable = UI.store.updater.editable(target.uri, kb)
        if (editable) {
          e.preventDefault() // prevent from going back
          this.UserInput.Delete(selectedTd)
        }
        break
      case 37: // left
        if (this.walk('left')) return
        var titleTd = UI.utils.ancestor(selectedTd.parentNode, 'TD')
        outlineCollapse(selectedTd, UI.utils.getAbout(kb, titleTd))
        break
      case 39: // right
        // @@ TODO: Write away the need for exception on next line
        // eslint-disable-next-line no-case-declarations
        const obj = UI.utils.getAbout(kb, selectedTd)
        if (obj) {
          var walk = this.walk

          if (selectedTd.nextSibling) {
            // when selectedTd is a predicate
            this.walk('right')
            return
          }
          if (selectedTd.firstChild.tagName !== 'TABLE') {
            // not expanded
            sf.addCallback('done', setSelectedAfterward)
            sf.addCallback('fail', setSelectedAfterward)
            outlineExpand(selectedTd, obj, {
              pane: panes.byName('defaultPane')
            })
          }
          setSelectedAfterward()
        }
        break
      case 38: // up
      case 40: // down
        break
      default:
        switch (e.charCode) {
          case 99: // c for Copy
            if (e.ctrlKey) {
              thisOutline.UserInput.copyToClipboard(
                thisOutline.clipboardAddress,
                selectedTd
              )
              break
            }
            break
          case 118: // v
          case 112: // p for Paste
            if (e.ctrlKey) {
              thisOutline.UserInput.pasteFromClipboard(
                thisOutline.clipboardAddress,
                selectedTd
              )
              // dom.getElementById('docHTML').focus(); //have to set this or focus blurs
              // window.focus();
              // e.stopPropagation();
              break
            }
            break
          default:
            if (UI.utils.getTarget(e).tagName === 'HTML') {
              /*
                            //<Feature about='typeOnSelectedToInput'>
                            thisOutline.UserInput.Click(e,selectedTd);
                            thisOutline.UserInput.lastModified.value=String.fromCharCode(e.charCode);
                            if (selectedTd.className==='undetermined selected') thisOutline.UserInput.AutoComplete(e.charCode)
                            //</Feature>
                            */
              // Events are not reliable...
              // var e2=document.createEvent('KeyboardEvent');
              // e2.initKeyEvent('keypress',true,true,null,false,false,false,false,e.keyCode,0);
              // UserInput.lastModified.dispatchEvent(e2);
            }
        }
    } // end of switch

    showURI(UI.utils.getAbout(kb, selection[0]))
    // alert(window);alert(doc);
    /*
        var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                   .getService(Components.interfaces.nsIWindowMediator);
        var gBrowser = wm.getMostRecentWindow('navigator:browser') */
    // gBrowser.addTab('http://www.w3.org/');
    // alert(gBrowser.addTab);alert(gBrowser.scroll);alert(gBrowser.scrollBy)
    // gBrowser.scrollBy(0,100);

    // var thisHtml=selection[0].owner
    if (selection[0]) {
      var PosY = UI.utils.findPos(selection[0])[1]
      if (
        PosY + selection[0].clientHeight >
                window.scrollY + window.innerHeight
      ) {
        UI.utils.getEyeFocus(selection[0], true, true, window)
      }
      if (PosY < window.scrollY + 54) {
        UI.utils.getEyeFocus(selection[0], true, undefined, window)
      }
    }
  }
  this.OutlinerMouseclickPanel = function (e) {
    switch (thisOutline.UserInput._tabulatorMode) {
      case 0:
        TabulatorMousedown(e)
        break
      case 1:
        thisOutline.UserInput.Click(e)
        break
      default:
    }
  }

  /** things to do onmousedown in outline view **/
  /*
     **   To Do:  This big event handler needs to be replaced by lots
     ** of little ones individually connected to each icon.  This horrible
     ** switch below isn't modular. (Sorry!) - Tim
     */
  // expand
  // collapse
  // refocus
  // select
  // visit/open a page

  function expandMouseDownListener (e) {
    // For icon (UI.icons.originalIconBase + 'tbl-expand-trans.png')
    var target = thisOutline.targetOf(e)
    var p = target.parentNode
    var subject = UI.utils.getAbout(kb, target)
    var pane = e.altKey ? panes.byName('internal') : undefined // set later: was panes.defaultPane

    if (e.shiftKey) {
      // Shift forces a refocus - bring this to the top
      outlineRefocus(p, subject, pane)
    } else {
      if (e.altKey) {
        // To investigate screw ups, dont wait show internals
        outlineExpand(p, subject, {
          pane: panes.byName('internal'),
          immediate: true
        })
      } else {
        outlineExpand(p, subject)
      }
    }
  }

  function collapseMouseDownListener (e) {
    // for icon UI.icons.originalIconBase + 'tbl-collapse.png'
    var target = thisOutline.targetOf(e)
    var subject = UI.utils.getAbout(kb, target)
    var pane = e.altKey ? panes.byName('internal') : undefined
    var p = target.parentNode.parentNode
    outlineCollapse(p, subject, pane)
  }

  function failedIconMouseDownListener (e) {
    // outlineIcons.src.icon_failed
    var target = thisOutline.targetOf(e)
    var uri = target.getAttribute('uri') // Put on access buttons
    if (e.altKey) {
      sf.fetch(UI.rdf.uri.docpart(uri), {
        force: true
      }) // Add 'force' bit?
    } else {
      sf.refresh(kb.sym(UI.rdf.uri.docpart(uri))) // just one
    }
  }

  function fetchedIconMouseDownListener (e) {
    // outlineIcons.src.icon_fetched
    var target = thisOutline.targetOf(e)
    var uri = target.getAttribute('uri') // Put on access buttons
    if (e.altKey) {
      sf.fetch(UI.rdf.uri.docpart(uri), {
        force: true
      })
    } else {
      sf.refresh(kb.sym(UI.rdf.uri.docpart(uri))) // just one
    }
  }

  function unrequestedIconMouseDownListener (e) {
    var target = thisOutline.targetOf(e)
    var uri = target.getAttribute('uri') // Put on access buttons
    sf.fetch(UI.rdf.uri.docpart(uri))
  }

  function removeNodeIconMouseDownListener (e) {
    // icon_remove_node
    var target = thisOutline.targetOf(e)
    var node = target.node
    if (node.childNodes.length > 1) node = target.parentNode // parallel outline view @@ Hack
    removeAndRefresh(node) // @@ update icons for pane?
  }

  function selectableTDClickListener (e) {
    // Is we are in editing mode already
    if (thisOutline.UserInput._tabulatorMode) {
      return thisOutline.UserInput.Click(e)
    }

    var target = thisOutline.targetOf(e)
    // Originally this was set on the whole tree and could happen anywhere
    // var p = target.parentNode
    var node
    for (
      node = UI.utils.ancestor(target, 'TD');
      node && !(node.getAttribute('notSelectable') === 'false'); // Default now is not selectable
      node = UI.utils.ancestor(node.parentNode, 'TD')
    ) {}
    if (!node) return

    // var node = target;

    var sel = selected(node)
    // var cla = node.getAttribute('class')
    UI.log.debug('Was node selected before: ' + sel)
    if (e.altKey) {
      setSelected(node, !selected(node))
    } else if (e.shiftKey) {
      setSelected(node, true)
    } else {
      // setSelected(node, !selected(node))
      deselectAll()
      thisOutline.UserInput.clearInputAndSave(e)
      setSelected(node, true)

      if (e.detail === 2) {
        // double click -> quit TabulatorMousedown()
        e.stopPropagation()
        return
      }
      // if the node is already selected and the corresponding statement is editable,
      // go to UserInput
      var st = node.parentNode.AJAR_statement
      if (!st) return // For example in the title TD of an expanded pane
      const target = st.why
      var editable = UI.store.updater.editable(target.uri, kb)
      if (sel && editable) thisOutline.UserInput.Click(e, selection[0]) // was next 2 lines
      // var text='TabulatorMouseDown@Outline()';
      // HCIoptions['able to edit in Discovery Mode by mouse'].setupHere([sel,e,thisOutline,selection[0]],text);
    }
    UI.log.debug(
      'Was node selected after: ' +
            selected(node) +
            ', count=' +
            selection.length
    )
    // var tr = node.parentNode
    /*
        if (tr.AJAR_statement) {
          // var why = tr.AJAR_statement.why
            // UI.log.info('Information from '+why);
        }
        */
    e.stopPropagation()
    // this is important or conflict between deselect and user input happens
  }

  function TabulatorMousedown (e) {
    UI.log.info('@TabulatorMousedown, dom.location is now ' + dom.location)
    var target = thisOutline.targetOf(e)
    if (!target) return
    var tname = target.tagName
    // UI.log.debug('TabulatorMousedown: ' + tname + ' shift='+e.shiftKey+' alt='+e.altKey+' ctrl='+e.ctrlKey);
    // var p = target.parentNode
    // var about = UI.utils.getAbout(kb, target)
    // var source = null
    if (tname === 'INPUT' || tname === 'TEXTAREA') {
      return
    }

    // not input then clear
    thisOutline.UserInput.clearMenu()

    // ToDo:remove this and recover X
    if (
      thisOutline.UserInput.lastModified &&
            thisOutline.UserInput.lastModified.parentNode.nextSibling
    ) {
      thisOutline.UserInput.backOut()
    }

    // if (typeof rav=='undefined') //uncomment this for javascript2rdf
    // have to put this here or this conflicts with deselectAll()

    if (
      !target.src ||
            (target.src.slice(target.src.indexOf('/icons/') + 1) !==
                outlineIcons.src.icon_show_choices &&
                target.src.slice(target.src.indexOf('/icons/') + 1) !==
                outlineIcons.src.icon_add_triple)
    ) {
      thisOutline.UserInput.clearInputAndSave(e)
    }

    if (
      !target.src ||
            target.src.slice(target.src.indexOf('/icons/') + 1) !==
            outlineIcons.src.icon_show_choices
    ) {
      thisOutline.UserInput.clearMenu()
    }

    if (e) e.stopPropagation()
  } // function TabulatorMousedown

  function setUrlBarAndTitle (subject) {
    dom.title = UI.utils.label(subject)
    if (dom.location.href.startsWith(subject.site().uri)) {
      // dom.location = subject.uri  // No causes reload
    }
  }

  /** Expand an outline view
     * @param p {Element} - container
     */
  function outlineExpand (p, subject1, options) {
    options = options || {}
    var pane = options.pane
    var already = !!options.already
    var immediate = options.immediate

    UI.log.info('@outlineExpand, dom is now ' + dom.location)
    // remove callback to prevent unexpected repaint
    sf.removeCallback('done', 'expand')
    sf.removeCallback('fail', 'expand')

    var subject = kb.canon(subject1)
    // var requTerm = subject.uri ? kb.sym(UI.rdf.uri.docpart(subject.uri)) : subject

    function render () {
      subject = kb.canon(subject)
      if (!p || !p.parentNode || !p.parentNode.parentNode) return false

      var newTable
      UI.log.info('@@ REPAINTING ')
      if (!already) {
        // first expand
        newTable = propertyTable(subject, undefined, pane, options)
      } else {
        UI.log.info(' ... p is  ' + p)
        for (
          newTable = p.firstChild;
          newTable.nextSibling;
          newTable = newTable.nextSibling
        ) {
          UI.log.info(' ... checking node ' + newTable)
          if (newTable.nodeName === 'table') break
        }
        newTable = propertyTable(subject, newTable, pane, options)
      }
      already = true
      if (
        UI.utils.ancestor(p, 'TABLE') &&
                UI.utils.ancestor(p, 'TABLE').style.backgroundColor === 'white'
      ) {
        newTable.style.backgroundColor = '#eee'
      } else {
        newTable.style.backgroundColor = 'white'
      }
      try {
        if (YAHOO.util.Event.off) {
          YAHOO.util.Event.off(p, 'mousedown', 'dragMouseDown')
        }
      } catch (e) {
        console.log('YAHOO ' + e)
      }
      UI.utils.emptyNode(p).appendChild(newTable)
      thisOutline.focusTd = p // I don't know why I couldn't use 'this'...because not defined in callbacks
      UI.log.debug('expand: Node for ' + subject + ' expanded')
      // fetch seeAlso when render()
      // var seeAlsoStats = sf.store.statementsMatching(subject, UI.ns.rdfs('seeAlso'))
      // seeAlsoStats.map(function (x) {sf.lookUpThing(x.object, subject,false);})
      var seeAlsoWhat = kb.each(subject, UI.ns.rdfs('seeAlso'))
      for (var i = 0; i < seeAlsoWhat.length; i++) {
        if (i === 25) {
          UI.log.warn(
            'expand: Warning: many (' +
                        seeAlsoWhat.length +
                        ') seeAlso links for ' +
                        subject
          )
          // break; Not sure what limits the AJAX system has here
        }
        sf.lookUpThing(seeAlsoWhat[i], subject)
      }
    }

    function expand (uri) {
      if (arguments[3]) return true // already fetched indicator
      var cursubj = kb.canon(subject) // canonical identifier may have changed
      UI.log.info(
        '@@ expand: relevant subject=' +
                cursubj +
                ', uri=' +
                uri +
                ', already=' +
                already
      )
      // var term = kb.sym(uri)
      var docTerm = kb.sym(UI.rdf.uri.docpart(uri))
      if (uri.indexOf('#') >= 0) {
        throw new Error('Internal error: hash in ' + uri)
      }

      var relevant = function () {
        // Is the loading of this URI relevam to the display of subject?
        if (!cursubj.uri) return true // bnode should expand()
        var as = kb.uris(cursubj)
        if (!as) return false
        for (var i = 0; i < as.length; i++) {
          // canon'l uri or any alias
          for (
            var rd = UI.rdf.uri.docpart(as[i]);
            rd;
            rd = kb.HTTPRedirects[rd]
          ) {
            if (uri === rd) return true
          }
        }
        if (kb.anyStatementMatching(cursubj, undefined, undefined, docTerm)) {
          return true
        } // Kenny: inverse?
        return false
      }
      if (relevant()) {
        UI.log.success(
          '@@ expand OK: relevant subject=' +
                    cursubj +
                    ', uri=' +
                    uri +
                    ', source=' +
                    already
        )

        render()
        return false //  @@@@@@@@@@@ Will this allow just the first
      }
      return true
    }
    // Body of outlineExpand

    if (options.solo) {
      setUrlBarAndTitle(subject)
    }
    UI.log.debug('outlineExpand: dereferencing ' + subject)
    var status = dom.createElement('span')
    p.appendChild(status)
    sf.addCallback('done', expand) // @@@@@@@ This can really mess up existing work
    sf.addCallback('fail', expand) // Need to do if there s one a gentle resync of page with store

    var returnConditions = [] // this is quite a general way to do cut and paste programming
    // I might make a class for this
    if (subject.uri && subject.uri.split(':')[0] === 'rdf') {
      // what is this? -tim
      render()
      return
    }

    for (var i = 0; i < returnConditions.length; i++) {
      var returnCode
      if (returnCode === returnConditions[i](subject)) {
        render()
        UI.log.debug('outline 1815')
        if (returnCode[1]) outlineElement.removeChild(outlineElement.lastChild)
        return
      }
    }
    if (
      subject.uri &&
            !immediate &&
            !UI.widgets.isAudio(subject) &&
            !UI.widgets.isVideo(subject) && // Never parse videos as data
            !kb.holds(
              subject,
              UI.ns.rdf('type'),
              $rdf.Util.mediaTypeClass('application/pdf')
            )
    ) {
      // or PDF
      // Wait till at least the main URI is loaded before expanding:
      sf.nowOrWhenFetched(subject.doc(), undefined, function (ok, body) {
        if (ok) {
          sf.lookUpThing(subject)
          render() // inital open, or else full if re-open
          if (options.solo) {
            // Update window title with new information
            // dom.title = UI.utils.label(subject)
            setUrlBarAndTitle(subject)
          }
        } else {
          var message = dom.createElement('pre')
          message.textContent = body
          message.setAttribute('style', 'background-color: #fee;')
          message.textContent =
                        'Outline.expand: Unable to fetch ' + subject.doc() + ': ' + body
          p.appendChild(message)
        }
      })
    } else {
      render()
    }
  } // outlineExpand

  function outlineCollapse (p, subject) {
    var row = UI.utils.ancestor(p, 'TR')
    row = UI.utils.ancestor(row.parentNode, 'TR') // two levels up
    if (row) var statement = row.AJAR_statement
    var level // find level (the enclosing TD)
    for (
      level = p.parentNode;
      level.tagName !== 'TD';
      level = level.parentNode
    ) {
      if (typeof level === 'undefined') {
        alert('Not enclosed in TD!')
        return
      }
    }

    UI.log.debug('Collapsing subject ' + subject)
    var myview
    if (statement) {
      UI.log.debug('looking up pred ' + statement.predicate.uri + 'in defaults')
      myview = views.defaults[statement.predicate.uri]
    }
    UI.log.debug('view= ' + myview)
    if (level.parentNode.parentNode.id === 'outline') {
      var deleteNode = level.parentNode
    }
    thisOutline.replaceTD(
      thisOutline.outlineObjectTD(subject, myview, deleteNode, statement),
      level
    )
  } // outlineCollapse

  this.replaceTD = function replaceTD (newTd, replacedTd) {
    var reselect
    if (selected(replacedTd)) reselect = true

    // deselects everything being collapsed. This goes backwards because
    // deselecting an element decreases selection.length
    for (var x = selection.length - 1; x > -1; x--) {
      for (var elt = selection[x]; elt.parentNode; elt = elt.parentNode) {
        if (elt === replacedTd) {
          setSelected(selection[x], false)
        }
      }
    }

    replacedTd.parentNode.replaceChild(newTd, replacedTd)
    if (reselect) setSelected(newTd, true)
  }

  function outlineRefocus (p, subject) {
    // Shift-expand or shift-collapse: Maximize
    var outer = null
    for (var level = p.parentNode; level; level = level.parentNode) {
      UI.log.debug('level ' + level.tagName)
      if (level.tagName === 'TD') outer = level
    } // find outermost td
    UI.utils.emptyNode(outer).appendChild(propertyTable(subject))
    setUrlBarAndTitle(subject)
    // dom.title = UI.utils.label(subject)
    outer.setAttribute('about', subject.toNT())
  } // outlineRefocus

  outline.outlineRefocus = outlineRefocus

  // Inversion is turning the outline view inside-out
  // It may be called eversion
  /*
    function outlineInversion (p, subject) { // re-root at subject
      function move_root (rootTR, childTR) { // swap root with child
        // @@
      }
    }
  */
  this.GotoFormURI_enterKey = function (e) {
    if (e.keyCode === 13) outline.GotoFormURI(e)
  }
  this.GotoFormURI = function (_e) {
    GotoURI(dom.getElementById('UserURI').value)
  }

  function GotoURI (uri) {
    var subject = kb.sym(uri)
    this.GotoSubject(subject, true)
  }
  this.GotoURIinit = function (uri) {
    var subject = kb.sym(uri)
    this.GotoSubject(subject)
  }

  /** Display the subject in an outline view

     @param subject -- RDF term for teh thing to be presented
     @param expand  -- flag -- open the subject rather than keep folded closed
     @param pane    -- optional -- pane to be used for expanded display
     @param solo    -- optional -- the window will be cleared out and only the subject displayed
     @param referer -- optional -- where did we hear about this from anyway?
     @param table   -- option  -- a table element in which to put the outline.
     */
  this.GotoSubject = function (subject, expand, pane, solo, referrer, table) {
    table = table || dom.getElementById('outline') // if does not exist just add one? nowhere to out it
    if (solo) {
      UI.utils.emptyNode(table)
      table.style.width = '100%'
    }

    function GotoSubjectDefault () {
      var tr = dom.createElement('TR')
      tr.style.verticalAlign = 'top'
      table.appendChild(tr)
      var td = thisOutline.outlineObjectTD(subject, undefined, tr)
      tr.appendChild(td)
      return td
    }

    var td = GotoSubjectDefault()

    if (solo) setUrlBarAndTitle(subject) // dom.title = UI.utils.label(subject) // 'Tabulator: '+  No need to advertize

    if (expand) {
      outlineExpand(td, subject, {
        pane: pane,
        solo: solo
      })
      var tr = td.parentNode
      UI.utils.getEyeFocus(tr, false, undefined, window) // instantly: false
    }

    if (
      solo &&
            dom &&
            dom.defaultView &&
            dom.defaultView.history &&
            // Don't add the new location to the history if we arrived here through a direct link
            // (i.e. when static/databrowser.html in node-solid-server called this method):
            document.location.href !== subject.uri
    ) {
      const stateObj = pane ? { paneName: pane.name } : {}
      try {
        // can fail if different origin
        dom.defaultView.history.pushState(stateObj, subject.uri, subject.uri)
      } catch (e) {
        console.log(e)
      }
    }

    return subject
  }

  // / /////////////////////////////////////////////////////
  //
  //
  //                    VIEWS
  //
  //
  // / /////////////////////////////////////////////////////

  var views = {
    properties: [],
    defaults: [],
    classes: []
  } // views

  /** add a property view function **/
  function viewsAddPropertyView (property, pviewfunc, isDefault) {
    if (!views.properties[property]) {
      views.properties[property] = []
    }
    views.properties[property].push(pviewfunc)
    if (isDefault) {
      // will override an existing default!
      views.defaults[property] = pviewfunc
    }
  } // addPropertyView

  var ns = UI.ns
  // view that applies to items that are objects of certain properties.
  // viewsAddPropertyView(property, viewjsfile, default?)
  viewsAddPropertyView(ns.foaf('depiction').uri, viewAsImage, true)
  viewsAddPropertyView(ns.foaf('img').uri, viewAsImage, true)
  viewsAddPropertyView(ns.foaf('thumbnail').uri, viewAsImage, true)
  viewsAddPropertyView(ns.foaf('logo').uri, viewAsImage, true)
  viewsAddPropertyView(ns.foaf('mbox').uri, viewAsMbox, true)
  // viewsAddPropertyView(ns.foaf('based_near').uri, VIEWAS_map, true);
  // viewsAddPropertyView(ns.foaf('birthday').uri, VIEWAS_cal, true);

  // var thisOutline = this   dup
  /** some builtin simple views **/

  function viewAsBoringDefault (obj) {
    // UI.log.debug('entered viewAsBoringDefault...');
    var rep // representation in html

    if (obj.termType === 'Literal') {
      var styles = {
        integer: 'text-align: right;',
        decimal: "text-align: '.';",
        double: "text-align: '.';"
      }
      rep = dom.createElement('span')
      rep.textContent = obj.value
      // Newlines have effect and overlong lines wrapped automatically
      var style = ''
      if (obj.datatype && obj.datatype.uri) {
        var xsd = UI.ns.xsd('').uri
        if (obj.datatype.uri.slice(0, xsd.length) === xsd) {
          style = styles[obj.datatype.uri.slice(xsd.length)]
        }
      }
      rep.setAttribute('style', style || 'white-space: pre-wrap;')
    } else if (obj.termType === 'NamedNode' || obj.termType === 'BlankNode') {
      rep = dom.createElement('span')
      rep.setAttribute('about', obj.toNT())
      thisOutline.appendAccessIcons(kb, rep, obj)

      if (obj.termType === 'NamedNode') {
        if (obj.uri.slice(0, 4) === 'tel:') {
          var num = obj.uri.slice(4)
          var anchor = dom.createElement('a')
          rep.appendChild(dom.createTextNode(num))
          anchor.setAttribute('href', obj.uri)
          anchor.appendChild(
            UI.utils.AJARImage(
              outlineIcons.src.icon_telephone,
              'phone',
              'phone ' + num,
              dom
            )
          )
          rep.appendChild(anchor)
          anchor.firstChild.setAttribute('class', 'phoneIcon')
        } else {
          // not tel:
          rep.appendChild(dom.createTextNode(UI.utils.label(obj)))
          UI.widgets.makeDraggable(rep, obj) // 2017
        }
      } else {
        // bnode
        rep.appendChild(dom.createTextNode(UI.utils.label(obj)))
      }
    } else if (obj.termType === 'Collection') {
      // obj.elements is an array of the elements in the collection
      rep = dom.createElement('table')
      rep.setAttribute('style', 'width: 100%;')
      rep.setAttribute('about', obj.toNT())
      /* Not sure which looks best -- with or without. I think without

                      var tr = rep.appendChild(document.createElement('tr'));
                      tr.appendChild(document.createTextNode(
                              obj.elements.length ? '(' + obj.elements.length+')' : '(none)'));
              */
      for (var i = 0; i < obj.elements.length; i++) {
        var elt = obj.elements[i]
        var row = rep.appendChild(dom.createElement('tr'))
        var numcell = row.appendChild(dom.createElement('td'))
        numcell.setAttribute(
          'style',
          'margin: 0.2em; border: none; padding: 0; vertical-align: top;'
        )
        numcell.setAttribute('notSelectable', 'false')
        numcell.setAttribute('about', obj.toNT())
        numcell.innerHTML = i + 1 + ')'
        row.appendChild(thisOutline.outlineObjectTD(elt))
      }
    } else if (obj.termType === 'Graph') {
      rep = panes
        .byName('dataContentPane')
        .statementsAsTables(obj.statements, context)
      rep.setAttribute('class', 'nestedFormula')
    } else {
      UI.log.error('Object ' + obj + ' has unknown term type: ' + obj.termType)
      rep = dom.createTextNode('[unknownTermType:' + obj.termType + ']')
    } // boring defaults.
    UI.log.debug('contents: ' + rep.innerHTML)
    return rep
  } // boring_default

  function viewAsImage (obj) {
    var img = UI.utils.AJARImage(
      obj.uri,
      UI.utils.label(obj),
      UI.utils.label(obj),
      dom
    )
    img.setAttribute('class', 'outlineImage')
    return img
  }

  function viewAsMbox (obj) {
    var anchor = dom.createElement('a')
    // previous implementation assumed email address was Literal. fixed.

    // FOAF mboxs must NOT be literals -- must be mailto: URIs.

    var address = obj.termType === 'NamedNode' ? obj.uri : obj.value // this way for now
    if (!address) return viewAsBoringDefault(obj)
    var index = address.indexOf('mailto:')
    address = index >= 0 ? address.slice(index + 7) : address
    anchor.setAttribute('href', 'mailto:' + address)
    anchor.appendChild(dom.createTextNode(address))
    return anchor
  }

  this.createTabURI = function () {
    dom.getElementById('UserURI').value =
            dom.URL + '?uri=' + dom.getElementById('UserURI').value
  }

  // a way to expose variables to UserInput without making them propeties/methods
  this.UserInput.setSelected = setSelected
  this.UserInput.deselectAll = deselectAll
  this.UserInput.views = views
  this.outlineExpand = outlineExpand

  // this.panes = panes; // Allow external panes to register

  return this
} // END OF OUTLINE
