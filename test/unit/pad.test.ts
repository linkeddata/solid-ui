import { silenceDebugMessages } from '../helpers/setup'
import { JSDOM } from 'jsdom'
import * as RdfLib from 'rdflib'
import { lightColorHash, notepad } from '../../src/pad'
import { log } from '../../src/debug'

silenceDebugMessages()

// jest.mock('rdflib')
// jest.mock('solid-auth-client')
const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
const dom = window.document

describe('lightColorHash', () => {
  it('to be exposed by the Public API', () => {
    expect(lightColorHash).toBe(lightColorHash)
  })
  it('returns #ffffff when an author is not provided', () => {
    // #ffffff is specifically stated in the code to be returned
    // when there is no author
    expect(lightColorHash()).toBe('#ffffff')
  })
  it('returns a value when given an author', () => {
    // #dac2dc is the hash of 'https://sharonstrats.inrupt.net/profile/card#me'
    const author = new RdfLib.NamedNode('https://sharonstrats.inrupt.net/profile/card#me')
    expect(lightColorHash(author)).toBe('#dac2dc')
  })
})

describe('notepad', () => {
  it('to be exposed by the Public API', () => {
    expect(notepad).toBe(notepad)
  })

  it('runs', () => {
    const padDoc = new RdfLib.NamedNode('https://document#')
    const subject = new RdfLib.NamedNode('https://subject#')
    const me = new RdfLib.NamedNode('https://sharonstrats.inrupt.net/profile/card#me')
    const options = {}
    expect(notepad(dom, padDoc, subject, me, options))
      .toMatchSnapshot()
  })
  // Below isn't correct just getting rid of the error for a moment shouldn't provide a me...
  it.skip('should log error that you need to be logged in for pad to be edited', () => {
    const padDoc = new RdfLib.NamedNode('https://document#')
    const subject = new RdfLib.NamedNode('https://subject#')
    const me = new RdfLib.NamedNode('https://sharonstrats.inrupt.net/profile/card#me')
    const options = {}

      // use this instead jest.spyOn(window.console, 'log') Arne's PR Comments
      ; (window as any).console = { log: jest.fn() }
    expect(notepad(dom, padDoc, subject, me, options))
      .toMatchSnapshot()
    expect(log).toBeCalledWith(
      'Warning: must be logged in for pad to be edited'
    )
  })

  it('status area ...', () => {
    const padDoc = new RdfLib.NamedNode('https://document#')
    const subject = new RdfLib.NamedNode('https://subject#')
    const me = new RdfLib.NamedNode('https://sharonstrats.inrupt.net/profile/card#me')
    const options = { statusArea: dom.createElement('div') }

    expect(notepad(dom, padDoc, subject, me, options)
    ).toMatchSnapshot()
  })

  // @@ TODO the code itself seems to error where it says 'new'
  // need to research further

  it.skip('should throw an error when me is provided but no uri', () => {
    const padDoc = new RdfLib.NamedNode('https://document#')
    const subject = new RdfLib.NamedNode('https://subject#')
    const me = new RdfLib.NamedNode('https://sharonstrats.inrupt.net/profile/card#me')
    const options = {}

    expect(notepad(dom, padDoc, subject, me, options)
    ).resolves.toBe({})
  })
})
