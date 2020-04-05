import { silenceDebugMessages } from '../../helpers/setup'
import {
  sentimentStrip,
  sentimentStripLinked,
  messageToolbar
} from '../../../src/chat/messageTools'

silenceDebugMessages()
jest.mock('solid-auth-client')

describe('sentimentStrip', () => {
  it('exists', () => {
    expect(sentimentStrip).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(sentimentStrip()).toBeInstanceOf(Text)
  })
})

describe('sentimentStripLinked', () => {
  it('exists', () => {
    expect(sentimentStripLinked).toBeInstanceOf(Function)
  })
  it.skip('runs', () => {
    const target = {}
    const doc = {}
    expect(sentimentStripLinked(target, doc)).toBeInstanceOf(HTMLSpanElement)
  })
})

describe('messageToolbar', () => {
  it('exists', () => {
    expect(messageToolbar).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(messageToolbar()).toBeInstanceOf(HTMLDivElement)
  })
})
