import { silenceDebugMessages } from '../helpers/setup'
import { JSDOM } from 'jsdom'
import renderTableViewPane from '../../src/table'

silenceDebugMessages()
const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
const dom = window.document

describe('renderTableViewPane', () => {
  it('exists', () => {
    expect(renderTableViewPane).toBeInstanceOf(Function)
  })
  /*
  it('runs', () => {
    const options = { sourceDocument: null, tableClass: null, query: null }
    expect(renderTableViewPane(document, options)).toEqual(undefined)
  }) */
})
