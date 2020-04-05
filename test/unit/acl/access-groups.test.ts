import { silenceDebugMessages } from '../../helpers/setup'
import { AccessGroups } from '../../../src/acl/access-groups'
import { IndexedFormula, graph } from 'rdflib'
import { instantiateAccessGroups } from '../helpers/instantiateAccessGroups'
import { JSDOM } from 'jsdom'
import store from '../../../src/store'

silenceDebugMessages()
jest.mock('solid-auth-client')
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window.document

describe('AccessGroups', () => {
  it('exists', () => {
    expect(AccessGroups).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(instantiateAccessGroups(dom, store)).toBeTruthy()
  })
})

describe('AccessGroups#store', () => {
  it.skip('has a getter', () => {
    expect(instantiateAccessGroups(dom, store).store).toBeInstanceOf(IndexedFormula)
  })
  it.skip('has a setter', () => {
    const groups = instantiateAccessGroups(dom, store)
    const newStore = graph()
    ;(newStore as any).foo = 'bar'
    expect((groups.store as any).foo).toEqual('bar')
  })
})

describe('AccessGroups#render', () => {
  it('exists', () => {
    expect(instantiateAccessGroups(dom, store).render).toBeInstanceOf(Function)
  })
  it.skip('runs', () => {
    expect(instantiateAccessGroups(dom, store).render()).toBeInstanceOf(HTMLDivElement)
  })
})

describe('AccessGroups#addNewURI', () => {
  it('exists', () => {
    expect(instantiateAccessGroups(dom, store).addNewURI).toBeInstanceOf(Function)
  })
  it.skip('runs', async () => {
    expect(await instantiateAccessGroups(dom, store).addNewURI('')).toEqual(undefined)
  })
})
