import { silenceDebugMessages } from '../helpers/setup'
import { JSDOM } from 'jsdom'
import { deleteRecursive, deleteFolder } from '../../src/folders'
import { graph } from 'rdflib'

silenceDebugMessages()
jest.mock('solid-auth-client')
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window.document

describe('deleteRecursive', () => {
  it('exists', () => {
    expect(deleteRecursive).toBeInstanceOf(Function)
  })
  it.skip('runs', async () => {
    expect(await deleteRecursive()).toEqual(undefined)
  })
})

describe('deleteFolder', () => {
  it('exists', () => {
    expect(deleteFolder).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(deleteFolder({}, graph(), dom)).toBeTruthy()
  })
})
