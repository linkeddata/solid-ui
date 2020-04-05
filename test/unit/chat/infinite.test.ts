import { silenceDebugMessages } from '../../helpers/setup'
import { JSDOM } from 'jsdom'
import { infiniteMessageArea } from '../../../src/chat/infinite'
import { graph, sym } from 'rdflib'

silenceDebugMessages()
jest.mock('solid-auth-client')
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window.document

describe('infiniteMessageArea', () => {
  it('exists', () => {
    expect(infiniteMessageArea).toBeInstanceOf(Function)
  })
  it('runs', () => {
    const kb = graph()
    const chatChannel = sym('https://domain.tld/chat')
    const options = {}
    ;(window as any).alert = () => {}

    const result = infiniteMessageArea(dom, kb, chatChannel, options)
    expect(result).toBeTruthy()
  })
})
