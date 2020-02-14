import { JSDOM } from 'jsdom'
import * as RdfLib from 'rdflib'
import Preferences from '../../src/preferences'

jest.mock('rdflib')
jest.mock('solid-auth-client')
const window = new JSDOM('<!DOCTYPE html><p>Hello world</p>').window
const dom = window.document

describe('Preferences', () => {
  it('exists', () => {
    expect(Preferences).toBeInstanceOf(Object)
  })
})

describe('Preferences.value', () => {
  it('exists', () => {
    expect(Preferences.value).toEqual([])
  })
})

describe('Preferences.get', () => {
  it('exists', () => {
    expect(Preferences.get).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(Preferences.get(10)).toEqual(undefined)
  })
})

describe('Preferences.set', () => {
  it('exists', () => {
    expect(Preferences.set).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(Preferences.set(10, 'a')).toEqual(undefined)
  })
})

describe('Preferences.renderPreferencesForm', () => {
  it('exists', () => {
    expect(Preferences.renderPreferencesForm).toBeInstanceOf(Function)
  })
  it('runs', () => {
    const subject = RdfLib.sym('')
    const klass = {}
    const preferencesForm = {}
    const context = { dom }
    expect(Preferences.renderPreferencesForm(
      subject, klass, preferencesForm, context
    )).toBeTruthy()
  })
})

describe('Preferences.recordSharedPreferences', () => {
  it('exists', () => {
    expect(Preferences.recordSharedPreferences).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(Preferences.recordSharedPreferences()).toBeTruthy()
  })
})

describe('Preferences.getPreferencesForClass', () => {
  it('exists', () => {
    expect(Preferences.getPreferencesForClass).toBeInstanceOf(Function)
  })
  it('runs', () => {
    expect(Preferences.getPreferencesForClass()).toBeTruthy()
  })
})