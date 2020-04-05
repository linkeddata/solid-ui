import { silenceDebugMessages } from '../../../helpers/setup'
import { namedNode } from 'rdflib'
import ns from '../../../../src/ns'
import uiStore from '../../../../src/store'

import {
  commentField
} from '../../../../src/widgets/forms/comment'
import { clearStore } from '../../helpers/clearStore'

silenceDebugMessages()
afterEach(clearStore)

describe('Comment', () => {
  it('exists', () => {
    expect(commentField).toBeInstanceOf(Object)
  })
  it('runs', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    uiStore.add(form, ns.rdf('type'), ns.ui('Comment'), namedNode('http://example.com/'))
    uiStore.add(form, ns.ui('contents'), namedNode('http://example.com/#bla'), namedNode('http://example.com/'))
    expect(
      commentField(
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
  it('deals with missing content', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    uiStore.add(form, ns.rdf('type'), ns.ui('Comment'), namedNode('http://example.com/'))
    expect(
      commentField(
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
  it('deals with missing field params in non-bottom field type', () => {
    const container = document.createElement('div')
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    uiStore.add(form, ns.rdf('type'), namedNode('http://example.com/#custom2'), namedNode('http://example.com/'))
    uiStore.add(namedNode('http://example.com/#custom2'), ns.rdfs('subClassOf'), namedNode('http://example.com/#custom1'), namedNode('http://example.com/'))
    uiStore.add(form, ns.ui('contents'), namedNode('http://example.com/#bla'), namedNode('http://example.com/'))

    expect(
      commentField(
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
  it('deals with missing container', () => {
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    uiStore.add(form, ns.rdf('type'), ns.ui('Comment'), namedNode('http://example.com/'))
    uiStore.add(form, ns.ui('contents'), namedNode('http://example.com/#bla'), namedNode('http://example.com/'))
    expect(
      commentField(
        document,
        undefined,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
  it('deals with custom style', () => {
    const already = {}
    const subject = namedNode('http://example.com/#this')
    const form = namedNode('http://example.com/#form')
    const store = namedNode('http://example.com/#store')
    const callbackFunction = jest.fn() // TODO: https://github.com/solid/solid-ui/issues/263
    uiStore.add(form, ns.rdf('type'), ns.ui('Comment'), namedNode('http://example.com/'))
    uiStore.add(form, ns.ui('style'), 'custom: true;', namedNode('http://example.com/'))
    uiStore.add(form, ns.ui('contents'), namedNode('http://example.com/#bla'), namedNode('http://example.com/'))
    expect(
      commentField(
        document,
        undefined,
        already,
        subject,
        form,
        store,
        callbackFunction
      )
    ).toMatchSnapshot()
  })
})
