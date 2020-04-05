import { silenceDebugMessages } from '../../helpers/setup'
import * as Styles from '../../../src/acl/styles'

silenceDebugMessages()
jest.mock('solid-auth-client')

describe('Styles', () => {
  it('exists', () => {
    expect(typeof Styles).toEqual('object')
  })
})
