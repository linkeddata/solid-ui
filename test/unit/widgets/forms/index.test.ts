import { namedNode, graph } from 'rdflib'
import ns from '../../../../src/ns'
import uiStore from '../../../../src/store'

import {
  appendForm,
  buildCheckboxForm,
  editFormButton,
  field,
  findClosest,
  formsFor,
  makeDescription,
  makeSelectForCategory,
  makeSelectForNestedCategory,
  makeSelectForOptions,
  newButton,
  newThing,
  promptForNew,
  propertiesForClass,
  sortByLabel,
  sortBySequence
} from '../../../../src/widgets/forms'

import { basicField } from '../../../../src/widgets/forms/basic'

describe('field', () => {
  it('exists', () => {
    expect(field).toBeInstanceOf(Object)
  })
})

describe('Form field', () => {
  it('exists', () => {
    expect(field[ns.ui('Form').uri]).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263

    // FIXME: https://github.com/solid/solid-ui/issues/239
    ;(document as any).outlineManager = {
      appendPropertyTRs: () => {}
    }
    expect(field[ns.ui('Form').uri](
      document,
      container,
      already,
      subject,
      form,
      store,
      callbackFunction
    )).toMatchSnapshot()
  })
  // @@ TODO check this further what test could I use to make sure
  // to test that the form gets added but obviously not in the container passed in
  it.skip('still returns an element if the container is null', () => {
    // debugger
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      field[ns.ui('Form').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
  // @@ TODO need to double check proper subjects and what gets returned
  it.skip('returns.. if the subject has already been processed...', () => {
    const dubSubject = namedNode('subject')
    const container = document.createElement('container')
    const already = { dubSubject }
    const subject = dubSubject
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      field[ns.ui('Form').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})

describe('Options field', () => {
  it('exists', () => {
    expect(field[ns.ui('Options').uri]).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      field[ns.ui('Options').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})

describe('Multiple field', () => {
  it('exists', () => {
    expect(field[ns.ui('Multiple').uri]).toBeInstanceOf(Object)
  })
  it.skip('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      field[ns.ui('Multiple').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})

;[
  'PhoneField',
  'EmailField',
  'ColorField',
  'DateField',
  'DateTimeField',
  'TimeField',
  'NumericField',
  'IntegerField',
  'DecimalField',
  'FloatField',
  'TextField',
  'SingleLineTextField',
  'NamedNodeURIField'
].forEach((fieldName: string) => {
  describe(fieldName, () => {
    it('is a basic field', () => {
      expect(field[ns.ui(fieldName).uri]).toEqual(basicField)
    })
  })
})

describe('MultiLineTextField', () => {
  it('exists', () => {
    expect(field[ns.ui('MultiLineTextField').uri]).toBeInstanceOf(Object)
  })
  it.skip('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      field[ns.ui('MultiLineTextField').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})

describe('BooleanField', () => {
  it('exists', () => {
    expect(field[ns.ui('BooleanField').uri]).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      field[ns.ui('BooleanField').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})

describe('TristateField', () => {
  it('exists', () => {
    expect(field[ns.ui('TristateField').uri]).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      field[ns.ui('TristateField').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})

describe('Classifier', () => {
  it('exists', () => {
    expect(field[ns.ui('Classifier').uri]).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    uiStore.add(form, ns.ui('category'), namedNode('http://example.com/#bla'), namedNode('http://example.com/'))

    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      field[ns.ui('Classifier').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})

describe('Choice', () => {
  it('exists', () => {
    expect(field[ns.ui('Choice').uri]).toBeInstanceOf(Object)
  })
  it.skip('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      field[ns.ui('Choice').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})

describe('Heading', () => {
  it('exists', () => {
    expect(field[ns.ui('Heading').uri]).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    uiStore.add(form, ns.ui('contents'), namedNode('http://example.com/#bla'), namedNode('http://example.com/'))
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      field[ns.ui('Heading').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})

describe('Comment', () => {
  it('exists', () => {
    expect(field[ns.ui('Comment').uri]).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    uiStore.add(form, ns.ui('contents'), namedNode('http://example.com/#bla'), namedNode('http://example.com/'))
    expect(
      field[ns.ui('Comment').uri](
        document,
        container,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})

describe('editFormButton', () => {
  it('exists', () => {
    expect(editFormButton).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const container = null
    const form = null
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    expect(
      editFormButton(document, container, form, store, callbackFunction)
    ).toBeInstanceOf(HTMLButtonElement)
  })
})

describe('appendForm', () => {
  it('exists', () => {
    expect(appendForm).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#subject')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const itemDone = () => {}
    expect(
      appendForm(document, container, already, subject, form, store, itemDone)
    ).toBeInstanceOf(HTMLDivElement)
  })
})

describe('propertiesForClass', () => {
  it('exists', () => {
    expect(propertiesForClass).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(propertiesForClass(graph(), namedNode('http://example.com/#class'))).toBeInstanceOf(Object)
  })
})

describe('findClosest', () => {
  it('exists', () => {
    expect(findClosest).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const kb = graph()
    kb.sym = namedNode
    expect(findClosest(kb, 'http://example.com/#cla', namedNode('http://example.com/#prop'))).toBeInstanceOf(Object)
  })
})

describe('formsFor', () => {
  it('exists', () => {
    expect(formsFor).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(formsFor(namedNode('http://example.com/#sub'))).toBeInstanceOf(Object)
  })
})

describe('sortBySequence', () => {
  it('exists', () => {
    expect(sortBySequence).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(sortBySequence([])).toBeInstanceOf(Object)
  })
})

describe('sortByLabel', () => {
  it('exists', () => {
    expect(sortByLabel).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(sortByLabel([])).toBeInstanceOf(Object)
  })
})

describe('newButton', () => {
  it('exists', () => {
    expect(newButton).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(
      newButton(
        document,
        graph(),
        namedNode('http://example.com/#subject'),
        namedNode('http://example.com/#predicate'),
        namedNode('http://example.com/#class'),
        namedNode('http://example.com/#form'),
        namedNode('http://example.com/#store'),
        () => {}
      )
    ).toBeInstanceOf(HTMLButtonElement)
  })
})

describe('promptForNew', () => {
  it('exists', () => {
    expect(promptForNew).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(
      promptForNew(
        document,
        graph(),
        namedNode('http://example.com/#this'),
        namedNode('http://example.com/#this'),
        namedNode('http://example.com/#this'),
        null,
        graph(),
        () => {}
      )
    ).toBeInstanceOf(HTMLFormElement)
  })
})

describe('makeDescription', () => {
  it('exists', () => {
    expect(makeDescription).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(
      makeDescription(
        document,
        graph(),
        namedNode('http://example.com/#subject'),
        namedNode('http://example.com/#predicate'),
        namedNode('http://example.com/#store'),
        () => {}
      )
    ).toBeInstanceOf(HTMLDivElement)
  })
})

describe('makeSelectForOptions', () => {
  it('exists', () => {
    expect(makeSelectForOptions).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(
      makeSelectForOptions(
        document,
        graph(),
        namedNode('http://example.com/#subject'),
        namedNode('http://example.com/#predicate'),
        [],
        {},
        namedNode('http://example.com/#doc'),
        () => {}
      )
    ).toBeInstanceOf(HTMLDivElement)
  })
})

describe('makeSelectForCategory', () => {
  it('exists', () => {
    expect(makeSelectForCategory).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(
      makeSelectForCategory(
        document,
        graph(),
        null,
        null,
        graph(),
        () => {}
      )
    ).toBeInstanceOf(HTMLDivElement)
  })
})

describe('makeSelectForNestedCategory', () => {
  it('exists', () => {
    expect(makeSelectForNestedCategory).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(
      makeSelectForNestedCategory(
        document,
        graph(),
        namedNode('http://example.com/#this'),
        namedNode('http://example.com/#this'),
        graph(),
        () => {}
      )
    ).toBeInstanceOf(HTMLSpanElement)
  })
})

describe('buildCheckboxForm', () => {
  it('exists', () => {
    expect(buildCheckboxForm).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(
      buildCheckboxForm(
        document,
        graph(),
        'label',
        [],
        [],
        namedNode('http://example.com/#form'),
        namedNode('http://example.com/#doc'),
        false
      )
    ).toBeInstanceOf(HTMLDivElement)
  })
})

describe('newThing', () => {
  it('exists', () => {
    expect(newThing).toBeInstanceOf(Object)
  })
  it('runs', () => {
    expect(newThing(namedNode('http://example.com/#this'))).toBeInstanceOf(Object)
  })
  // need to also mock or figure out doc - which is a NamedNode
  it.skip('returns the correct .', () => {
    const Date = jest.fn()
    Date.mockReturnValueOnce('Thu Feb 06 2020 19:42:59 GMT+1100')
    expect(newThing(namedNode('doc'))).toBe('')
  })
})
