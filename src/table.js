// Table Widget: Format an array of RDF statements as an HTML table.
//
// This can operate in one of three modes: when the class of object is given
// or when the source document from whuch data is taken is given,
// or if a prepared query object is given.
// (In principle it could operate with neither class nor document
// given but typically
// there would be too much data.)
// When the tableClass is not given, it looks for common  classes in the data,
// and gives the user the option.
//
// 2008 Written, Ilaria Liccardi  as the tableViewPane.js
// 2014 Core table widget moved into common/table.js - timbl
//

import * as debug from './debug'

var UI = {
  icons: require('./iconBase'),
  log: require('./log'),
  ns: require('./ns'),
  store: require('./store'),
  widgets: require('./widgets')
}

const utils = require('./utils')
const $rdf = require('rdflib')

// UI.widgets.renderTableViewPane
module.exports = function renderTableViewPane (doc, options) {
  var sourceDocument = options.sourceDocument
  var tableClass = options.tableClass
  var givenQuery = options.query

  var RDFS_LITERAL = 'http://www.w3.org/2000/01/rdf-schema#Literal'
  var ns = UI.ns
  var kb = UI.store
  var rowsLookup = {} //  Persistent mapping of subject URI to dom TR

  // Predicates that are never made into columns:

  var FORBIDDEN_COLUMNS = {
    'http://www.w3.org/2002/07/owl#sameAs': true,
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': true
  }

  // Number types defined in the XML schema:

  var XSD_NUMBER_TYPES = {
    'http://www.w3.org/2001/XMLSchema#decimal': true,
    'http://www.w3.org/2001/XMLSchema#float': true,
    'http://www.w3.org/2001/XMLSchema#double': true,
    'http://www.w3.org/2001/XMLSchema#integer': true,
    'http://www.w3.org/2001/XMLSchema#nonNegativeInteger': true,
    'http://www.w3.org/2001/XMLSchema#positiveInteger': true,
    'http://www.w3.org/2001/XMLSchema#nonPositiveInteger': true,
    'http://www.w3.org/2001/XMLSchema#negativeInteger': true,
    'http://www.w3.org/2001/XMLSchema#long': true,
    'http://www.w3.org/2001/XMLSchema#int': true,
    'http://www.w3.org/2001/XMLSchema#short': true,
    'http://www.w3.org/2001/XMLSchema#byte': true,
    'http://www.w3.org/2001/XMLSchema#unsignedLong': true,
    'http://www.w3.org/2001/XMLSchema#unsignedInt': true,
    'http://www.w3.org/2001/XMLSchema#unsignedShort': true,
    'http://www.w3.org/2001/XMLSchema#unsignedByte': true
  }

  var XSD_DATE_TYPES = {
    'http://www.w3.org/2001/XMLSchema#dateTime': true,
    'http://www.w3.org/2001/XMLSchema#date': true
  }

  // Classes that indicate an image:

  var IMAGE_TYPES = {
    'http://xmlns.com/foaf/0.1/Image': true,
    'http://purl.org/dc/terms/Image': true
  }

  // Name of the column used as a "key" value to look up the row.
  // This is necessary because in the normal view, the columns are
  // all "optional" values, meaning that we will get a result set
  // for every individual value that is found.  The row key acts
  // as an anchor that can be used to combine this information
  // back into the same row.

  var keyVariable = options.keyVariable || '?_row'

  var subjectIdCounter = 0
  var allType, types
  var typeSelectorDiv, addColumnDiv

  // The last SPARQL query used:
  var lastQuery = null
  var mostCommonType = null

  var resultDiv = doc.createElement('div')
  resultDiv.className = 'tableViewPane'

  resultDiv.appendChild(generateControlBar()) // sets typeSelectorDiv

  var tableDiv = doc.createElement('div')
  resultDiv.appendChild(tableDiv)

  // Save a refresh function for use by caller
  resultDiv.refresh = function () {
    runQuery(table.query, table.logicalRows, table.columns, table)
    // updateTable(givenQuery, mostCommonType) // This could be a lot more incremental and efficient
  }

  // A specifically asked-for query
  if (givenQuery) {
    var table = renderTableForQuery(givenQuery)
    // lastQuery = givenQuery
    tableDiv.appendChild(table)
  } else {
    // Find the most common type and select it by default

    var s = calculateTable()
    allType = s[0]
    types = s[1]
    if (!tableClass) {
      typeSelectorDiv.appendChild(generateTypeSelector(allType, types))
    }

    mostCommonType = getMostCommonType(types)

    if (mostCommonType) {
      buildFilteredTable(mostCommonType)
    } else {
      buildFilteredTable(allType)
    }
  }
  return resultDiv

  // /////////////////////////////////////////////////////////////////
  /*
  function closeDialog (dialog) {
    dialog.parentNode.removeChild(dialog)
  }

  function createActionButton (label, callback) {
    var button = doc.createElement('input')
    button.setAttribute('type', 'submit')
    button.setAttribute('value', label)
    button.addEventListener('click', callback, false)
    return button
  }
// @@ Tdo:  put these  buttonsback in,
// to allow user to see and edit and save the sparql query for the table they are looking at
//

  function createSparqlWindow () {
    var dialog = doc.createElement('div')

    dialog.setAttribute('class', 'sparqlDialog')

    var title = doc.createElement('h3')
    title.appendChild(doc.createTextNode('Edit SPARQL query'))

    var inputbox = doc.createElement('textarea')
    inputbox.value = $rdf.queryToSPARQL(lastQuery)

    dialog.appendChild(title)
    dialog.appendChild(inputbox)

    dialog.appendChild(createActionButton('Query', function () {
      var query = $rdf.SPARQLToQuery(inputbox.value)
      updateTable(query)
      closeDialog(dialog)
    }))

    dialog.appendChild(createActionButton('Close', function () {
      closeDialog(dialog)
    }))

    return dialog
  }

  function sparqlButtonPressed () {
    var dialog = createSparqlWindow()

    resultDiv.appendChild(dialog)
  }

  function generateSparqlButton () {
    var image = doc.createElement('img')
    image.setAttribute('class', 'sparqlButton')
    image.setAttribute('src', UI.iconBase + 'icons/1pt5a.gif')
    image.setAttribute('alt', 'Edit SPARQL query')

    image.addEventListener('click', sparqlButtonPressed, false)

    return image
  }
*/
  // Generate the control bar displayed at the top of the screen.

  function generateControlBar () {
    var result = doc.createElement('table')
    result.setAttribute('class', 'toolbar')

    var tr = doc.createElement('tr')

    /*             @@    Add in later -- not debugged yet
            var sparqlButtonDiv = doc.createElement("td")
            sparqlButtonDiv.appendChild(generateSparqlButton())
            tr.appendChild(sparqlButtonDiv)
    */
    typeSelectorDiv = doc.createElement('td')
    tr.appendChild(typeSelectorDiv)

    addColumnDiv = doc.createElement('td')
    tr.appendChild(addColumnDiv)

    result.appendChild(tr)

    return result
  }

  // Add the SELECT details to the query being built.

  function addSelectToQuery (query, type) {
    var selectedColumns = type.getColumns()

    for (let i = 0; i < selectedColumns.length; ++i) {
      // TODO: autogenerate nicer names for variables
      // variables have to be unambiguous

      var variable = kb.variable('_col' + i)

      query.vars.push(variable)
      selectedColumns[i].setVariable(variable)
    }
  }

  // Add WHERE details to the query being built.

  function addWhereToQuery (query, rowVar, type) {
    var queryType = type.type

    if (!queryType) {
      queryType = kb.variable('_any')
    }

    // _row a type
    query.pat.add(rowVar, UI.ns.rdf('type'), queryType)
  }

  // Generate OPTIONAL column selectors.

  function addColumnsToQuery (query, rowVar, type) {
    var selectedColumns = type.getColumns()

    for (let i = 0; i < selectedColumns.length; ++i) {
      var column = selectedColumns[i]

      var formula = kb.formula()

      formula.add(rowVar, column.predicate, column.getVariable())

      query.pat.optional.push(formula)
    }
  }

  // Generate a query object from the currently-selected type
  // object.

  function generateQuery (type) {
    var query = new $rdf.Query()
    var rowVar = kb.variable(keyVariable.slice(1)) // don't pass '?'

    addSelectToQuery(query, type)
    addWhereToQuery(query, rowVar, type)
    addColumnsToQuery(query, rowVar, type)

    return query
  }

  // Build the contents of the tableDiv element, filtered according
  // to the specified type.

  function buildFilteredTable (type) {
    // Generate "add column" cell.

    clearElement(addColumnDiv)
    addColumnDiv.appendChild(generateColumnAddDropdown(type))

    var query = generateQuery(type)

    updateTable(query, type)
  }

  function updateTable (query, type) {
    // Stop the previous query from doing any updates.

    if (lastQuery) {
      lastQuery.running = false
    }

    // Render the HTML table.

    var htmlTable = renderTableForQuery(query, type)

    // Clear the tableDiv element, and replace with the new table.

    clearElement(tableDiv)
    tableDiv.appendChild(htmlTable)

    // Save the query for the edit dialog.

    lastQuery = query
  }

  // Remove all subelements of the specified element.

  function clearElement (element) {
    while (element.childNodes.length > 0) {
      element.removeChild(element.childNodes[0])
    }
  }

  // A SubjectType is created for each rdf:type discovered.

  function SubjectType (type) {
    this.type = type
    this.columns = null
    this.allColumns = null
    this.useCount = 0

    // Get a list of all columns used by this type.

    this.getAllColumns = function () {
      return this.allColumns
    }

    // Get a list of the current columns used by this type
    // (subset of allColumns)

    this.getColumns = function () {
      // The first time through, get a list of all the columns
      // and select only the six most popular columns.

      if (!this.columns) {
        var allColumns = this.getAllColumns()
        this.columns = allColumns.slice(0, 7)
      }

      return this.columns
    }

    // Get a list of unused columns

    this.getUnusedColumns = function () {
      var allColumns = this.getAllColumns()
      var columns = this.getColumns()

      var result = []

      for (let i = 0; i < allColumns.length; ++i) {
        if (columns.indexOf(allColumns[i]) === -1) {
          result.push(allColumns[i])
        }
      }

      return result
    }

    this.addColumn = function (column) {
      this.columns.push(column)
    }

    this.removeColumn = function (column) {
      this.columns = this.columns.filter(function (x) {
        return x !== column
      })
    }

    this.getLabel = function () {
      return utils.label(this.type)
    }

    this.addUse = function () {
      this.useCount += 1
    }
  }

  // Class representing a column in the table.

  function Column () {
    this.useCount = 0

    // Have we checked any values for this column yet?

    this.checkedAnyValues = false

    // If the range is unknown, but we just get literals in this
    // column, then we can generate a literal selector.

    this.possiblyLiteral = true

    // If the range is unknown, but we just get literals and they
    // match the regular expression for numbers, we can generate
    // a number selector.

    this.possiblyNumber = true

    // We accumulate classes which things in the column must be a member of

    this.constraints = []

    // Check values as they are read.  If we don't know what the
    // range is, we might be able to infer that it is a literal
    // if all of the values are literals.  Similarly, we might
    // be able to determine if the literal values are actually
    // numbers (using regexps).

    this.checkValue = function (term) {
      var termType = term.termType
      if (
        this.possiblyLiteral &&
        termType !== 'Literal' &&
        termType !== 'NamedNode'
      ) {
        this.possiblyNumber = false
        this.possiblyLiteral = false
      } else if (this.possiblyNumber) {
        if (termType !== 'Literal') {
          this.possiblyNumber = false
        } else {
          var literalValue = term.value

          if (!literalValue.match(/^-?\d+(\.\d*)?$/)) {
            this.possiblyNumber = false
          }
        }
      }

      this.checkedAnyValues = true
    }

    this.getVariable = function () {
      return this.variable
    }

    this.setVariable = function (variable) {
      this.variable = variable
    }

    this.getKey = function () {
      return this.variable.toString()
    }

    this.addUse = function () {
      this.useCount += 1
    }

    this.getLabel = function () {
      if (this.predicate) {
        if (this.predicate.sameTerm(ns.rdf('type')) && this.superClass) {
          return utils.label(this.superClass)
        }
        return utils.label(this.predicate)
      } else if (this.variable) {
        return this.variable.toString()
      } else {
        return 'unlabeled column?'
      }
    }

    this.setPredicate = function (predicate, inverse, other) {
      if (inverse) {
        // variable is in the subject pos
        this.inverse = predicate
        this.constraints = this.constraints.concat(
          kb.each(predicate, UI.ns.rdfs('domain'))
        )
        if (
          predicate.sameTerm(ns.rdfs('subClassOf')) &&
          other.termType === 'NamedNode'
        ) {
          this.superClass = other
          this.alternatives = kb.each(undefined, ns.rdfs('subClassOf'), other)
        }
      } else {
        // variable is the object
        this.predicate = predicate
        this.constraints = this.constraints.concat(
          kb.each(predicate, UI.ns.rdfs('range'))
        )
      }
    }

    this.getConstraints = function () {
      return this.constraints
    }

    this.filterFunction = function () {
      return true
    }

    this.sortKey = function () {
      return this.getLabel().toLowerCase()
    }

    this.isImageColumn = function () {
      for (let i = 0; i < this.constraints.length; i++) {
        if (this.constraints[i].uri in IMAGE_TYPES) return true
      }
      return false
    }
  }

  // Convert an object to an array.

  function objectToArray (obj, filter) {
    var result = []

    for (const property in obj) {
      // @@@ have to guard against methods
      var value = obj[property]

      if (!filter || filter(property, value)) {
        result.push(value)
      }
    }

    return result
  }

  // Generate an <option> in a drop-down list.

  function optionElement (label, value) {
    var result = doc.createElement('option')

    result.setAttribute('value', value)
    result.appendChild(doc.createTextNode(label))

    return result
  }

  // Generate drop-down list box for choosing type of data displayed

  function generateTypeSelector (allType, types) {
    var resultDiv = doc.createElement('div')

    resultDiv.appendChild(doc.createTextNode('Select type: '))

    var dropdown = doc.createElement('select')

    dropdown.appendChild(optionElement('All types', 'null'))

    for (const uri in types) {
      dropdown.appendChild(optionElement(types[uri].getLabel(), uri))
    }

    dropdown.addEventListener(
      'click',
      function () {
        var type

        if (dropdown.value === 'null') {
          type = allType
        } else {
          type = types[dropdown.value]
        }

        typeSelectorChanged(type)
      },
      false
    )

    resultDiv.appendChild(dropdown)

    return resultDiv
  }

  // Callback invoked when the type selector drop-down list is changed.

  function typeSelectorChanged (selectedType) {
    buildFilteredTable(selectedType)
  }

  // Build drop-down list to add a new column

  function generateColumnAddDropdown (type) {
    var resultDiv = doc.createElement('div')

    var unusedColumns = type.getUnusedColumns()

    unusedColumns.sort(function (a, b) {
      var aLabel = a.sortKey()
      var bLabel = b.sortKey()
      return (aLabel > bLabel) - (aLabel < bLabel)
    })

    // If there are no unused columns, the div is empty.

    if (unusedColumns.length > 0) {
      resultDiv.appendChild(doc.createTextNode('Add column: '))

      // Build dropdown list of unused columns.

      var dropdown = doc.createElement('select')

      dropdown.appendChild(optionElement('', '-1'))

      for (let i = 0; i < unusedColumns.length; ++i) {
        var column = unusedColumns[i]
        dropdown.appendChild(optionElement(column.getLabel(), '' + i))
      }

      resultDiv.appendChild(dropdown)

      // Invoke callback when the dropdown is changed, to add
      // the column and reload the table.

      dropdown.addEventListener(
        'click',
        function () {
          var columnIndex = Number(dropdown.value)

          if (columnIndex >= 0) {
            type.addColumn(unusedColumns[columnIndex])
            buildFilteredTable(type)
          }
        },
        false
      )
    }

    return resultDiv
  }

  // Find the column for a given predicate, creating a new column object
  // if necessary.

  function getColumnForPredicate (columns, predicate) {
    var column

    if (predicate.uri in columns) {
      column = columns[predicate.uri]
    } else {
      column = new Column()
      column.setPredicate(predicate)
      columns[predicate.uri] = column
    }

    return column
  }

  // Find a type by its URI, creating a new SubjectType object if
  // necessary.

  function getTypeForObject (types, type) {
    var subjectType

    if (type.uri in types) {
      subjectType = types[type.uri]
    } else {
      subjectType = new SubjectType(type)
      types[type.uri] = subjectType
    }

    return subjectType
  }

  // Discover types and subjects for search.

  function discoverTypes () {
    // rdf:type properties of subjects, indexed by URI for the type.

    var types = {}

    // Get a list of statements that match:  ? rdfs:type ?
    // From this we can get a list of subjects and types.

    var subjectList = kb.statementsMatching(
      undefined,
      UI.ns.rdf('type'),
      tableClass, // can be undefined OR
      sourceDocument
    ) // can be undefined

    // Subjects for later lookup.  This is a mapping of type URIs to
    // lists of subjects (it is necessary to record the type of
    // a subject).

    var subjects = {}

    for (let i = 0; i < subjectList.length; ++i) {
      var type = subjectList[i].object

      if (type.termType !== 'NamedNode') {
        // @@ no bnodes?
        continue
      }

      var typeObj = getTypeForObject(types, type)

      if (!(type.uri in subjects)) {
        subjects[type.uri] = []
      }

      subjects[type.uri].push(subjectList[i].subject)
      typeObj.addUse()
    }

    return [subjects, types]
  }

  // Get columns for the given subject.

  function getSubjectProperties (subject, columns) {
    // Get a list of properties of this subject.

    var properties = kb.statementsMatching(
      subject,
      undefined,
      undefined,
      sourceDocument
    )

    var result = {}

    for (let j = 0; j < properties.length; ++j) {
      var predicate = properties[j].predicate

      if (predicate.uri in FORBIDDEN_COLUMNS) {
        continue
      }

      // Find/create a column for this predicate.

      var column = getColumnForPredicate(columns, predicate)
      column.checkValue(properties[j].object)

      result[predicate.uri] = column
    }

    return result
  }

  // Identify the columns associated with a type.

  function identifyColumnsForType (type, subjects) {
    var allColumns = {}

    // Process each subject of this type to build up the
    // column list.

    for (let i = 0; i < subjects.length; ++i) {
      var columns = getSubjectProperties(subjects[i], allColumns)

      for (const predicateUri in columns) {
        var column = columns[predicateUri]

        column.addUse()
      }
    }

    // Generate the columns list

    var allColumnsList = objectToArray(allColumns)
    sortColumns(allColumnsList)
    type.allColumns = allColumnsList
  }

  // Build table information from parsing RDF statements.

  function calculateTable () {
    // Find the types that we will display in the dropdown
    // list box, and associated objects of those types.

    var subjects, types

    var s = discoverTypes()
    subjects = s[0]
    types = s[1] // no [ ] on LHS

    for (const typeUrl in subjects) {
      var subjectList = subjects[typeUrl]
      var type = types[typeUrl]

      identifyColumnsForType(type, subjectList)
    }

    // TODO: Special type that captures all rows.
    // Combine columns from all types

    var allType = new SubjectType(null)

    return [allType, objectToArray(types)]
  }

  // Sort the list of columns by the most common columns.

  function sortColumns (columns) {
    function sortFunction (a, b) {
      return (a.useCount < b.useCount) - (a.useCount > b.useCount)
    }

    columns.sort(sortFunction)
  }

  // Create the delete button for a column.

  function renderColumnDeleteButton (type, column) {
    var button = doc.createElement('a')

    button.appendChild(doc.createTextNode('[x]'))

    button.addEventListener(
      'click',
      function () {
        type.removeColumn(column)
        buildFilteredTable(type)
      },
      false
    )

    return button
  }

  // Render the table header for the HTML table.

  function renderTableHeader (columns, type) {
    var tr = doc.createElement('tr')

    /* Empty header for link column */
    var linkTd = doc.createElement('th')
    tr.appendChild(linkTd)

    /*
    var labelTd = doc.createElement("th")
    labelTd.appendChild(doc.createTextNode("*label*"))
    tr.appendChild(labelTd)
    */

    for (let i = 0; i < columns.length; ++i) {
      var th = doc.createElement('th')
      var column = columns[i]

      th.appendChild(doc.createTextNode(column.getLabel()))

      // We can only add a delete button if we are using the
      // proper interface and have a type to delete from:
      if (type) {
        th.appendChild(renderColumnDeleteButton(type, column))
      }

      tr.appendChild(th)
    }

    return tr
  }

  // Sort the rows in the rendered table by data from a specific
  // column, using the provided sort function to compare values.

  function applyColumnSort (rows, column, sortFunction, reverse) {
    var columnKey = column.getKey()

    // Sort the rows array.
    rows.sort(function (row1, row2) {
      var row1Value = null
      var row2Value = null

      if (columnKey in row1.values) {
        row1Value = row1.values[columnKey][0]
      }
      if (columnKey in row2.values) {
        row2Value = row2.values[columnKey][0]
      }

      var result = sortFunction(row1Value, row2Value)

      if (reverse) {
        return -result
      } else {
        return result
      }
    })

    // Remove all rows from the table:

    if (rows.length) {
      var parentTable = rows[0]._htmlRow.parentNode

      for (let i = 0; i < rows.length; ++i) {
        parentTable.removeChild(rows[i]._htmlRow)
      }

      // Add back the rows in the new sorted order:

      for (let i = 0; i < rows.length; ++i) {
        parentTable.appendChild(rows[i]._htmlRow)
      }
    }
  }

  // Filter the list of rows based on the selectors for the
  // columns.

  function applyColumnFiltersToRow (row, columns) {
    var rowDisplayed = true

    // Check the filter functions for every column.
    // The row should only be displayed if the filter functions
    // for all of the columns return true.

    for (let c = 0; c < columns.length; ++c) {
      var column = columns[c]
      var columnKey = column.getKey()

      var columnValue = null

      if (columnKey in row.values) {
        columnValue = row.values[columnKey][0]
      }

      if (!column.filterFunction(columnValue)) {
        rowDisplayed = false
        break
      }
    }

    // Show or hide the HTML row according to the result
    // from the filter function.

    var htmlRow = row._htmlRow

    if (rowDisplayed) {
      htmlRow.style.display = ''
    } else {
      htmlRow.style.display = 'none'
    }
  }

  // Filter the list of rows based on the selectors for the
  // columns.

  function applyColumnFilters (rows, columns) {
    // Apply filterFunction to each row.

    for (let r = 0; r < rows.length; ++r) {
      var row = rows[r]
      applyColumnFiltersToRow(row, columns)
    }
  }

  // /////////////////////////////////// Literal column handling

  // Sort by literal value

  function literalSort (rows, column, reverse) {
    function literalToString (colValue) {
      if (colValue) {
        if (colValue.termType === 'Literal') {
          return colValue.value.toLowerCase()
        } else if (colValue.termType === 'NamedNode') {
          return utils.label(colValue).toLowerCase()
        }
        return colValue.value.toLowerCase()
      } else {
        return ''
      }
    }

    function literalCompare (value1, value2) {
      var strValue1 = literalToString(value1)
      var strValue2 = literalToString(value2)

      if (strValue1 < strValue2) {
        return -1
      } else if (strValue1 > strValue2) {
        return 1
      } else {
        return 0
      }
    }

    applyColumnSort(rows, column, literalCompare, reverse)
  }

  // Generates a selector for an RDF literal column.

  function renderLiteralSelector (rows, columns, column) {
    var result = doc.createElement('div')

    var textBox = doc.createElement('input')
    textBox.setAttribute('type', 'text')
    textBox.style.width = '70%'

    result.appendChild(textBox)

    var sort1 = doc.createElement('span')
    sort1.appendChild(doc.createTextNode('\u25BC'))
    sort1.addEventListener(
      'click',
      function () {
        literalSort(rows, column, false)
      },
      false
    )
    result.appendChild(sort1)

    var sort2 = doc.createElement('span')
    sort2.appendChild(doc.createTextNode('\u25B2'))
    sort2.addEventListener(
      'click',
      function () {
        literalSort(rows, column, true)
      },
      false
    )
    result.appendChild(sort2)

    var substring = null

    // Filter the table to show only rows that have a particular
    // substring in the specified column.

    column.filterFunction = function (colValue) {
      if (!substring) {
        return true
      } else if (!colValue) {
        return false
      } else {
        var literalValue

        if (colValue.termType === 'Literal') {
          literalValue = colValue.value
        } else if (colValue.termType === 'NamedNode') {
          literalValue = utils.label(colValue)
        } else {
          literalValue = ''
        }

        return literalValue.toLowerCase().indexOf(substring) >= 0
      }
    }

    textBox.addEventListener(
      'keyup',
      function () {
        if (textBox.value !== '') {
          substring = textBox.value.toLowerCase()
        } else {
          substring = null
        }

        applyColumnFilters(rows, columns)
      },
      false
    )

    return result
  }

  // ///////////////////////////////////  Enumeration

  // Generates a dropdown selector for enumeration types include
  //
  //  @param rows,
  //  @param columns, the mapping of predictae URIs to columns
  //  @param column,
  //  @param list,    List of alternative terms
  //
  function renderEnumSelector (rows, columns, column, list) {
    var doMultiple = true
    var result = doc.createElement('div')
    var dropdown = doc.createElement('select')

    var searchValue = {} // Defualt to all enabled
    for (let i = 0; i < list.length; ++i) {
      var value = list[i]
      searchValue[value.uri] = true
    }

    var initialSelection = getHints(column).initialSelection
    if (initialSelection) searchValue = initialSelection

    if (doMultiple) dropdown.setAttribute('multiple', 'true')
    else dropdown.appendChild(optionElement('(All)', '-1'))

    for (let i = 0; i < list.length; ++i) {
      const value = list[i]
      const ele = optionElement(utils.label(value), i)
      if (searchValue[value.uri]) ele.selected = true
      dropdown.appendChild(ele)
    }
    result.appendChild(dropdown)

    // Select based on an enum value.

    column.filterFunction = function (colValue) {
      return !searchValue || (colValue && searchValue[colValue.uri])
    }

    dropdown.addEventListener(
      'click',
      function () {
        if (doMultiple) {
          searchValue = {}
          const opt = dropdown.options
          for (let i = 0; i < opt.length; i++) {
            const option = opt[i]
            const index = Number(option.value)
            if (opt[i].selected) searchValue[list[index].uri] = true
          }
        } else {
          const index = Number(dropdown.value) // adjusted in Standard tweaks 2018-01
          if (index < 0) {
            searchValue = null
          } else {
            searchValue = {}
            searchValue[list[index].uri] = true
          }
        }
        applyColumnFilters(rows, columns)
      },
      true
    )

    return result
  }

  // //////////////////////////////////// Numeric
  //
  // Selector for XSD number types.

  function renderNumberSelector (rows, columns, column) {
    var result = doc.createElement('div')

    var minSelector = doc.createElement('input')
    minSelector.setAttribute('type', 'text')
    minSelector.style.width = '40px'
    result.appendChild(minSelector)

    var maxSelector = doc.createElement('input')
    maxSelector.setAttribute('type', 'text')
    maxSelector.style.width = '40px'
    result.appendChild(maxSelector)

    // Select based on minimum/maximum limits.

    var min = null
    var max = null

    column.filterFunction = function (colValue) {
      if (colValue) {
        colValue = Number(colValue)
      }

      if (min && (!colValue || colValue < min)) {
        return false
      }
      if (max && (!colValue || colValue > max)) {
        return false
      }

      return true
    }

    // When the values in the boxes are changed, update the
    // displayed columns.

    function eventListener () {
      if (minSelector.value === '') {
        min = null
      } else {
        min = Number(minSelector.value)
      }

      if (maxSelector.value === '') {
        max = null
      } else {
        max = Number(maxSelector.value)
      }

      applyColumnFilters(rows, columns)
    }

    minSelector.addEventListener('keyup', eventListener, false)
    maxSelector.addEventListener('keyup', eventListener, false)

    return result
  }

  // /////////////////////////////////////////////////////////////////

  // Fallback attempts at generating a selector if other attempts fail.

  function fallbackRenderTableSelector (rows, columns, column) {
    // Have all values matched as numbers?

    if (column.checkedAnyValues && column.possiblyNumber) {
      return renderNumberSelector(rows, columns, column)
    }

    // Have all values been literals?

    if (column.possiblyLiteral) {
      return renderLiteralSelector(rows, columns, column)
    }

    return null
  }

  // Render a selector for a given row.

  function renderTableSelector (rows, columns, column) {
    // What type of data is in this column?  Check the constraints for
    // this predicate.

    // If this is a class which can be one of various sibling classes?
    if (column.superClass && column.alternatives.length > 0) {
      return renderEnumSelector(rows, columns, column, column.alternatives)
    }

    var cs = column.getConstraints()
    var range
    for (let i = 0; i < cs.length; i++) {
      range = cs[i]

      // Is this a number type?
      // Alternatively, is this an rdf:Literal type where all of
      // the values match as numbers?

      if (
        (column.checkedAnyValues && column.possiblyNumber) ||
        range.uri in XSD_NUMBER_TYPES
      ) {
        return renderNumberSelector(rows, columns, column)
      }

      // rdf:Literal?  Assume a string at this point

      if (range.uri === RDFS_LITERAL) {
        return renderLiteralSelector(rows, columns, column)
      }

      // Is this an enumeration type?

      // Also  ToDo: @@@ Handle membership of classes whcih are disjointUnions

      var choices = kb.each(range, UI.ns.owl('oneOf'))
      if (choices.length > 0) {
        return renderEnumSelector(rows, columns, column, choices.elements)
      }
    }
    return fallbackRenderTableSelector(rows, columns, column)
  }

  // Generate the search selectors for the table columns.

  function renderTableSelectors (rows, columns) {
    var tr = doc.createElement('tr')
    tr.className = 'selectors'

    // Empty link column

    tr.appendChild(doc.createElement('td'))

    // Generate selectors.

    for (let i = 0; i < columns.length; ++i) {
      var td = doc.createElement('td')

      var selector = renderTableSelector(rows, columns, columns[i])

      if (selector) {
        td.appendChild(selector)
      }
      /*
                  // Useful debug: display URI of predicate in column header
                  if (columns[i].predicate.uri) {
                      td.appendChild(document.createTextNode(columns[i].predicate.uri))
                  }
      */
      tr.appendChild(td)
    }

    return tr
  }

  function linkTo (uri, linkText, hints) {
    hints = hints || {}
    var result = doc.createElement('a')
    var linkFunction = hints.linkFunction
    result.setAttribute('href', uri)
    result.appendChild(doc.createTextNode(linkText))
    if (!linkFunction) {
      result.addEventListener('click', UI.widgets.openHrefInOutlineMode, true)
    } else {
      result.addEventListener(
        'click',
        function (e) {
          e.preventDefault()
          e.stopPropagation()
          var target = utils.getTarget(e)
          var uri = target.getAttribute('href')
          if (!uri) debug.log('No href found \n')
          linkFunction(uri)
        },
        true
      )
    }
    return result
  }

  function linkToObject (obj, hints) {
    var match = false

    if (obj.uri) {
      match = obj.uri.match(/^mailto:(.*)/)
    }

    if (match) {
      return linkTo(obj.uri, match[1], hints)
    } else {
      return linkTo(obj.uri, utils.label(obj), hints)
    }
  }

  // Render an image

  function renderImage (obj) {
    var result = doc.createElement('img')
    result.setAttribute('src', obj.uri)

    // Set the height, so it appears as a thumbnail.
    result.style.height = '40px'
    return result
  }

  // Render an individual RDF object to an HTML object displayed
  // in a table cell.

  function getHints (column) {
    if (
      options &&
      options.hints &&
      column.variable &&
      options.hints[column.variable.toNT()]
    ) {
      return options.hints[column.variable.toNT()]
    }
    return {}
  }

  function renderValue (obj, column) {
    // hint
    var hints = getHints(column)
    var cellFormat = hints.cellFormat
    if (cellFormat) {
      switch (cellFormat) {
        case 'shortDate':
          return doc.createTextNode(UI.widgets.shortDate(obj.value))
        // break
        default:
        // drop through
      }
    } else {
      if (obj.termType === 'Literal') {
        if (obj.datatype) {
          if (XSD_DATE_TYPES[obj.datatype.uri]) {
            return doc.createTextNode(UI.widgets.shortDate(obj.value))
          } else if (XSD_NUMBER_TYPES[obj.datatype.uri]) {
            const span = doc.createElement('span')
            span.textContent = obj.value
            span.setAttribute('style', 'text-align: right')
            return span
          }
        }
        return doc.createTextNode(obj.value)
      } else if (obj.termType === 'NamedNode' && column.isImageColumn()) {
        return renderImage(obj)
      } else if (obj.termType === 'NamedNode' || obj.termType === 'BlankNode') {
        return linkToObject(obj, hints)
      } else if (obj.termType === 'Collection') {
        const span = doc.createElement('span')
        span.appendChild(doc.createTextNode('['))
        obj.elements.map(function (x) {
          span.appendChild(renderValue(x, column))
          span.appendChild(doc.createTextNode(', '))
        })
        span.removeChild(span.lastChild)
        span.appendChild(doc.createTextNode(']'))
        return span
      } else {
        return doc.createTextNode("unknown termtype '" + obj.termType + "'!")
      }
    }
  }

  // Render a row of the HTML table, from the given row structure.
  // Note that unlike other functions, this renders into a provided
  // row (<tr>) element.

  function renderTableRowInto (tr, row, columns, _downstream) {
    /* Link column, for linking to this subject. */

    var linkTd = doc.createElement('td')

    if (row._subject && 'uri' in row._subject) {
      linkTd.appendChild(linkTo(row._subject.uri, '\u2192'))
    }

    tr.appendChild(linkTd)

    // Create a <td> for each column (whether the row has data for that
    // column or not).

    for (let i = 0; i < columns.length; ++i) {
      var column = columns[i]
      var td = doc.createElement('td')
      var orig

      var columnKey = column.getKey()

      if (columnKey in row.values) {
        var objects = row.values[columnKey]
        var different = false
        if (row.originalValues && row.originalValues[columnKey]) {
          if (objects.length !== row.originalValues[columnKey].length) {
            different = true
          }
        }
        for (let j = 0; j < objects.length; ++j) {
          var obj = objects[j]
          if (
            row.originalValues &&
            row.originalValues[columnKey] &&
            row.originalValues[columnKey].length > j
          ) {
            orig = row.originalValues[columnKey][j]
            if (obj.toString() !== orig.toString()) {
              different = true
            }
          }
          td.appendChild(renderValue(obj, column))

          if (j !== objects.length - 1) {
            td.appendChild(doc.createTextNode(',\n'))
          }
          if (different) {
            td.style.background = '#efe' // green = new changed
          }
        }
      }

      tr.appendChild(td)
    }

    // Save a reference to the HTML row in the row object.

    row._htmlRow = tr

    return tr
  }

  // Check if a value is already stored in the list of values for
  // a cell (the query can sometimes find it multiple times)

  function valueInList (value, list) {
    var key = null

    if (value.termType === 'Literal') {
      key = 'value'
    } else if (value.termType === 'NamedNode') {
      key = 'uri'
    } else {
      return list.indexOf(value) >= 0
    }

    // Check the list and compare keys:

    var i

    for (i = 0; i < list.length; ++i) {
      if (list[i].termType === value.termType && list[i][key] === value[key]) {
        return true
      }
    }

    // Not found?

    return false
  }

  // Update a row, add new values, and regenerate the HTML element
  // containing the values.

  function updateRow (row, columns, values) {
    var key
    var needUpdate = false

    for (key in values) {
      var value = values[key]

      // If this key is not already in the row, create a new entry
      // for it:

      if (!(key in row.values)) {
        row.values[key] = []
      }

      // Possibly add this new value to the list, but don't
      // add it if we have already added it:

      if (!valueInList(value, row.values[key])) {
        row.values[key].push(value)
        needUpdate = true
      }
    }

    // Regenerate the HTML row?

    if (needUpdate) {
      clearElement(row._htmlRow)
      renderTableRowInto(row._htmlRow, row, columns)
    }
    applyColumnFiltersToRow(row, columns) // Hide immediately if nec
  }

  // Get a unique ID for the given subject.  This is normally the
  // URI; if the subject has no URI, a unique ID is assigned.

  function getSubjectId (subject) {
    if ('uri' in subject) {
      return subject.uri
    } else if ('_subject_id' in subject) {
      return subject._subject_id
    } else {
      var result = '' + subjectIdCounter
      subject._subject_id = result
      ++subjectIdCounter
      return result
    }
  }

  // Run a query and populate the table.
  // Populates also an array of logical rows.  This will be empty when the function
  // first returns (as the query is performed in the background)

  function runQuery (query, rows, columns, table) {
    query.running = true
    var startTime = Date.now()

    var progressMessage = doc.createElement('tr')
    table.appendChild(progressMessage)
    progressMessage.textContent = 'Loading ...'

    for (let i = 0; i < rows.length; i++) {
      rows[i].original = true
      if (!rows[i].originalValues) {
        // remember first set
        rows[i].originalValues = rows[i].values
      }
      rows[i].values = {}
      // oldStyle = rows[i]._htmlRow.getAttribute('style') || ''
      // rows[i]._htmlRow.style.background = '#ffe'; //setAttribute('style', ' background-color: #ffe;')// yellow
    }

    var onResult = function (values) {
      if (!query.running) {
        return
      }

      progressMessage.textContent += '.' // give a progress bar

      var row = null
      var rowKey = null
      var rowKeyId

      // If the query has a row key, use it to look up the row.

      if (keyVariable in values) {
        rowKey = values[keyVariable]
        rowKeyId = getSubjectId(rowKey)

        // Do we have a row for this already?
        // If so, reuse it; otherwise, we must create a new row.

        if (rowKeyId in rowsLookup) {
          row = rowsLookup[rowKeyId]
        }
      }

      // Create a new row?

      if (!row) {
        var tr = doc.createElement('tr')
        table.appendChild(tr)

        row = {
          _htmlRow: tr,
          _subject: rowKey,
          values: {}
        }
        rows.push(row)

        if (rowKey) {
          rowsLookup[rowKeyId] = row
        }
      }

      // Add the new values to this row.
      delete row.original // This is included in the new data
      updateRow(row, columns, values)
    }

    var onDone = function () {
      if (
        progressMessage &&
        progressMessage.parentNode &&
        progressMessage.parentNode.removeChild
      ) {
        progressMessage.parentNode.removeChild(progressMessage)
        progressMessage = null
      }

      var elapsedTimeMS = Date.now() - startTime
      debug.log(
        'Query done: ' + rows.length + ' rows, ' + elapsedTimeMS + 'ms'
      )
      // Delete rows which were from old values not new
      for (let i = rows.length - 1; i >= 0; i--) {
        // backwards
        if (rows[i].original) {
          debug.log('   deleting row ' + rows[i]._subject)
          var tr = rows[i]._htmlRow
          tr.parentNode.removeChild(tr)
          delete rowsLookup[getSubjectId(rows[i]._subject)]
          rows.splice(i, 1)
        }
      }

      /*
                  for (let i=0; i< rows.length; i++) {
                      rows[i].originalValues = rows[i].values
                      rows[i].values = {}
                      // oldStyle = rows[i]._htmlRow.getAttribute('style') || ''
                      rows[i]._htmlRow.style.background = '#ffe'; //setAttribute('style', ' background-color: #ffe;')//
                      applyColumnFilters(rows, columns); // @@ TBL added this
                      // Here add table clean-up, remove "loading" message etc.
                  }
                  */
      if (options.onDone) options.onDone()
    }
    kb.query(query, onResult, undefined, onDone)
  }

  // Given the formula object which is the query pattern,
  // deduce from where the variable occurs constraints on
  // what values it can take.

  function inferColumnsFromFormula (columns, formula) {
    UI.log.debug('>> processing formula')

    for (let i = 0; i < formula.statements.length; ++i) {
      var statement = formula.statements[i]
      // UI.log.debug("processing statement " + i)

      // Does it match this?:
      // <something> <predicate> ?var
      // If so, we can use the predicate as the predicate for the
      // column used for the specified variable.

      if (
        statement.predicate.termType === 'NamedNode' &&
        statement.object.termType === 'Variable'
      ) {
        var variable = statement.object.toString()
        if (variable in columns) {
          var column = columns[variable]
          column.setPredicate(statement.predicate, false, statement.subject)
        }
      }
      if (
        statement.predicate.termType === 'NamedNode' &&
        statement.subject.termType === 'Variable'
      ) {
        const variable = statement.subject.toString()
        if (variable in columns) {
          const column = columns[variable]
          column.setPredicate(statement.predicate, true, statement.object)
        }
      }
    }

    // Apply to OPTIONAL formulas:

    for (let i = 0; i < formula.optional.length; ++i) {
      UI.log.debug('recurse to optional subformula ' + i)
      inferColumnsFromFormula(columns, formula.optional[i])
    }

    UI.log.debug('<< finished processing formula')
  }

  // Generate a list of column structures and infer details about the
  // predicates based on the contents of the query

  function inferColumns (query) {
    // Generate the columns list:

    var result = []
    var columns = {}

    for (let i = 0; i < query.vars.length; ++i) {
      var column = new Column()
      var queryVar = query.vars[i]
      UI.log.debug('column ' + i + ' : ' + queryVar)

      column.setVariable(queryVar)
      columns[queryVar] = column
      result.push(column)
    }

    inferColumnsFromFormula(columns, query.pat)

    return result
  }

  // Generate a table from a query.

  function renderTableForQuery (query, type) {
    // infer columns from query, to allow generic queries
    var columns
    if (!givenQuery) {
      columns = type.getColumns()
    } else {
      columns = inferColumns(query)
    }

    // Start with an empty list of rows; this will be populated
    // by the query.

    var rows = []

    // Create table element and header.

    var table = doc.createElement('table')

    table.appendChild(renderTableHeader(columns, type))
    table.appendChild(renderTableSelectors(rows, columns))

    // Run query.  Note that this is perform asynchronously; the
    // query runs in the background and this call does not block.

    table.logicalRows = rows // Save for refresh
    table.columns = columns
    table.query = query

    runQuery(query, rows, columns, table)

    return table
  }

  // Find the most common type of row

  function getMostCommonType (types) {
    var bestCount = -1
    var best = null

    let typeUri
    for (typeUri in types) {
      var type = types[typeUri]

      if (type.useCount > bestCount) {
        best = type
        bestCount = type.useCount
      }
    }

    return best
  }

  // Filter list of columns to only those columns used in the
  // specified rows.
  /*
  function filterColumns (columns, rows) {
    var filteredColumns = {}

    // Copy columns from "columns" -> "filteredColumns", but only
    // those columns that are used in the list of rows specified.

    for (let columnUri in columns) {
      for (let i = 0; i < rows.length; ++i) {
        if (columnUri in rows[i]) {
          filteredColumns[columnUri] = columns[columnUri]
          break
        }
      }
    }
    return filteredColumns
  }
  */
}
// ///////////////////////////////////////////////////////////////////

// ENDS
