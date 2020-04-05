import { silenceDebugMessages } from '../helpers/setup'
import SolidNamespace from '../../src/ns'

silenceDebugMessages()
jest.mock('solid-auth-client')

describe('SolidNamespace', () => {
  it('exists', () => {
    expect(SolidNamespace).toBeInstanceOf(Object)
  })
})
