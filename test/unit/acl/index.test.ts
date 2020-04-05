import { silenceDebugMessages } from '../../helpers/setup'
import * as Acl from '../../../src/acl/acl'
import * as AclControl from '../../../src/acl/acl-control'
import { acl, aclControl } from '../../../src/acl/index'

silenceDebugMessages()

describe('acl related APIs', () => {
  it('exports some methods in the acl module', () => {
    expect(Acl).toEqual(expect.objectContaining(acl))
    expect([
      'adoptACLDefault',
      'readACL',
      'sameACL',
      'ACLunion',
      'loadUnionACL',
      'ACLbyCombination',
      'makeACLGraph',
      'makeACLGraphbyCombo',
      'ACLToString',
      'comboToString',
      'makeACLString',
      'putACLObject',
      'putACLbyCombo',
      'fixIndividualCardACL',
      'fixIndividualACL',
      'setACL',
      'getACLorDefault',
      'getACL'
    ]).toEqual(expect.arrayContaining(Object.keys(acl)))
  })

  it('exposes some methods of acl-control module', () => {
    expect(AclControl).toEqual(expect.objectContaining(aclControl))
    expect([
      'preventBrowserDropEvents',
      'shortNameForFolder',
      'ACLControlBox5'
    ]).toEqual(expect.arrayContaining(Object.keys(aclControl)))
  })
})
