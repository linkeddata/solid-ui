import { silenceDebugMessages } from '../helpers/setup'
import NounCamera1618446 from '../../src/noun_Camera_1618446_000000'

silenceDebugMessages()
jest.mock('solid-auth-client')

describe('NounCamera1618446_000000', () => {
  it('exists', () => {
    expect(typeof NounCamera1618446).toEqual('string')
  })
})
