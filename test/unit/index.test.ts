import { silenceDebugMessages } from '../helpers/setup'
import * as Index from '../../src/index'

silenceDebugMessages()

describe('Index', () => {
  it('exists', () => {
    expect(Object.keys(Index)).toEqual([
      'ns',
      'acl',
      'aclControl',
      'authn',
      'create',
      'icons',
      'matrix',
      'media',
      'messageArea',
      'infiniteMessageArea',
      'pad',
      'preferences',
      'store',
      'style',
      'table',
      'utils',
      'widgets',
      'versionInfo',
      'initHeader',
      'dom',
      'rdf',
      'log',
      'tabs'
    ])
  })
})
