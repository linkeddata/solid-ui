import {
  Session,
  getClientAuthenticationWithDependencies
} from '@inrupt/solid-client-authn-browser'

let authSession
// @ts-ignore
if (!window.authSession) {
  authSession = new Session(
    {
      clientAuthentication: getClientAuthenticationWithDependencies({})
    },
    'mySession'
  )
  // @ts-ignore
  window.authSession = authSession
} else {
  // @ts-ignore
  authSession = window.authSession
}

export default authSession
