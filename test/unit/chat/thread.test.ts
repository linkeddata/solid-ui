import { silenceDebugMessages } from '../../helpers/setup'
import { JSDOM } from 'jsdom'
import thread from '../../../src/chat/thread'
import { graph, sym } from 'rdflib'

silenceDebugMessages()
jest.mock('solid-auth-client')
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window.document

describe('Thread', () => {
  it('exists', () => {
    expect(thread).toBeInstanceOf(Function)
  })

  it.skip('runs', () => {
    const kb = graph()
    const subject = ''
    const messageStore = sym('https://test.test#')
    const options = {}

    ;(window as any).alert = () => {}
    expect(thread(dom, kb, subject, messageStore, options)).toBeInstanceOf(Object)
  })
})
