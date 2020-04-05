import { silenceDebugMessages } from '../../../helpers/setup'
import { namedNode } from 'rdflib'
import {
  fieldLabel,
  fieldStore,
  basicField
} from '../../../../src/widgets/forms/basic'
import { store, ns } from '../../../../src/'
import { textInputStyle } from '../../../../src/style'
import { clearStore } from '../../helpers/clearStore'

silenceDebugMessages()
afterEach(clearStore)

describe('fieldLabel', () => {
  it('exists', () => {
    expect(fieldLabel).toBeInstanceOf(Function)
  })
  const predicates = [
    ns.ui('label'),
    ns.link('message'),
    ns.vcard('fn'),
    ns.foaf('name'),
    ns.dct('title'),
    ns.dc('title'),
    ns.rss('title'),
    ns.contact('fullName'),
    namedNode('http://www.w3.org/2001/04/roadmap/org#name'),
    ns.cal('summary'),
    ns.foaf('nick'),
    ns.rdfs('label')
  ]
  for (let i = 0; i < predicates.length; i++) {
    it(`checks for ${predicates[i]}`, () => {
      for (let j = i; j < predicates.length; j++) {
        store.add(namedNode('http://example.com/#this'), predicates[j], `from ${predicates[j]}`, namedNode('http://example.com/'))
      }
      const anchorElement = fieldLabel(document, namedNode('http://example.com/#this'), namedNode('http://example.com/#this'))
      const firstChar = (i === 0 ? 'f' : 'F')
      const expectedLabel = `${firstChar}rom &lt;${predicates[i].uri}&gt;`
      expect((anchorElement as HTMLElement).innerHTML).toEqual(expectedLabel)
    })
  }
  it('sets the property as the href', () => {
    store.add(namedNode('http://example.com/#this'), predicates[0], `from ${predicates[0]}`, namedNode('http://example.com/'))
    const anchorElement = fieldLabel(document, namedNode('http://example.com/#the-property'), namedNode('http://example.com/#this'))
    const expectedHref = 'http://example.com/#the-property'
    expect((anchorElement as HTMLAnchorElement).href).toEqual(expectedHref)
  })
  it('sets the style', () => {
    store.add(namedNode('http://example.com/#this'), predicates[0], `from ${predicates[0]}`, namedNode('http://example.com/'))
    const anchorElement = fieldLabel(document, namedNode('http://example.com/#the-property'), namedNode('http://example.com/#this'))
    const expectedStyle = 'color: #3B5998; text-decoration: none;'
    expect((anchorElement as HTMLAnchorElement).getAttribute('style')).toEqual(expectedStyle)
  })
  it('shows an error if property is undefined', () => {
    store.add(namedNode('http://example.com/#this'), predicates[0], `from ${predicates[0]}`, namedNode('http://example.com/'))
    const textNode = fieldLabel(document, undefined, namedNode('http://example.com/#this'))
    const expectedText = '@@Internal error: undefined property'
    expect((textNode as Text).wholeText).toEqual(expectedText)
  })
})

describe('fieldStore', () => {
  it('exists', () => {
    expect(fieldStore).toBeInstanceOf(Object)
  })
  it('returns the first matching why, if editable', () => {
    store.add(namedNode('http://example.com/#s'), namedNode('http://example.com/#p'), namedNode('http://example.com/#o1'), namedNode('http://why1.com/'))
    store.add(namedNode('http://example.com/#s'), namedNode('http://example.com/#p'), namedNode('http://example.com/#o2'), namedNode('http://why2.com/'))

    expect(fieldStore(namedNode('http://example.com/#s'), namedNode('http://example.com/#p'), namedNode('http://example.com/#def'))).toEqual({
      termType: 'NamedNode',
      value: 'http://why1.com/'
    })
  })
  it('returns def if the first matching why is not editable', () => {
    store.add(namedNode('http://example.com/#s'), namedNode('http://example.com/#p'), namedNode('http://example.com/#o1'), 'some literal 1')
    store.add(namedNode('http://example.com/#s'), namedNode('http://example.com/#p'), namedNode('http://example.com/#o2'), 'some literal 2')

    expect(fieldStore(namedNode('http://example.com/#s'), namedNode('http://example.com/#p'), namedNode('http://def.com/'))).toEqual({
      termType: 'NamedNode',
      value: 'http://def.com/'
    })
  })
  it('returns def when there is no matching statement', () => {
    expect(fieldStore(namedNode('http://example.com/#s'), namedNode('http://example.com/#p'), namedNode('http://def.com/'))).toEqual({
      termType: 'NamedNode',
      value: 'http://def.com/'
    })
  })
})

