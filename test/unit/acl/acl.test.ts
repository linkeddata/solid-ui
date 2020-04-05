import { silenceDebugMessages } from '../../helpers/setup'
import {
  ACLbyCombination,
  ACLToString,
  ACLunion,
  adoptACLDefault,
  comboToString,
  fixIndividualACL,
  fixIndividualCardACL,
  getACL,
  getACLorDefault,
  getProspectiveHolder,
  loadUnionACL,
  makeACLGraph,
  makeACLGraphbyCombo,
  makeACLString,
  putACLbyCombo,
  putACLObject,
  readACL,
  sameACL,
  setACL
} from '../../../src/acl/acl'
import { AgentMapMap, ComboList } from '../../../src/acl/types'
import { sym } from 'rdflib'
import { createLiveStore } from '../helpers/createLiveStore'
import { clearStore } from '../helpers/clearStore'
import globalStore from '../../../src/store'
import ns from '../../../src/ns'
import {
  ACL_LINK,
  DEFAULT_CONTAINER_ACL,
  DEFAULT_CONTAINER_DOC,
  DEFAULT_RESOURCE_ACL,
  DEFAULT_RESOURCE_DOC,
  getAgentMapForAclWithAllAgents,
  getAgentMapForAclWithAllAgentsUsingDefaults, mocks, PROFILE
} from './acl.mocks'
import { loadTurtleIntoGraph } from '../helpers/loadTurtleIntoGraph'
import { createGraphFromTurtle } from '../helpers/createGraphFromTurtle'
import { createAgentMapFromTurtle } from '../helpers/createAgentMapFromTurtle'

silenceDebugMessages()
jest.mock('solid-auth-client')

describe('ACLbyCombination', () => {
  it('exists', () => {
    expect(ACLbyCombination).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(ACLbyCombination({} as AgentMapMap)).toBeInstanceOf(Object)
  })
})

describe('ACLToString', () => {
  it('exists', () => {
    expect(ACLToString).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(ACLToString({} as AgentMapMap)).toEqual('{}')
  })
})

describe('ACLunion', () => {
  it('combines a list of agent maps into one agent map', async () => {
    const agentMapForDefaultACL = await createAgentMapFromTurtle(await mocks.defaultAcl, DEFAULT_RESOURCE_DOC, DEFAULT_RESOURCE_ACL)
    const agentMapForACLWithAllAgents = await createAgentMapFromTurtle(await mocks.aclWithAllAgents, DEFAULT_RESOURCE_DOC, DEFAULT_RESOURCE_ACL)
    const agentMapForDocACL = await createAgentMapFromTurtle(await mocks.docAcl, DEFAULT_CONTAINER_DOC, DEFAULT_CONTAINER_ACL)

    const combinedAgentMap = ACLunion([agentMapForDefaultACL, agentMapForACLWithAllAgents, agentMapForDocACL])

    expect(combinedAgentMap).toEqual(expect.objectContaining({
      agent: {
        'https://example.com/profile/card#me': {
          'http://www.w3.org/ns/auth/acl#Append': true,
          'http://www.w3.org/ns/auth/acl#Control': true,
          'http://www.w3.org/ns/auth/acl#Read': true,
          'http://www.w3.org/ns/auth/acl#Write': true
        }
      },
      agentClass: {
        'http://xmlns.com/foaf/0.1/Agent': {
          'http://www.w3.org/ns/auth/acl#Read': true
        }
      },
      agentGroup: {
        'https://example.com/#group': expect.any(Array)
      },
      origin: {
        'https://example.com/#origin': expect.any(Array)
      },
      originClass: {
        'https://example.com/#originClass': expect.any(Array)
      }
    }))
    expect((combinedAgentMap.agentGroup['https://example.com/#group'] as []).length).toBe(0)
    expect((combinedAgentMap.origin['https://example.com/#origin'] as []).length).toBe(0)
    expect((combinedAgentMap.originClass['https://example.com/#originClass'] as []).length).toBe(0)
  })
})

describe('adoptACLDefault', () => {
  let copiedStore

  beforeAll(async () => {
    await loadTurtleIntoGraph(await mocks.defaultAcl, DEFAULT_RESOURCE_ACL.uri, globalStore)
    copiedStore = adoptACLDefault(DEFAULT_CONTAINER_DOC, DEFAULT_CONTAINER_ACL, DEFAULT_RESOURCE_DOC, DEFAULT_RESOURCE_ACL)
  })
  afterAll(clearStore)

  it('creates a new graph with ACL triples derived from default ACL triples', async () => {
    const expectedStore = await createGraphFromTurtle(await mocks.docAcl, DEFAULT_CONTAINER_ACL.uri)
    expect(copiedStore).toEqualGraph(expectedStore)
  })
})

describe('comboToString', () => {
  it('exists', () => {
    expect(comboToString).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(comboToString({} as ComboList)).toEqual('{}')
  })
})

