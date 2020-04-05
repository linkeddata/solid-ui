import { silenceDebugMessages } from '../helpers/setup'
import { JSDOM } from 'jsdom'
import { newThingUI } from '../../src/create'

silenceDebugMessages()
jest.mock('solid-auth-client')
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window.document
const div = dom.createElement('div')

describe('newThingUI', () => {
  it('exists', () => {
    expect(newThingUI).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(newThingUI({ dom, div }, { dom }, {})).toEqual(undefined)
  })
})
