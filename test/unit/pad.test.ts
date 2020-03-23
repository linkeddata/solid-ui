// SHARON IS WORKING ON THIS FILE
// NOT DOING ANYTHING FOR NOW AS SHE WILL CLEAN IT UP LATER

it.skip('only here to make tests run', () => null)

//
// import { JSDOM } from 'jsdom'
// import * as RdfLib from 'rdflib'
// import * as pad from '../../src/pad'
// const widgets = require('../../src/widgets')
//
// jest.mock('rdflib')
// jest.mock('solid-auth-client')
// const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
// const dom = window.document
//
// describe('lightColorHash', () => {
//   it('exists', () => {
//     expect((pad as any).lightColorHash).toBeInstanceOf(Function)
//   })
//   it('returns #ffffff when an author is not provided', () => {
//     // #ffffff is specifically stated in the code to be returned
//     // when there is no author
//     expect((pad as any).lightColorHash(null)).toBe('#ffffff')
//   })
//   it('returns a value when given an author', () => {
//     // #dac2dc is the hash of 'https://sharonstrats.inrupt.net/profile/card#me'
//     const author = { uri: 'https://sharonstrats.inrupt.net/profile/card#me' }
//     expect((pad as any).lightColorHash(author)).toBe('#dac2dc')
//   })
// })
// describe('renderPartipants', () => {
//   it('exists', () => {
//     expect((pad as any).renderPartipants).toBeInstanceOf(Function)
//   })
//   it('runs', () => {
//     const table = dom.createElement('table')
//     const padDoc = null
//     const subject = RdfLib.sym('')
//     const me = 'webId'
//     const options = {}
//     expect(
//       (pad as any).renderPartipants(dom, table, padDoc, subject, me, options)
//     ).toMatchInlineSnapshot(`
//       <table
//         style="margin: 0.8em;"
//       />
//     `)
//   })
//   it('returns without crashing when a person is not returned', () => {
//     // @@ TODO need to mock kb.any and kb.each - not working for some reason
//     // kb is a store
//     const table = dom.createElement('table')
//     const padDoc = null
//     const subject = RdfLib.sym('participation')
//     const me = 'webId'
//     const options = {}
//     expect(
//       (pad as any).renderPartipants(dom, table, padDoc, subject, me, options)
//     ).toMatchInlineSnapshot(`
// <table
//   style="margin: 0.8em;"
// />
// `)
//   })
// })
// describe('participationObject', () => {
//   it('exists', () => {
//     expect((pad as any).participationObject).toBeInstanceOf(Function)
//   })
//
//   it('runs', () => {
//     // TODO: check on arguments
//
//     const subject = null
//     const padDoc = null
//     const me = null
//     expect((pad as any).participationObject(subject, padDoc, me)).resolves.toBe(
//       {}
//     )
//   })
//   it('runs 2', () => {
//     // TODO: check on arguments
//     const spy = jest.spyOn(widgets, 'newThing')
//     const subject = null
//     const padDoc = document
//     const me = 'https://sharonstrats.inrupt.net/profile/card#me'
//     expect((pad as any).participationObject(subject, padDoc, me)).resolves.toBe(
//       {}
//     )
//     expect(spy).toBeCalled()
//   })
// })
// describe('recordParticipation', () => {
//   it('exists', () => {
//     expect((pad as any).recordParticipation).toBeInstanceOf(Function)
//   })
//   const subject = null
//   const padDoc = null
//   const refreshable = true
//   it('runs', () => {
//     expect((pad as any).recordParticipation(subject, padDoc, refreshable)).toBe(
//       undefined
//     )
//   })
// })
// describe('manageParticipation', () => {
//   it('exists', () => {
//     expect((pad as any).manageParticipation).toBeInstanceOf(Function)
//   })
//   const container = dom.createElement('div')
//   const padDoc = null
//   const subject = null
//   const me = null
//   const options = {}
//   it('runs', () => {
//     expect(
//       (pad as any).manageParticipation(
//         dom,
//         container,
//         padDoc,
//         subject,
//         me,
//         options
//       )
//     ).toMatchInlineSnapshot(`
//       <table
//         style="margin: 0.8em;"
//       />
//     `)
//   })
// })
// describe('notepad', () => {
//   it('exists', () => {
//     expect((pad as any).notepad).toBeInstanceOf(Function)
//   })
//
//   it('runs', () => {
//     const padDoc = null
//     const subject = null
//     const me = RdfLib.sym('')
//     const options = {}
//     expect((pad as any).notepad(dom, padDoc, subject, me, options))
//       .toMatchInlineSnapshot(`
//       <table
//         style="padding: 1em; overflow: auto; resize: horizontal; min-width: 40em;"
//       />
//     `)
//   })
//
//   it.skip('should log error that you need to be logged in for pad to be edited', () => {
//     const padDoc = null
//     const subject = null
//     const me = null
//     const options = {}
//     ;(window as any).console = { log: jest.fn() }
//     expect((pad as any).notepad(dom, padDoc, subject, me, options))
//       .toMatchInlineSnapshot(`
//       <table
//         style="padding: 1em; overflow: auto; resize: horizontal; min-width: 40em;"
//       />
//     `)
//     expect(debug.log).toBeCalledWith(
//       'Warning: must be logged in for pad to be edited'
//     )
//   })
//
//   it.skip('status area ...', () => {
//     const padDoc = null
//     const subject = null
//     const me = { uri: 'https://sharonstrats.inrupt.net/profile/card#me' }
//     const options = { statusArea: document.createElement('p') }
//
//     expect(
//       (pad as any).notepad(dom, padDoc, subject, me, options)
//     ).resolves.toMatchInlineSnapshot()
//   })
//
//   // @@ TODO the code itself seems to error where it says 'new'
//   // need to research further
//
//   it.skip('should throw an error when me is provided but no uri', () => {
//     const padDoc = null
//     const subject = null
//     const me = {}
//     const options = {}
//
//     expect(
//       (pad as any).notepad(dom, padDoc, subject, me, options)
//     ).resolves.toBe({})
//   })
// })