describe('fixIndividualACL', () => {
  it('exists', () => {
    expect(fixIndividualACL).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(fixIndividualACL(sym('https://test.test#'), [], () => {
    }, () => {
    })).toEqual(undefined)
  })
})

describe('fixIndividualCardACL', () => {
  it('exists', () => {
    expect(fixIndividualCardACL).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(fixIndividualCardACL(sym('https://test.test#'), () => {
    }, () => {
    })).toEqual(undefined)
  })
})

describe('getACL', () => {
  let callbackFunction

  beforeEach(() => (callbackFunction = jest.fn()))

  afterEach(clearStore)

  describe('200 response for doc', () => {
    describe('200 response for acl', () => {
      beforeEach(() => {
        globalStore.fetcher.nowOrWhenFetched = (doc, options, callback) => {
          switch (doc) {
            case DEFAULT_RESOURCE_DOC:
              globalStore.add(DEFAULT_RESOURCE_DOC, ACL_LINK, DEFAULT_RESOURCE_ACL, DEFAULT_RESOURCE_DOC)
              // eslint-disable-next-line standard/no-callback-literal
              return callback(true)
            case DEFAULT_RESOURCE_ACL:
              // eslint-disable-next-line standard/no-callback-literal
              return callback(true)
          }
        }
        getACL(DEFAULT_RESOURCE_DOC, callbackFunction)
      })

      it('should trigger callback with success', () => expect(callbackFunction).toHaveBeenCalledWith(true, 200, DEFAULT_RESOURCE_ACL))
    })

    describe('ACL resource previously set as nonexistant', () => {
      beforeEach(() => {
        globalStore.fetcher.nowOrWhenFetched = (doc, options, callback) => {
          globalStore.add(DEFAULT_RESOURCE_DOC, ACL_LINK, DEFAULT_RESOURCE_ACL, DEFAULT_RESOURCE_DOC)
          globalStore.fetcher.nonexistent[DEFAULT_RESOURCE_ACL.uri] = true
          // eslint-disable-next-line standard/no-callback-literal
          return callback(true)
        }
        getACL(DEFAULT_RESOURCE_DOC, callbackFunction)
      })
      afterEach(() => (globalStore.fetcher.nonexistent = {}))

      it('should trigger callback with 404', () => expect(callbackFunction).toHaveBeenCalledWith(true, 404, DEFAULT_RESOURCE_ACL, `ACL file ${DEFAULT_RESOURCE_ACL} does not exist.`))
    })

    describe('Failing to request ACL resource', () => {
      const errorMessage = 'Some ERROR'
      beforeEach(() => {
        globalStore.fetcher.nowOrWhenFetched = (doc, options, callback) => {
          switch (doc) {
            case DEFAULT_RESOURCE_DOC:
              globalStore.add(DEFAULT_RESOURCE_DOC, ACL_LINK, DEFAULT_RESOURCE_ACL, DEFAULT_RESOURCE_DOC)
              // eslint-disable-next-line standard/no-callback-literal
              return callback(true)
            case DEFAULT_RESOURCE_ACL:
              // eslint-disable-next-line standard/no-callback-literal
              return callback(false, errorMessage, { status: 500 })
          }
        }
        getACL(DEFAULT_RESOURCE_DOC, callbackFunction)
      })

      it('should trigger callback with failure', () => expect(callbackFunction).toHaveBeenCalledWith(true, 500, DEFAULT_RESOURCE_ACL, `Can't read Access Control File ${DEFAULT_RESOURCE_ACL}: ${errorMessage}`))
    })
  })

  describe('no ACL link for resource', () => {
    beforeEach(() => {
      // eslint-disable-next-line standard/no-callback-literal
      globalStore.fetcher.nowOrWhenFetched = (doc, options, callback) => callback(true)
      getACL(DEFAULT_RESOURCE_DOC, callbackFunction)
    })

    it('should trigger callback with failure', () => expect(callbackFunction).toHaveBeenCalledWith(false, 900, `No Link rel=ACL header for ${DEFAULT_RESOURCE_DOC}`))
  })

  describe('failed response for doc', () => {
    beforeEach(() => {
      // eslint-disable-next-line standard/no-callback-literal
      globalStore.fetcher.nowOrWhenFetched = (doc, options, callback) => callback(false, 'Failed response')
      getACL(DEFAULT_RESOURCE_DOC, callbackFunction)
    })

    it('should trigger callback with failure', () => expect(callbackFunction).toHaveBeenCalledWith(false, `Can't get headers to find ACL for ${DEFAULT_RESOURCE_DOC}: Failed response`))
  })
})

describe('getACLorDefault', () => {

})

describe('getProspectiveHolder', () => {
  it('exists', () => {
    expect(getProspectiveHolder).toBeInstanceOf(Function)
  })
  it.skip('runs', async () => {
    expect(await getProspectiveHolder('')).toEqual(undefined)
  })
})

