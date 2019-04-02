//  Common code for a discussion are a of messages about something
//   This version runs over a series of files for different time periods
//
//  Parameters for the whole chat like its title are stred on
//  index.ttl#this and the chats messages are stored in YYYY/MM/DD/chat.ttl
//
/* global alert  */
import DateFolder from './dateFolder'

const UI = {
  authn: require('./signin'),
  icons: require('./iconBase'),
  log: require('./log'),
  ns: require('./ns'),
  media: require('./media-capture'),
  pad: require('./pad'),
  rdf: require('rdflib'),
  store: require('./store'),
  style: require('./style'),
  utils: require('./utils'),
  widgets: require('./widgets')
}

// const utils = require('./utils')
const { renderMessage, creatorAndDate } = require('./renderMessage')
const bookmarks = require('./bookmarks')

module.exports = { infiniteMessageArea }

function infiniteMessageArea (dom, kb, chatChannel, options) {
  kb = kb || UI.store
  const ns = UI.ns
  const WF = $rdf.Namespace('http://www.w3.org/2005/01/wf/flow#')
  const DCT = $rdf.Namespace('http://purl.org/dc/terms/')
  // const POSIX = $rdf.Namespace('http://www.w3.org/ns/posix/stat#')

  options = options || {}

  var newestFirst = options.newestFirst === '1' || options.newestFirst === true // hack for now

  const dateFolder = new DateFolder(chatChannel, 'chat.ttl')

  options.authorAboveContent = true

  // var participation // An object tracking users use and prefs
  const messageBodyStyle = UI.style.messageBodyStyle

  // var messageBodyStyle = 'white-space: pre-wrap; width: 90%; font-size:100%; border: 0.07em solid #eee; padding: .2em 0.5em; margin: 0.1em 1em 0.1em 1em;'
  // 'font-size: 100%; margin: 0.1em 1em 0.1em 1em;  background-color: white; white-space: pre-wrap; padding: 0.1em;'

  var div = dom.createElement('div')
  var menuButton
  const statusArea = div.appendChild(dom.createElement('div'))
  var userContext = {dom, statusArea, div: statusArea} // logged on state, pointers to user's stuff
  var me

  var updater = UI.store.updater
/*
  var mention = function mention (message, style) {
    console.log(message)
    var pre = dom.createElement('pre')
    pre.setAttribute('style', style || 'color: grey;')
    pre.appendChild(dom.createTextNode(message))
    statusArea.appendChild(pre)
  }

  var announce = {
    log: function (message) { mention(message, 'color: #111;') },
    warn: function (message) { mention(message, 'color: #880;') },
    error: function (message) { mention(message, 'color: #800;') }
  }
*/
 /** Create a resource if it really does not exist
  *  Be absolutely sure something does not exist before creating a new empty file
  * as otherwise existing could  be deleted.
  * @param doc {NamedNode} - The resource
 */
  function createIfNotExists (doc) {
    return new Promise(function (resolve, reject) {
      kb.fetcher.load(doc).then(response => {
        console.log('createIfNotExists doc exists, all good ' + doc)
      // kb.fetcher.webOperation('HEAD', doc.uri).then(response => {
        resolve(response)
      }, err => {
        if (err.response.status === 404) {
          console.log('createIfNotExists doc does NOT exist, will create... ' + doc)

          kb.fetcher.webOperation('PUT', doc.uri, {data: '', contentType: 'text/turtle'}).then(response => {
            // fetcher.requested[doc.uri] = 'done' // do not need to read ??  but no headers
            delete kb.fetcher.requested[doc.uri] // delete cached 404 error
            console.log('createIfNotExists doc created ok ' + doc)
            resolve(response)
          }, err => {
            console.log('createIfNotExists doc FAILED: ' + doc + ': ' + err)
            reject(err)
          })
        } else {
          console.log('createIfNotExists doc load error NOT 404:  ' + doc + ': ' + err)
          reject(err)
        }
      })
    })
  }

  /*       Form for a new message
  */
  function newMessageForm (messageTable) {
    var form = dom.createElement('tr')
    var lhs = dom.createElement('td')
    var middle = dom.createElement('td')
    var rhs = dom.createElement('td')
    form.appendChild(lhs)
    form.appendChild(middle)
    form.appendChild(rhs)
    form.AJAR_date = '9999-01-01T00:00:00Z' // ISO format for field sort
    var field, sendButton

    function sendMessage (text) {
      var now = new Date()
      addNewTableIfNewDay(now).then(() => {
        if (!text) {
          field.setAttribute('style', messageBodyStyle + 'color: #bbb;') // pendingedit
          field.disabled = true
        }
        var sts = []
        var timestamp = '' + now.getTime()
        var dateStamp = $rdf.term(now)
        let chatDocument = dateFolder.leafDocumentFromDate(now)

        var message = kb.sym(chatDocument.uri + '#' + 'Msg' + timestamp)
        var content = kb.literal(text || field.value)
        // if (text) field.value = text  No - don't destroy half-finsihed user input

        sts.push(new $rdf.Statement(chatChannel, ns.wf('message'), message, chatDocument))
        sts.push(new $rdf.Statement(message, ns.sioc('content'), content, chatDocument))
        sts.push(new $rdf.Statement(message, DCT('created'), dateStamp, chatDocument))
        if (me) sts.push(new $rdf.Statement(message, ns.foaf('maker'), me, chatDocument))

        var sendComplete = function (uri, success, body) {
          if (!success) {
            form.appendChild(UI.widgets.errorMessageBlock(
              dom, 'Error writing message: ' + body))
          } else {
            var bindings = { '?msg': message,
              '?content': content,
              '?date': dateStamp,
              '?creator': me}
            var tr = renderMessage(liveMessageTable, bindings, false, options, userContext) // not green
            if (options.newestFirst === true) {
              messageTable.insertBefore(tr, messageTable.firstChild) // If newestFirst
            } else {
              messageTable.appendChild(tr) // not newestFirst
            }

            if (!text) {
              field.value = '' // clear from out for reuse
              field.setAttribute('style', messageBodyStyle)
              field.disabled = false
              field.scrollIntoView(newestFirst) // allign bottom (top)
              field.focus() // Start typing next line immediately
              field.select()
            }
          }
        }
        updater.update([], sts, sendComplete)
      }) // then
    } // sendMessage

    form.appendChild(dom.createElement('br'))

    //    DRAG AND DROP
    function droppedFileHandler (files) {
      let base = messageTable.chatDocument.dir().uri
      UI.widgets.uploadFiles(kb.fetcher, files, base + 'Files', base + 'Pictures',
        function (theFile, destURI) { // @@@@@@ Wait for eachif several
          sendMessage(destURI)
        })
    }

    // When a set of URIs are dropped on the field
    var droppedURIHandler = function (uris) {
      sendMessage(uris[0]) // @@@@@ wait
    }

    // When we are actually logged on
    function turnOnInput () {
      if (options.menuHandler && menuButton) {
        let menuOptions = { me, dom, div, newBase: messageTable.chatDocument.dir().uri }
        menuButton.addEventListener('click',
          event => { options.menuHandler(event, chatChannel, menuOptions) }
          , false)
      }

      // Turn on message input
      creatorAndDate(lhs, me, '', null)

      field = dom.createElement('textarea')
      middle.innerHTML = ''
      middle.appendChild(field)
      field.rows = 3
      // field.cols = 40
      field.setAttribute('style', messageBodyStyle + 'background-color: #eef;')

      // Trap the Enter BEFORE it is used ti make a newline
      field.addEventListener('keydown', function (e) { // User preference?
        if (e.keyCode === 13) {
          if (!e.altKey) { // Alt-Enter just adds a new line
            sendMessage()
          }
        }
      }, false)
      UI.widgets.makeDropTarget(field, droppedURIHandler, droppedFileHandler)

      rhs.innerHTML = ''
      sendButton = UI.widgets.button(dom, UI.icons.iconBase + 'noun_383448.svg', 'Send')
      sendButton.setAttribute('style', UI.style.buttonStyle + 'float: right;')
      sendButton.addEventListener('click', ev => sendMessage(), false)
      rhs.appendChild(sendButton)

      const chatDocument = dateFolder.leafDocumentFromDate(new Date())
      var imageDoc
      function getImageDoc () {
        imageDoc = kb.sym(chatDocument.dir().uri + 'Image_' + Date.now() + '.png')
        return imageDoc
      }
      function tookPicture (imageDoc) {
        if (imageDoc) {
          sendMessage(imageDoc.uri)
        }
      }
      middle.appendChild(UI.media.cameraButton(dom, kb, getImageDoc, tookPicture))

      UI.pad.recordParticipation(chatChannel, chatChannel.doc()) // participation =
    } // turn on inpuut

    let context = {div: middle, dom: dom}
    UI.authn.logIn(context).then(context => {
      me = context.me
      turnOnInput()
      Object.assign(context, userContext)
      bookmarks.findBookmarkDocument(context).then(context => {
        console.log('Bookmark file: ' + context.bookmarkDocument)
      })
    })

    return form
  }

  // ///////////////////////////////////////////////////////////////////////

  function syncMessages (about, messageTable) {
    var displayed = {}
    var ele, ele2
    for (ele = messageTable.firstChild; ele; ele = ele.nextSibling) {
      if (ele.AJAR_subject) {
        displayed[ele.AJAR_subject.uri] = true
      }
    }

    var messages = kb.statementsMatching(
      about, ns.wf('message'), null, messageTable.chatDocument).map(st => { return st.object })
    var stored = {}
    messages.map(function (m) {
      stored[m.uri] = true
      if (!displayed[m.uri]) {
        addMessage(m, messageTable)
      }
    })

    for (ele = messageTable.firstChild; ele;) {
      ele2 = ele.nextSibling
      if (ele.AJAR_subject && !stored[ele.AJAR_subject.uri]) {
        messageTable.removeChild(ele)
      }
      ele = ele2
    }
    for (ele = messageTable.firstChild; ele; ele = ele.nextSibling) {
      if (ele.AJAR_subject) {   // Refresh thumbs up etc
        UI.widgets.refreshTree(ele) // Things inside may have changed too
      }
    }
  } // syncMessages

  var addMessage = function (message, messageTable) {
    var bindings = {
      '?msg': message,
      '?creator': kb.any(message, ns.foaf('maker')),
      '?date': kb.any(message, DCT('created')),
      '?content': kb.any(message, ns.sioc('content'))
    }
    var tr = renderMessage(dom, kb, messageTable, bindings, messageTable.fresh, options, userContext) // fresh from elsewhere
    if (options.newestFirst === true) {
      messageTable.insertBefore(tr, messageTable.firstChild) // If newestFirst
    } else {
      messageTable.appendChild(tr) // not newestFirst
    }
  }

// ////////

  /* Add a new messageTable at the top/bottom
  */
  async function insertPreviousMessages (backwards) {
    let extremity = backwards ? earliest : latest
    let date = extremity.messageTable.date// day in mssecs

    date = await dateFolder.loadPrevious(date, backwards) // backwards
    console.log(`insertPreviousMessages: from ${backwards ? 'backwards' : 'forwards'} loadPrevious: ${date}`)
    if (!date && !backwards && !liveMessageTable) {
      await appendCurrentMessages()  // If necessary skip to today and add that
    }
    if (!date) return true // done
    var live = false
    if (!backwards) {
      let todayDoc = dateFolder.leafDocumentFromDate(new Date())
      let doc = dateFolder.leafDocumentFromDate(date)
      live = doc.sameTerm(todayDoc) // Is this todays?
    }
    let newMessageTable = await createMessageTable(date, live)
    extremity.messageTable = newMessageTable // move pointer to earliest
    if (backwards ? newestFirst : !newestFirst) { // put on bottom or top
      div.appendChild(newMessageTable)
    } else { // put on top as we scroll back
      div.insertBefore(newMessageTable, div.firstChild)
    }
    return live // not done
  }
  /* Remove message tables earlier than this one
  */
  function removePreviousMessages (backwards, messageTable) {
    if (backwards ? newestFirst : !newestFirst) { // it was put on bottom
      while (messageTable.nextSibling) {
        div.removeChild(messageTable.nextSibling)
      }
    } else { // it was put on top as we scroll back
      while (messageTable.previousSibling) {
        div.removeChild(messageTable.previousSibling)
      }
    }
    let extr = backwards ? earliest : latest
    extr.messageTable = messageTable
  }

  /* Generate the chat document (rdf object) from date
  * @returns: <NamedNode> - document
  */
  function chatDocumentFromDate (date) {
    let isoDate = date.toISOString() // Like "2018-05-07T17:42:46.576Z"
    var path = isoDate.split('T')[0].replace(/-/g, '/') //  Like "2018/05/07"
    path = chatChannel.dir().uri + path + '/chat.ttl'
    return $rdf.sym(path)
  }

  /* Generate a date object from the chat file name
  */
  function dateFromChatDocument (doc) {
    const head = chatChannel.dir().uri.length
    const str = doc.uri.slice(head, head + 10).replace(/\//g, '-')
    // let date = new Date(str + 'Z') // GMT - but fails in FF - invalid format :-(
    let date = new Date(str) // not explicitly UTC but is assumed so in spec
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
    console.log('Date for ' + doc + ':' + date.toISOString())
    return date
  }

  /* LOad and render message table
  ** @returns DOM element generates
  */
  async function createMessageTable (date, live) {
    console.log('   createMessageTable for  ' + date)
    const chatDocument = dateFolder.leafDocumentFromDate(date)
    try {
      await kb.fetcher.load(chatDocument)
    } catch (err) {
      let messageTable = (dom.createElement('table'))
      let statusTR = messageTable.appendChild(dom.createElement('tr')) // ### find status in exception
      if (err.response && err.response.status && err.response.status === 404) {
        console.log('Error 404 for chat file ' + chatDocument)
        statusTR.appendChild(UI.widgets.errorMessageBlock(dom, 'no messages', 'white'))
      } else {
        console.log('*** Error NON 404 for chat file ' + chatDocument)
        statusTR.appendChild(UI.widgets.errorMessageBlock(dom, err, 'pink'))
      }
      return statusTR
    }
    return renderMessageTable(date, live)
  }

  function renderMessageTable (date, live) {
    var scrollBackButton
    var scrollForwardButton

/// /////////////////   Scrooll down adding more above

    async function extendBackwards () {
      let done = await insertPreviousMessages(true)
      if (done) {
        scrollBackButton.firstChild.setAttribute('src', UI.icons.iconBase + 'noun_T-Block_1114655_000000.svg') // T
        scrollBackButton.disabled = true
        messageTable.initial = true
      } else {
        messageTable.extendedBack = true
      }
      setScrollBackButtonIcon()
      return done
    }
    function setScrollBackButtonIcon () {
      let sense = messageTable.extendedBack ? !newestFirst : newestFirst
      let scrollBackIcon = messageTable.initial ? 'noun_T-Block_1114655_000000.svg'
        : (sense ? 'noun_1369241.svg' : 'noun_1369237.svg')
      scrollBackButton.firstChild.setAttribute('src', UI.icons.iconBase + scrollBackIcon)
    }
    async function scrollBackButtonHandler (event) {
      if (messageTable.extendedBack) {
        removePreviousMessages(true, messageTable)
        messageTable.extendedBack = false
        setScrollBackButtonIcon()
      } else {
        await extendBackwards()
      }
    }

    /// ////////////// Scroll up adding more below

    async function extendForwards () {
      let done = await insertPreviousMessages(false)
      if (done) {
        scrollForwardButton.firstChild.setAttribute('src', UI.icons.iconBase + 'noun_T-Block_1114655_000000.svg')
        scrollForwardButton.disabled = true
        messageTable.final = true
      } else {
        messageTable.extendedForwards = true
      }
      setScrollForwardButtonIcon()
      return done
    }
    function setScrollForwardButtonIcon () {
      let sense = messageTable.extendedForwards ? !newestFirst : newestFirst // noun_T-Block_1114657_000000.svg
      let scrollForwardIcon = messageTable.final ? 'noun_T-Block_1114657_000000.svg'
        : (!sense ? 'noun_1369241.svg' : 'noun_1369237.svg')
      scrollForwardButton.firstChild.setAttribute('src', UI.icons.iconBase + scrollForwardIcon)
    }
    async function scrollForwardButtonHandler (event) {
      if (messageTable.extendedForwards) {
        removePreviousMessages(false, messageTable)
        messageTable.extendedForwards = false
        setScrollForwardButtonIcon()
      } else {
        await extendForwards() // async
        latest.messageTable.scrollIntoView(newestFirst)
      }
    }

    /// ///////////////////////

    var messageTable = dom.createElement('table')

    messageTable.extendBackwards = extendBackwards // Make function available to scroll stuff
    messageTable.extendForwards = extendForwards // Make function available to scroll stuff
    // var messageButton
    messageTable.date = date
    var chatDocument = dateFolder.leafDocumentFromDate(date)
    messageTable.chatDocument = chatDocument

    messageTable.fresh = false
    messageTable.setAttribute('style', 'width: 100%;') // fill that div!

    if (live) {
      messageTable.final = true
      liveMessageTable = messageTable
      latest.messageTable = messageTable
      var tr = newMessageForm(messageTable)
      if (newestFirst) {
        messageTable.insertBefore(tr, messageTable.firstChild) // If newestFirst
      } else {
        messageTable.appendChild(tr) // not newestFirst
      }
      messageTable.inputRow = tr
    }

    /// ///// Infinite scroll
    //
    // @@ listen for swipe past end event not just button
    if (options.infinite) {
      let scrollBackButtonTR = dom.createElement('tr')
      let scrollBackButtonCell = scrollBackButtonTR.appendChild(dom.createElement('td'))
      // up traingles: noun_1369237.svg
      // down triangles: noun_1369241.svg
      let scrollBackIcon = newestFirst ? 'noun_1369241.svg' : 'noun_1369237.svg' // down and up arrows respoctively
      scrollBackButton = UI.widgets.button(dom, UI.icons.iconBase + scrollBackIcon, 'Previous messages ...')
      scrollBackButtonCell.style = 'width:3em; height:3em;'
      scrollBackButton.addEventListener('click', scrollBackButtonHandler, false)
      messageTable.extendedBack = false
      scrollBackButtonCell.appendChild(scrollBackButton)
      setScrollBackButtonIcon()

      let dateCell = scrollBackButtonTR.appendChild(dom.createElement('td'))
      dateCell.style = 'text-align: center; vertical-align: middle; color: #888; font-style: italic;'
      dateCell.textContent = UI.widgets.shortDate(date.toISOString(), true) // no time, only date

      // @@@@@@@@@@@ todo move this button to other end of  message cell, o
      let scrollForwardButtonCell = scrollBackButtonTR.appendChild(dom.createElement('td'))
      let scrollForwardIcon = newestFirst ? 'noun_1369241.svg' : 'noun_1369237.svg' // down and up arrows respoctively
      scrollForwardButton = UI.widgets.button(dom, UI.icons.iconBase + scrollForwardIcon, 'Later messages ...')
      scrollForwardButtonCell.appendChild(scrollForwardButton)
      scrollForwardButtonCell.style = 'width:3em; height:3em;'
      scrollForwardButton.addEventListener('click', scrollForwardButtonHandler, false)
      messageTable.extendedForward = false
      setScrollForwardButtonIcon()

      messageTable.extendedForwards = false

      if (!newestFirst) { // opposite end from the entry field
        messageTable.insertBefore(scrollBackButtonTR, messageTable.firstChild) // If not newestFirst
      } else {
        messageTable.appendChild(scrollBackButtonTR) //  newestFirst
      }
    }

    let sts = kb.statementsMatching(null, WF('message'), null, chatDocument)
    if (!live && sts.length === 0) { // not todays
      // no need buttomns at the moment
      // messageTable.style.visibility = 'collapse' // Hide files with no messages
    }
    sts.forEach(st => {
      addMessage(st.object, messageTable)
    })
    messageTable.fresh = true

    // loadMessageTable(messageTable, chatDocument)
    messageTable.fresh = false
    return messageTable
  } // renderMessageTable

/* Track back through the YYYY/MM/DD tree to find the previous/next day
**
*/
  async function loadPrevious (date, backwards) {
    async function previousPeriod (file, level) {
      function younger (x) {
        if (backwards ? x.uri >= file.uri : x.uri <= file.uri) return false // later than we want or same -- looking for different
        return true
      }
      function suitable (x) {
        let tail = x.uri.slice(0, -1).split('/').slice(-1)[0]
        if (!'0123456789'.includes(tail[0])) return false // not numeric
        return true
        // return kb.anyValue(chatDocument, POSIX('size')) !== 0 // empty file?
      }
      async function lastNonEmpty (siblings) {
        siblings = siblings.filter(suitable)
        siblings.sort() // chronological order
        if (!backwards) siblings.reverse()
        if (level !== 3) return siblings.pop() // only length chck final leverl
        while (siblings.length) {
          let folder = siblings.pop()
          let chatDocument = kb.sym(folder.uri + 'chat.ttl')
          await kb.fetcher.load(chatDocument)
          // files can have seealso links. skip ones with no messages with a date
          if (kb.statementsMatching(null, DCT('created'), null, chatDocument).length > 0) {
            return folder
          }
        }
        return null
      }
      // console.log('  previousPeriod level' + level + ' file ' + file)
      const parent = file.dir()
      await kb.fetcher.load(parent)
      var siblings = kb.each(parent, ns.ldp('contains'))
      siblings = siblings.filter(younger)
      let folder = await lastNonEmpty(siblings)
      if (folder) return folder

      if (level === 0) return null // 3:day, 2:month, 1: year  0: no

      const uncle = await previousPeriod(parent, level - 1)
      if (!uncle) return null // reached first ever
      await kb.fetcher.load(uncle)
      var cousins = kb.each(uncle, ns.ldp('contains'))
      let result = await lastNonEmpty(cousins)
      return result
    } // previousPeriod

    let folder = dateFolder.leafDocumentFromDate(date).dir()
    let found = await previousPeriod(folder, 3)
    if (found) {
      let doc = kb.sym(found.uri + 'chat.ttl')
      return dateFolder.dateFromLeafDocument(doc)
    }
    return null
  }

  async function addNewTableIfNewDay (now) {
    // let now = new Date()
    // @@ Remove listener from previous table as it is now static
    let newChatDocument = dateFolder.leafDocumentFromDate(now)
    if (!newChatDocument.sameTerm(latest.messageTable.chatDocument)) { // It is a new day
      if (liveMessageTable.inputRow) {
        liveMessageTable.removeChild(liveMessageTable.inputRow)
        delete liveMessageTable.inputRow
      }
      var oldChatDocument = latest.messageTable.chatDocument
      await appendCurrentMessages()
      // Adding a link in the document will ping listeners to add the new block too
      if (!kb.holds(oldChatDocument, ns.rdfs('seeAlso'), newChatDocument, oldChatDocument)) {
        let sts = [$rdf.st(oldChatDocument, ns.rdfs('seeAlso'), newChatDocument, oldChatDocument)]
        updater.update([], sts, function (ok, body) {
          if (!ok) {
            alert('Unable to link old message block to new one.' + body)
          }
        })
      }
    }
  }
/*
  function messageCount () {
    var n = 0
    const tables = div.children
    for (let i = 0; i < tables.length; i++) {
      n += tables[i].children.length - 1
      // console.log('    table length:' + tables[i].children.length)
    }
    return n
  }
*/
/* Add the live message block with entry field for today
*/
  async function appendCurrentMessages () {
    var now = new Date()
    var chatDocument = dateFolder.leafDocumentFromDate(now)
    /*   Don't actually make the documemnt until a message is sent
    try {
      await createIfNotExists(chatDocument)
    } catch (e) {
      div.appendChild(UI.widgets.errorMessageBlock(
        dom, 'Problem accessing chat file: ' + e))
      return
    }
    */
    const messageTable = await createMessageTable(now, true)
    div.appendChild(messageTable)
    div.refresh = function () { // only the last messageTable is live
      addNewTableIfNewDay(new Date()).then(() => { syncMessages(chatChannel, messageTable) })
    } // The short chat version fors live update in the pane but we do it in the widget
    kb.updater.addDownstreamChangeListener(chatDocument, div.refresh) // Live update
    liveMessageTable = messageTable
    latest.messageTable = liveMessageTable
    return messageTable
  }

  var liveMessageTable
  var earliest = {messageTable: null}  // Stuff about each end of the loaded days
  var latest = {messageTable: null}

  var lock = false
  async function loadMoreWhereNeeded (event, fixScroll) {
    if (lock) return
    lock = true
    const freeze = !fixScroll
    const magicZone = 150
    // const top = div.scrollTop
    // const bottom = div.scrollHeight - top - div.clientHeight
    var done

    while (div.scrollTop < magicZone &&
        earliest.messageTable &&
        !earliest.messageTable.initial &&
        earliest.messageTable.extendBackwards) {
      let scrollBottom = div.scrollHeight - div.scrollTop
      console.log('infinite scroll: adding above: top ' + div.scrollTop)
      done = await earliest.messageTable.extendBackwards()
      if (freeze) {
        div.scrollTop = div.scrollHeight - scrollBottom
      }
      if (fixScroll) fixScroll()
      if (done) break
    }
    while (options.selectedMessage && // we started in the middle not at the bottom
        div.scrollHeight - div.scrollTop - div.clientHeight < magicZone && // we are scrolled right to the bottom
        latest.messageTable &&
        !latest.messageTable.final && // there is more data to come
        latest.messageTable.extendForwards) {
      let scrollTop = div.scrollTop
      console.log('infinite scroll: adding below: bottom: ' + (div.scrollHeight - div.scrollTop - div.clientHeight))
      done = await latest.messageTable.extendForwards() // then add more data on the bottom
      if (freeze) {
        div.scrollTop = scrollTop // while adding below keep same things in view
      }
      if (fixScroll) fixScroll()
      if (done) break
    }
    lock = false
  }

  async function go () {
    function yank () {
      selectedMessageTable.selectedElement.scrollIntoView({block: 'center'})
    }

    // During initial load ONLY keep scroll to selected thing or bottom
    function fixScroll () {
      if (options.selectedElement) {
        options.selectedElement.scrollIntoView({block: 'center'}) // allign tops or bopttoms
      } else {
        liveMessageTable.inputRow.scrollIntoView(newestFirst) // allign tops or bopttoms
      }
    }

    var live
    if (options.selectedMessage) {
      var selectedDocument = options.selectedMessage.doc()
      var now = new Date()
      var todayDocument = dateFolder.leafDocumentFromDate(now)
      live = todayDocument.sameTerm(selectedDocument)
    }
    if (options.selectedMessage && !live) {
      var selectedDate = dateFolder.dateFromLeafDocument(selectedDocument)
      var selectedMessageTable = await createMessageTable(selectedDate, live)
      div.appendChild(selectedMessageTable)
      earliest.messageTable = selectedMessageTable
      latest.messageTable = selectedMessageTable
      yank()
      setTimeout(yank, 1000) // @@ kludge - restore position distubed by other cHANGES
    } else { // Live end
      await appendCurrentMessages()
      earliest.messageTable = liveMessageTable
      latest.messageTable = liveMessageTable
    }

    await loadMoreWhereNeeded(null, fixScroll)
    div.addEventListener('scroll', loadMoreWhereNeeded)
    if (options.solo) {
      document.body.addEventListener('scroll', loadMoreWhereNeeded)
    }
  }
  go()
  return div
}