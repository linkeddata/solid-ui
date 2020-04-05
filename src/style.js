// Common readable consistent stylesheet
// to avoid using style sheets which are document-global
// and make programmable style toggling with selection, drag over, etc easier

// These must all end with semicolon so they can be appended to.

module.exports = {
  textInputStyle:
    'background-color: #eef; padding: 0.5em;  border: .05em solid #88c;  border-radius:0.2em; font-size: 100%; margin:0.2em; ',
  buttonStyle:
      'background-color: #fff; padding: 0.7em;  border: .01em solid white;  border-radius:0.2em; font-size: 100%;', // 'background-color: #eef;

  iconStyle: 'width: 3em; height: 3em; margin: 0.1em; border-radius: 1em;',
  classIconStyle: 'width: 3em; height: 3em; margin: 0.1em; border-radius: 0; border: 0.1em solid green; padding: 0.2em; background-color: #efe;', // combine with buttonStyle

  messageBodyStyle:
    'white-space: pre-wrap; width: 99%; font-size:100%; border: 0.07em solid #eee; border-radius:0.2em; padding: .3em 0.5em; margin: 0.1em;',
  pendingeditModifier: 'color: #bbb;',
  highlightColor: '#7C4DFF', // Solid lavendar https://design.inrupt.com/atomic-core/?cat=Core

  // Login buttons

  signInButtonStyle: 'padding: 1em; border-radius:0.2em; margin: 2em; font-size: 100%;', // was 0.5em radius
  // Forms

  formBorderColor: '#888888', // originall was brown now grey
  formHeadingColor: '#888888', // originall was brown now grey
  formTextInput: 'font-size: 100%; margin: 0.1em; padding: 0.1em;', // originally used this

  multilineTextInputStyle: 'font-size:100%; white-space: pre-wrap; background-color: #eef;' +
  ' border: 0.07em solid gray; padding: 1em 0.5em; margin: 1em 1em;'
}
