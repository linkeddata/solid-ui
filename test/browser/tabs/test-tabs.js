if (!window.UI) {
  window.alert('Please run "npm install && npm run build" in your repo root first.')
}
window.$rdf = UI.rdf

document.addEventListener('DOMContentLoaded', function () {
  /// ///////////////////////////////////////////

  var kb = UI.store
  var dom = document

  var uri = window.location.href
  var base = (window.document.title = uri.slice(0, uri.lastIndexOf('/') + 1))
  var testDocURI = base + 'test.ttl' // imaginary doc - just use its URL
  var testDoc = $rdf.sym(testDocURI)
  // var subject_uri = testDocURI + '#event1'
  // var me_uri = testDocURI + '#a0'
  // var me = kb.sym(me_uri)

  //    var forms_uri = window.document.title = base+ 'forms.ttl';

  // var subject = kb.sym(subject_uri)
  var div = dom.getElementById('UITestArea')

  var showResults = function () {
    var prologue = dom.getElementById('Prologue').textContent

    var tests = dom.getElementById('TestData').children
    var inputText = function (tr) {
      return tr.children[0].children[0].textContent
    }
    var testClass = function (tr) {
      return tr.children[0].getAttribute('class')
    }
    var output = function (tr) {
      return tr.children[1]
    }
    var t = 0
    try {
      $rdf.parse(prologue + inputText(tests[t]), kb, testDocURI, 'text/turtle') // str, kb, base, contentType
    } catch (e) {
      output(tests[t]).textContent = e
    }

    var options = { dom: dom }
    var target

    var createFreshWidget = function () {
      target = kb.the(undefined, UI.ns.rdf('type'), UI.ns.ui('Tabs'))
      options.predicate = kb.the(target, UI.ns.ui('predicate'))
      options.subject = kb.the(target, UI.ns.ui('subject'))
      options.ordered = kb.the(target, UI.ns.ui('ordered')).value === '1'
      options.orientation = kb.the(target, UI.ns.ui('orientation')).value
      options.onClose = function (_event) {} // Test it can make a close button is a good place
      // todo: test both cases
      var tabs = div.appendChild(UI.tabs.tabWidget(options))
      return tabs
    }

    // @@ Give other combos too-- see schedule ontology

    // var dataPointForNT = []
    // var doc = testDoc

    var tabContentCache = []

    options.renderMain = function (container, subject) {
      container.innerHTML = ''
      if (tabContentCache[subject.uri]) {
        container.appendChild(tabContentCache[subject.uri])
        debug.log('  used cached copy for ' + subject.uri)
        return
      }
      var iframe = container.appendChild(dom.createElement('iframe'))
      iframe.setAttribute('src', subject.uri)
      iframe.setAttribute(
        'style',
        'border: 1em solid pink; margin: 2em; padding: 2em; padding-color: green;'
      )
      tabContentCache[subject.uri] = iframe
    }

    var tabs = div.appendChild(createFreshWidget())

    var agenda = []

    var nextTest = function nextTest () {
      // First take a copy of the DOM the klast test produced
      output(tests[t]).appendChild(tabs.cloneNode(true))

      t += 1
      var test = tests[t]
      if (!test) return
      // var tClass =
      kb.removeMany(undefined, undefined, undefined, testDoc) // Flush out previous test data
      try {
        $rdf.parse(
          prologue + inputText(tests[t]),
          kb,
          testDocURI,
          'text/turtle'
        )
      } catch (e) {
        output(test).textContent = e
      }
      if (testClass(test) === 'restart') {
        div.removeChild(tabs)
        tabs = div.appendChild(createFreshWidget())
      } else {
        tabs.refresh()
      }

      setTimeout(nextTest, 2000)
    }

    agenda.push(nextTest)

    setTimeout(function () {
      agenda.shift()()
    }, 2000)
  } // showResults

  showResults()
})
