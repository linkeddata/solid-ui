/* eslint-disable no-console */
import { silenceDebugMessages } from '../helpers/setup'
import * as api from '../../src/index'
import * as log from '../../src/log'
import { JSDOM } from 'jsdom'

silenceDebugMessages()
jest.mock('solid-auth-client')

const window = new JSDOM('<!DOCTYPE html><div id="status"></div>').window
const dom = window.document
const status = dom.getElementById('status')!

describe('log', () => {
  it('is exposed in public API', () => expect(api.log).toBe(log))

  describe('with document', () => {
    beforeEach(() => (log.setInternals(window, dom)))
    afterEach(() => (log.clear()))

    describe('msg', () => {
      beforeEach(() => log.msg('foo'))
      it('adds line to #status', () => expect(status.children.length).toBe(1))
      it('adds time and text to #status', () => expect(status.children[0].innerHTML).toMatch(/\d[\d]?:\d[\d]?:\d[\d]? \[mesg\] foo/))
    })

    describe('order of logs by default', () => {
      beforeEach(() => {
        log.msg('foo')
        log.msg('bar')
      })
      it('should add new messages on bottom', () => expect(status.children[0].innerHTML).toContain('foo'))
    })

    describe('changing order of logs', () => {
      beforeEach(() => {
        log.logAscending()
        log.msg('foo')
        log.msg('bar')
      })
      afterEach(() => (log.logDescending()))
      it('should add new messages on top', () => expect(status.children[0].innerHTML).toContain('bar'))
    })

    describe('warn', () => {
      beforeEach(() => log.warn('bar'))
      it('adds line to #status', () => expect(status.children.length).toBe(1))
      it('adds time and text to #status', () => expect(status.children[0].innerHTML).toMatch(/\d[\d]?:\d[\d]?:\d[\d]? \[warn\] bar/))
    })

    describe('debug', () => {
      beforeEach(() => log.debug('baz'))
      it('does not add line to #status by default', () => expect(status.children.length).toBe(0))
    })

    describe('info', () => {
      beforeEach(() => log.info('foo'))
      it('does not add line to #status by default', () => expect(status.children.length).toBe(0))
    })

    describe('error', () => {
      beforeEach(() => log.error('bar'))
      it('adds line to #status', () => expect(status.children.length).toBe(1))
      it('adds time and text to #status', () => expect(status.children[0].innerHTML).toMatch(/\d[\d]?:\d[\d]?:\d[\d]? \[eror\] bar/))
    })

    describe('success', () => {
      beforeEach(() => log.success('baz'))
      it('does not add line to #status by default', () => expect(status.children.length).toBe(0))
    })

    describe('alert', () => {
      beforeEach(() => (window.alert = jest.fn())) // not supported by JSDOM anyway
      beforeEach(() => (log.alert('foo')))
      it('calls alert', () => expect(window.alert).toHaveBeenCalledWith('foo'))
    })

    describe('clear', () => {
      beforeEach(() => {
        log.msg('bar')
        log.clear()
      })
      it('clears #status', () => expect(status.children.length).toBe(0))
    })

    describe('setLevel', () => {
      afterEach(() => (log.setLevel(log.LogLevel.Error + log.LogLevel.Warning + log.LogLevel.Message)))
      it('can set so only error are logged', () => expect(setLevelAndCallAllLogsAndReturnLengthOfStatusChildren(log.LogLevel.Error)).toBe(2))
      it('can set so only warning are logged', () => expect(setLevelAndCallAllLogsAndReturnLengthOfStatusChildren(log.LogLevel.Warning)).toBe(2))
      it('can set so only message are logged', () => expect(setLevelAndCallAllLogsAndReturnLengthOfStatusChildren(log.LogLevel.Message)).toBe(2))
      it('can set so only success are logged', () => expect(setLevelAndCallAllLogsAndReturnLengthOfStatusChildren(log.LogLevel.Success)).toBe(2))
      it('can set so only info are logged', () => expect(setLevelAndCallAllLogsAndReturnLengthOfStatusChildren(log.LogLevel.Info)).toBe(2))
      it('can set so only debug are logged', () => expect(setLevelAndCallAllLogsAndReturnLengthOfStatusChildren(log.LogLevel.Debug)).toBe(2))
      it('can set so all are logged', () => expect(setLevelAndCallAllLogsAndReturnLengthOfStatusChildren(log.LogLevel.All)).toBe(7))
      it('can set so only error and info are logged', () => expect(setLevelAndCallAllLogsAndReturnLengthOfStatusChildren(log.LogLevel.Error + log.LogLevel.Info)).toBe(3))
    })

    describe('dumpHTML', () => {
      let body
      beforeEach(() => {
        body = log.escapeForXML(dom.body.innerHTML)
        log.dumpHTML()
      })
      it('logs content of document.body', () => expect(status.children[0].innerHTML).toContain(body))
    })
  })

  describe('without document', () => {
    let _log

    beforeEach(() => (log.setInternals(undefined, undefined)))
    beforeEach(() => {
      _log = console.log
      console.log = jest.fn() // could have used jest.spyOn(console, 'log'), but that does not prevent logging to console
    })
    afterEach(() => (console.assert = _log))

    describe('msg', () => {
      beforeEach(() => log.msg('foo'))
      it('calls console.log', () => expect(console.log).toHaveBeenCalledWith('foo'))
    })

    describe('warn', () => {
      beforeEach(() => log.warn('bar'))
      it('calls console.log', () => expect(console.log).toHaveBeenCalledWith('bar'))
    })

    describe('debug', () => {
      beforeEach(() => log.debug('baz'))
      it('does not call console.log', () => expect(console.log).not.toHaveBeenCalled())
    })

    describe('info', () => {
      beforeEach(() => log.debug('foo'))
      it('does not call console.log', () => expect(console.log).not.toHaveBeenCalled())
    })

    describe('error', () => {
      beforeEach(() => log.error('bar'))
      it('calls console.log', () => expect(console.log).toHaveBeenCalledWith('bar'))
    })

    describe('success', () => {
      beforeEach(() => log.success('baz'))
      it('does not call console.log', () => expect(console.log).not.toHaveBeenCalled())
    })

    describe('alert', () => {
      beforeEach(() => (log.alert('foo')))
      it('calls console.log', () => expect(console.log).toHaveBeenCalledWith('foo'))
    })

    describe('clear', () => {
      beforeEach(() => log.clear())
      it('does nothing', () => expect(console.log).not.toHaveBeenCalled())
    })

    describe('setLevel', () => {
      afterEach(() => (log.setLevel(log.LogLevel.Error + log.LogLevel.Warning + log.LogLevel.Message)))
      it('can set so only error are logged', () => expect(setLevelAndCallAllLogsAndReturnConsoleLog(log.LogLevel.Error)).toHaveBeenCalledTimes(2))
      it('can set so only warning are logged', () => expect(setLevelAndCallAllLogsAndReturnConsoleLog(log.LogLevel.Warning)).toHaveBeenCalledTimes(2))
      it('can set so only message are logged', () => expect(setLevelAndCallAllLogsAndReturnConsoleLog(log.LogLevel.Message)).toHaveBeenCalledTimes(2))
      it('can set so only success are logged', () => expect(setLevelAndCallAllLogsAndReturnConsoleLog(log.LogLevel.Success)).toHaveBeenCalledTimes(2))
      it('can set so only info are logged', () => expect(setLevelAndCallAllLogsAndReturnConsoleLog(log.LogLevel.Info)).toHaveBeenCalledTimes(2))
      it('can set so only debug are logged', () => expect(setLevelAndCallAllLogsAndReturnConsoleLog(log.LogLevel.Debug)).toHaveBeenCalledTimes(2))
      it('can set so all are logged', () => expect(setLevelAndCallAllLogsAndReturnConsoleLog(log.LogLevel.All)).toHaveBeenCalledTimes(7))
      it('can set so only error and info are logged', () => expect(setLevelAndCallAllLogsAndReturnConsoleLog(log.LogLevel.Error + log.LogLevel.Info)).toHaveBeenCalledTimes(3))
    })

    describe('dumpHTML', () => {
      beforeEach(() => log.dumpHTML())
      it('does nothing', () => expect(console.log).not.toHaveBeenCalled())
    })
  })
})

function setLevelAndCallAllLogsAndReturnLengthOfStatusChildren (level: number) {
  log.setLevel(level)
  log.msg('msg')
  log.warn('warn')
  log.debug('debug')
  log.info('info')
  log.error('error')
  log.success('success')
  return status.children.length
}

function setLevelAndCallAllLogsAndReturnConsoleLog (level: number) {
  log.setLevel(level)
  log.msg('msg')
  log.warn('warn')
  log.debug('debug')
  log.info('info')
  log.error('error')
  log.success('success')
  return console.log
}