describe('loadUnionACL', () => {
  it('exists', () => {
    expect(loadUnionACL).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(loadUnionACL([], () => {
    })).toEqual(undefined)
  })
})

describe('makeACLGraph', () => {
  it('exists', () => {
    expect(makeACLGraph).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(makeACLGraph(
      createLiveStore(),
      sym('https://test.test#'),
      {} as AgentMapMap,
      sym('https://test.test#')
    )).toEqual(undefined)
  })
})

describe('makeACLGraphbyCombo', () => {
  it('exists', () => {
    expect(makeACLGraphbyCombo).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(makeACLGraphbyCombo(
      createLiveStore(),
      sym('https://test.test#'),
      {} as ComboList,
      sym('https://test.test#'),
      false,
      false
    )).toEqual(undefined)
  })
})

describe('makeACLString', () => {
  it('exists', () => {
    expect(makeACLString).toBeInstanceOf(Function)
  })
  it.skip('runs', () => { // skipping this until serialize is typed correctly
    expect(makeACLString(
      sym('https://test.test#'),
      {} as AgentMapMap,
      sym('https://test.test#')
    )).toEqual(undefined)
  })
})

describe('putACLbyCombo', () => {
  it('exists', () => {
    expect(putACLbyCombo).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(putACLbyCombo(
      createLiveStore(),
      sym('https://test.test#'),
      {} as ComboList,
      sym('https://test.test#'),
      () => {
      }
    )).toEqual(undefined)
  })
})

describe('putACLObject', () => {
  it('exists', () => {
    expect(putACLObject).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(putACLObject(
      createLiveStore(),
      sym('https://test.test#'),
      {} as AgentMapMap,
      sym('https://test.test#'),
      () => {
      }
    )).toEqual(undefined)
  })
})

describe('readACL', () => {
  let agentMap
  const expectedAgentMap = getAgentMapForAclWithAllAgents()
  const expectedAgentMapUsingDefaults = getAgentMapForAclWithAllAgentsUsingDefaults()

  describe('using global store', () => {
    beforeAll(async () => {
      await loadTurtleIntoGraph(await mocks.aclWithAllAgents, DEFAULT_RESOURCE_ACL.uri, globalStore)
      agentMap = readACL(DEFAULT_RESOURCE_DOC, DEFAULT_RESOURCE_ACL)
    })
    afterAll(clearStore)

    it('returns a map with agents', () => expect(agentMap).toEqual(expect.objectContaining(expectedAgentMap)))
  })

  describe('passing store as parameter', () => {
    beforeAll(async () => {
      const store = await createGraphFromTurtle(await mocks.aclWithAllAgents, DEFAULT_RESOURCE_ACL.uri)
      agentMap = readACL(DEFAULT_RESOURCE_DOC, DEFAULT_RESOURCE_ACL, store)
    })

    it('returns a map with agents', () => expect(agentMap).toEqual(expect.objectContaining(expectedAgentMap)))
  })

  describe('passing true for getDefaults', () => {
    beforeAll(async () => {
      const store = await createGraphFromTurtle(await mocks.aclWithAllAgents, DEFAULT_RESOURCE_ACL.uri)
      agentMap = readACL(DEFAULT_RESOURCE_DOC, DEFAULT_RESOURCE_ACL, store, true)
    })

    it('returns a map with agents', () => expect(agentMap).toEqual(expect.objectContaining(expectedAgentMapUsingDefaults)))
  })
})

describe('sameACL', () => {
  let agentMap1, agentMap2
  beforeAll(async () => {
    const store = await createGraphFromTurtle(await mocks.defaultAcl, DEFAULT_RESOURCE_ACL.uri)
    agentMap1 = readACL(DEFAULT_RESOURCE_DOC, DEFAULT_RESOURCE_ACL, store)
  })

  it('returns true for equal agent maps', async () => {
    const store2 = await createGraphFromTurtle(await mocks.defaultAclDuplicate, DEFAULT_RESOURCE_ACL.uri)
    agentMap2 = readACL(DEFAULT_RESOURCE_DOC, DEFAULT_RESOURCE_ACL, store2)

    expect(sameACL(agentMap1, agentMap2)).toBe(true)
  })

  it('returns false for agent maps that differ', async () => {
    const store2 = await createGraphFromTurtle(await mocks.aclWithAllAgents, DEFAULT_RESOURCE_ACL.uri)
    agentMap2 = readACL(DEFAULT_RESOURCE_DOC, DEFAULT_RESOURCE_ACL, store2)

    expect(sameACL(agentMap1, agentMap2)).toBe(false)
  })
})

describe('setACL', () => {
  it('exists', () => {
    expect(setACL).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(setACL(
      sym('https://test.test#'),
      '',
      () => {
      }
    )).toBeUndefined()
  })
})