describe('basicField', () => {
  it('exists', () => {
    expect(fieldStore).toBeInstanceOf(Function)
  })
  it('creates a basic field', () => {
    const container = undefined
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), namedNode('http://example.com/#some-property'), namedNode('http://example.com/'))

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    expect(result).toMatchSnapshot()
  })

  it('adds the basic field to the container, if provided', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), namedNode('http://example.com/#some-property'), namedNode('http://example.com/'))

    basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    expect(container).toMatchSnapshot()
  })

  it('handles keyup events', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = '555-1234'
    const event = new Event('keyup')
    inputElement.dispatchEvent(event)
  })

  it('handles change events', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = '555-1234'
    const event = new Event('change')
    inputElement.dispatchEvent(event)
  })

  it('goes green if value matches pattern', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = namedNode('http://www.w3.org/ns/ui#PhoneField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = '555-1234'
    const event = new Event('keyup')
    inputElement.dispatchEvent(event)
    expect(inputElement.getAttribute('style')).toEqual('background-color: #eef; padding: 0.5em;  border: .05em solid #88c;  border-radius:0.2em; font-size: 100%; margin:0.2em; color: green;')
  })

  it('goes red if value doesnt match pattern', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = namedNode('http://www.w3.org/ns/ui#PhoneField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = 'not a valid phone number'
    const event = new Event('keyup')
    inputElement.dispatchEvent(event)
    expect(inputElement.getAttribute('style')).toEqual('background-color: #eef; padding: 0.5em;  border: .05em solid #88c;  border-radius:0.2em; font-size: 100%; margin:0.2em; color: red;')
  })

  it('handles change if value doesnt match pattern', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = namedNode('http://www.w3.org/ns/ui#PhoneField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = 'not a valid phone number'
    const event = new Event('change')
    inputElement.dispatchEvent(event)
  })

  it('calls updater on change', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('http://example.com/#initial-value'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = 'changed value'
    const event = new Event('change')
    inputElement.dispatchEvent(event)
    expect(store.updater.updated).toEqual(true)
  })

  it('calls updater on change for a NamedNodeUriField', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = ns.ui('NamedNodeURIField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(subject, property, namedNode('http://example.com/#initial-value'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = 'http://example.com/#changed-value'
    const event = new Event('change')
    inputElement.dispatchEvent(event)
    expect(store.updater.updated).toEqual(true)
  })

  it('calls updater on change for a field with uriPrefix', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = namedNode('http://www.w3.org/ns/ui#PhoneField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(subject, property, namedNode('tel:11111'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = '999000'
    const event = new Event('change')
    inputElement.dispatchEvent(event)
    expect(store.updater.updated).toEqual(true)
  })

  it('calls updater on change for a field with dt', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = ns.ui('FloatField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(subject, property, 1.1111, doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = '9.99000'
    const event = new Event('change')
    inputElement.dispatchEvent(event)
    expect(store.updater.updated).toEqual(true)
  })

  it('creates triple if missing', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = '9.99000'
    const event = new Event('change')
    inputElement.dispatchEvent(event)
    expect(store.updater.updated).toEqual(true)
  })

  it('Can update multiple docs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = ns.ui('FloatField')
    const property = namedNode('http://example.com/#some-property')
    const doc1 = namedNode('http://example.com/1')
    const doc2 = namedNode('http://example.com/2')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc1)
    store.add(form, ns.rdf('type'), formType, doc1)
    store.add(subject, property, 1.1111, doc1)
    store.add(subject, property, 1.5, doc1)
    store.add(subject, property, 1.1111, doc2)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc1,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = '1.1111'
    const event = new Event('change')
    inputElement.dispatchEvent(event)
    expect(store.updater.updated).toEqual(true)
  })

  it('Reports update success', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, 1.1111, doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = '1.1111'
    const event = new Event('change')
    store.updater.reportSuccess = true
    inputElement.dispatchEvent(event)
    expect(callbackFunction.mock.calls).toEqual([[true, 'body']])
  })

  it('Reports update failure', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, 1.1111, doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = '1.1111'
    const event = new Event('change')
    store.updater.reportSuccess = false
    inputElement.dispatchEvent(event)
    expect(callbackFunction.mock.calls).toEqual([[false, 'body']])
  })

  it('Reports update failure to update multiple docs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const doc2 = namedNode('http://example.com/2')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, 1.1111, doc)
    store.add(subject, property, 1.1111, doc2)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const inputElement = result.childNodes[1].childNodes[0] as HTMLInputElement
    inputElement.value = '1.1111'
    const event = new Event('change')
    store.updater.reportSuccess = false
    inputElement.dispatchEvent(event)
    expect(callbackFunction.mock.calls).toEqual([[false, 'body']])
  })

  it('Can derive the doc if undefined', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const doc = undefined
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), namedNode('http://example.com/#some-property'), namedNode('http://example.com/'))
    // Let it derive the correct doc from this:
    store.add(subject, namedNode('http://example.com/#some-property'), namedNode('http://example.com/#o1'), namedNode('http://why1.com/'))

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    // From the fact that it's picking up the 'http://example.com/#o1' object
    // and that apparently it didn't error on line
    // https://github.com/solid/solid-ui/blob/660ab45/src/widgets/forms/basic.ts#L135
    // we can conclude that it successfully chose namedNode('http://why1.com/')
    // as the value for `doc`.
    expect((result.childNodes[1].childNodes[0] as HTMLInputElement).value).toEqual('http://example.com/#o1')
  })

  it('Sets the current value from rdflib (Literal)', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, 'current value', doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    expect((result.childNodes[1].childNodes[0] as HTMLInputElement).value).toEqual('current value')
  })

  it('Sets the current value from rdflib (NamedNode)', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('http://example.com/#current-value'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    expect((result.childNodes[1].childNodes[0] as HTMLInputElement).value).toEqual('http://example.com/#current-value')
  })

  it('Can read uriPrefix from fieldParams', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = namedNode('http://www.w3.org/ns/ui#PhoneField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    expect((result.childNodes[1].childNodes[0] as HTMLInputElement).value).toEqual('123412341234')
  })

  it('Can read style from fieldParams', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = ns.ui('FloatField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const style = (result.childNodes[1].childNodes[0] as HTMLInputElement).getAttribute('style')
    expect(style).toEqual('text-align: right')
  })

  it('Defaults to textInputStyle', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const style = (result.childNodes[1].childNodes[0] as HTMLInputElement).getAttribute('style')
    expect(style).toEqual(textInputStyle)
  })

  it('Can read type from fieldParams', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = ns.ui('TimeField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const type = (result.childNodes[1].childNodes[0] as HTMLInputElement).getAttribute('type')
    expect(type).toEqual('time')
  })

  it('Defaults to type text', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const type = (result.childNodes[1].childNodes[0] as HTMLInputElement).getAttribute('type')
    expect(type).toEqual('text')
  })

  it('Form size has precedence over fieldParams size', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = ns.ui('TimeField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(form, ns.ui('property'), property, doc)
    store.add(form, ns.ui('size'), 30, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const size = (result.childNodes[1].childNodes[0] as HTMLInputElement).getAttribute('size')
    expect(size).toEqual('30')
  })

  it('Can read size from fieldParams', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const formType = ns.ui('TimeField')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.rdf('type'), formType, doc)
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const size = (result.childNodes[1].childNodes[0] as HTMLInputElement).getAttribute('size')
    expect(size).toEqual('10')
  })

  it('Defaults to size 20', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const size = (result.childNodes[1].childNodes[0] as HTMLInputElement).getAttribute('size')
    expect(size).toEqual('20')
  })

  it('Can read maxLength from form property', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://example.com/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(form, ns.ui('maxLength'), 100, doc)
    store.add(subject, property, namedNode('tel:123412341234'), doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    const maxLength = (result.childNodes[1].childNodes[0] as HTMLInputElement).getAttribute('maxLength')
    expect(maxLength).toEqual('100')
  })

  it('Shows as readOnly if not editable', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const property = namedNode('http://example.com/#some-property')
    const doc = namedNode('http://not.editable/')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    store.add(form, ns.ui('property'), property, doc)
    store.add(subject, property, 'set in stone', doc)

    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      doc,
      callbackFunction
    )
    expect((result.childNodes[1].childNodes[0] as HTMLInputElement).readOnly).toEqual(true)
  })

  it('shows error if no property given', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    const result = basicField(
      document,
      container,
      already,
      subject,
      form,
      store,
      callbackFunction
    )
    expect(result).toMatchSnapshot()
  })
})
