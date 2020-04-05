import { silenceDebugMessages } from '../../helpers/setup'
import { DataBrowserContext } from 'pane-registry'
import { sym, graph, namedNode } from 'rdflib'
import { JSDOM } from 'jsdom'
import {
  ACLControlBox5, handleDrop,
  preventBrowserDropEvents, preventDrag, setGlobalWindow,
  shortNameForFolder
} from '../../../src/acl/acl-control'

silenceDebugMessages()
jest.mock('solid-auth-client')
const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
const dom = window.document

describe('ACLControlBox5', () => {
  it.skip('runs', () => {
    expect(ACLControlBox5(
      sym('https://test.test'),
      { dom } as DataBrowserContext,
      {} as any,
      graph())).toBeInstanceOf(HTMLElement)
  })
})

describe('preventBrowserDropEvents', () => {
  let event

  beforeAll(() => {
    jest.spyOn(dom, 'addEventListener')
    preventBrowserDropEvents(dom)
  })
  beforeEach(() => {
    event = {
      stopPropagation: jest.fn(),
      preventDefault: jest.fn()
    }
  })
  afterAll(() => jest.restoreAllMocks())

  it('adds event handlers for drop', () => expect(dom.addEventListener).toHaveBeenCalledWith('drop', handleDrop, false))
  it('adds event handlers for dragenter', () => expect(dom.addEventListener).toHaveBeenCalledWith('dragenter', preventDrag, false))
  it('adds event handlers for drop, dragenter and dragover', () => expect(dom.addEventListener).toHaveBeenCalledWith('dragover', preventDrag, false))

  it('prevents adding event listeners twice', () => {
    preventBrowserDropEvents(dom)
    expect((dom.addEventListener as jest.Mock).mock.calls.length).toBe(3)
  })

  describe('preventDrag', () => {
    beforeEach(() => preventDrag(event))

    it('calls event.stopPropagation', () => expect(event.stopPropagation).toHaveBeenCalled())
    it('calls event.preventDefault', () => expect(event.preventDefault).toHaveBeenCalled())
  })

  describe('handleDrop', () => {
    beforeEach(() => {
      setGlobalWindow(window)
      event.dataTransfer = { files: [{}] }
      window.confirm = jest.fn(() => false)
      handleDrop(event)
    })

    it('calls window.confirm', () => expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to drop this file here? (Cancel opens it in a new tab)'))

    describe('confirm return true', () => {
      beforeEach(() => {
        window.confirm = jest.fn(() => true)
        handleDrop(event)
      })

      it('calls event.stopPropagation', () => expect(event.stopPropagation).toHaveBeenCalled())
      it('calls event.preventDefault', () => expect(event.preventDefault).toHaveBeenCalled())
    })
  })
})

describe('shortNameForFolder', () => {
  it('works with trailing slashes', () => {
    expect(shortNameForFolder(namedNode('http://example.com/some/folder/'))).toEqual('folder')
  })

  it('works without trailing slashes', () => {
    expect(shortNameForFolder(namedNode('http://example.com/some/folder'))).toEqual('folder')
  })

  it('works with domain root with trailing slash', () => {
    expect(shortNameForFolder(namedNode('http://example.com/'))).toEqual('example.com')
  })

  it('works with domain root without trailing slash', () => {
    expect(shortNameForFolder(namedNode('http://example.com'))).toEqual('example.com')
  })

  it('works with protocol root', () => {
    // Note: I'm not certain this is actually by design, it might be
    // that the intended behaviour was that the domain root would get
    // labeled '/'. See https://github.com/solid/solid-ui/issues/196
    expect(shortNameForFolder(namedNode('http://'))).toEqual('/')
  })
})
