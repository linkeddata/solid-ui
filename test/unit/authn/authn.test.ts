import { silenceDebugMessages } from '../../helpers/setup'
import { JSDOM } from 'jsdom'
import {
  checkUser, // Async
  currentUser, // Sync
  defaultTestUser, // Sync
  filterAvailablePanes, // Async
  findAppInstances, // Async?
  findOriginOwner,
  getUserRoles, // Async
  loadTypeIndexes,
  logIn,
  logInLoadProfile,
  logInLoadPreferences,
  loginStatusBox,
  newAppInstance,
  offlineTestID,
  registerInTypeIndex,
  registrationControl,
  registrationList,
  selectWorkspace,
  setACLUserPublic,
  saveUser,
  solidAuthClient
} from '../../../src/authn/authn'
import { AppDetails, AuthenticationContext } from '../../../src/authn/types'
import { sym } from 'rdflib'

silenceDebugMessages()
jest.mock('solid-auth-client')
const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
const dom = window.document

describe('checkUser', () => {
  it('exists', () => {
    expect(checkUser).toBeInstanceOf(Function)
  })
  it('runs', async () => {
    expect(await checkUser()).toEqual(null)
  })
})

describe('currentUser', () => {
  it('exists', () => {
    expect(currentUser).toBeInstanceOf(Function)
  })
  it('runs', async () => {
    expect(await currentUser()).toEqual(null)
  })
})

describe('defaultTestUser', () => {
  it('exists', () => {
    expect(defaultTestUser).toBeInstanceOf(Function)
  })
  it('runs', async () => {
    expect(await defaultTestUser()).toEqual(null)
  })
})

describe('filterAvailablePanes', () => {
  it('exists', () => {
    expect(filterAvailablePanes).toBeInstanceOf(Function)
  })
  it('runs', async () => {
    expect(await filterAvailablePanes([])).toEqual([])
  })
})

describe('findAppInstances', () => {
  it('exists', () => {
    expect(findAppInstances).toBeInstanceOf(Function)
  })
  it('runs', async () => {
    expect(await findAppInstances({}, sym('https://test.test#'), false)).toBeInstanceOf(Object)
  })
})

describe('findOriginOwner', () => {
  it('exists', () => {
    expect(findOriginOwner).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(findOriginOwner('')).toEqual(false)
  })
})

describe('getUserRoles', () => {
  it('exists', () => {
    expect(getUserRoles).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(getUserRoles()).toBeInstanceOf(Object)
  })
})

describe('loadTypeIndexes', () => {
  it('exists', () => {
    expect(loadTypeIndexes).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(loadTypeIndexes({})).toBeInstanceOf(Object)
  })
})

describe('logIn', () => {
  it('exists', () => {
    expect(logIn).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(logIn({})).toBeInstanceOf(Object)
  })
})

describe('logInLoadProfile', () => {
  it('exists', () => {
    expect(logInLoadProfile).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(logInLoadProfile({})).toBeInstanceOf(Object)
  })
})

describe('logInLoadPreferences', () => {
  it('exists', () => {
    expect(logInLoadPreferences).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(logInLoadPreferences({})).toBeInstanceOf(Object)
  })
})

describe('loginStatusBox', () => {
  it('exists', () => {
    expect(loginStatusBox).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(loginStatusBox(dom, () => {}, {})).toBeInstanceOf(Object)
  })
})

describe('newAppInstance', () => {
  it('exists', () => {
    expect(newAppInstance).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(newAppInstance(dom, {} as AppDetails, () => {})).toBeTruthy()
  })
})

describe('offlineTestID', () => {
  it('exists', () => {
    expect(offlineTestID).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(offlineTestID()).toEqual(null)
  })
})

describe('registerInTypeIndex', () => {
  it('exists', () => {
    expect(registerInTypeIndex).toBeInstanceOf(Function)
  })
  it.skip('runs', async () => {
    expect(await registerInTypeIndex(
      {} as AuthenticationContext,
      sym('https://test.test#'),
      sym('https://test.test#'),
      false
    )).toEqual(undefined)
  })
})

describe('registrationControl', () => {
  it('exists', () => {
    expect(registrationControl).toBeInstanceOf(Function)
  })
  it('runs', async () => {
    expect(await registrationControl(
      {} as AuthenticationContext,
      sym('https://test.test#'),
      sym('https://test.test#')
    )).toEqual(undefined)
  })
})

describe('registrationList', () => {
  it('exists', () => {
    expect(registrationList).toBeInstanceOf(Function)
  })
  it.skip('runs', () => {
    expect(registrationList(
      { dom } as AuthenticationContext,
      {}
    )).toEqual(undefined)
  })
})

describe('selectWorkspace', () => {
  it('exists', () => {
    expect(selectWorkspace).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(selectWorkspace(
      dom,
      {} as AppDetails,
      () => {}
    )).toBeTruthy()
  })
})

describe('setACLUserPublic', () => {
  it('exists', () => {
    expect(setACLUserPublic).toBeInstanceOf(Function)
  })
  it.skip('runs', async () => {
    expect(await setACLUserPublic(
      sym('https://test.test#'),
      sym('https://test.test#'),
      {}
    )).toEqual({})
  })
})

describe('saveUser', () => {
  it('exists', () => {
    expect(saveUser).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(saveUser(
      '',
      {} as AuthenticationContext
    )).toEqual(null)
  })
})

describe('solidAuthClient', () => {
  it('exists', () => {
    expect(solidAuthClient).toBeInstanceOf(Object)
  })
})
