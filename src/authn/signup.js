import defaultConfig from './config-default'

/**
 * Provides functionality for signing up with a Solid provider
 * @module signup
 */

/**
 * Creates a Signup UI manager
 * @class
 */
export function Signup (config) {
  this.config = config || defaultConfig
}

/**
 * Sets up an event listener to monitor login messages from child window/iframe
 * @method listen
 * @return {Promise<String>} Event listener promise, resolves to user's WebID
 */
Signup.prototype.listen = function listen () {
  const promise = new Promise(function (resolve, reject) {
    const eventMethod = window.addEventListener
      ? 'addEventListener'
      : 'attachEvent'
    const eventListener = window[eventMethod]
    const messageEvent = eventMethod === 'attachEvent'
      ? 'onmessage'
      : 'message'
    eventListener(messageEvent, function (e) {
      const u = e.data
      if (u.slice(0, 5) === 'User:') {
        const user = u.slice(5, u.length)
        if (user && user.length > 0 && user.slice(0, 4) === 'http') {
          return resolve(user)
        } else {
          return reject(user)
        }
      }
    }, true)
  })
  return promise
}

/**
 * Opens a signup popup window, sets up `listen()`.
 * @method signup
 * @static
 * @param signupUrl {String} Location of a Solid server for user signup.
 * @return {Promise<String>} Returns a listener promise, resolves with signed
 *   up user's WebID.
 */
Signup.prototype.signup = function signup (signupUrl) {
  signupUrl = signupUrl || this.config.signupEndpoint
  const width = this.config.signupWindowWidth
  const height = this.config.signupWindowHeight
  // set borders
  const leftPosition = (window.screen.width / 2) - ((width / 2) + 10)
  // set title and status bars
  const topPosition = (window.screen.height / 2) - ((height / 2) + 50)
  const windowTitle = 'Solid signup'
  const windowUrl = signupUrl + '?origin=' +
    encodeURIComponent(window.location.origin)
  const windowSpecs = 'resizable,scrollbars,status,width=' + width + ',height=' +
    height + ',left=' + leftPosition + ',top=' + topPosition
  window.open(windowUrl, windowTitle, windowSpecs)
  const self = this
  return new Promise(function (resolve) {
    self.listen()
      .then(function (webid) {
        return resolve(webid)
      })
  })
}
