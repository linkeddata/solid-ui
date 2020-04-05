import { silenceDebugMessages } from '../../helpers/setup'
import { JSDOM } from 'jsdom'
import { errorMessageBlock } from '../../../src/widgets/error'

silenceDebugMessages()
jest.mock('solid-auth-client')
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window.document

describe('errorMessageBlock', () => {
  it('exists', () => {
    expect(errorMessageBlock).toBeInstanceOf(Function)
  })
  it('creates an error message div', () => {
    expect(errorMessageBlock(dom, 'my error message')).toMatchSnapshot()
  })
  it('escapes the HTML', () => {
    const result = errorMessageBlock(dom, 'my <script> kiddie </script> message')
    expect(result).toMatchSnapshot()
    expect(result.innerHTML.indexOf('<script>')).toEqual(-1)
    expect(result.innerHTML.indexOf('&lt;script&gt;')).toEqual(3)
  })
  it('sets the background color', () => {
    expect(errorMessageBlock(dom, 'my colored message', '#0ff')).toMatchSnapshot()
  })
})
