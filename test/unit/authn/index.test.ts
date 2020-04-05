import { silenceDebugMessages } from '../../helpers/setup'
import * as Authn from '../../../src/authn/authn'
import * as Index from '../../../src/authn/index'

silenceDebugMessages()
jest.mock('solid-auth-client')

describe('authn/index', () => {
  it('exports all of authn/authn', () => {
    expect(Object.keys(Authn).sort()).toEqual(Object.keys(Index.authn).sort())
  })
})
