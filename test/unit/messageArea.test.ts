import { silenceDebugMessages } from '../helpers/setup'
import { JSDOM } from 'jsdom'
import MessageArea from '../../src/messageArea'
import { graph, sym } from 'rdflib'

silenceDebugMessages()
jest.mock('solid-auth-client')
const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
const dom = window.document

describe('MessageArea', () => {
  it('exists', () => {
    expect(MessageArea).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(MessageArea(
      dom,
      graph(),
      sym('https://test.test'),
      sym('https://test.test'),
      {}
    )).toBeTruthy()
  })
})
