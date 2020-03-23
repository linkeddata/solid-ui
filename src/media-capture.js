/// /////////////////////////////////////////////
//
//   Media input widget
//
//
// Workflow:
// The HTML5 functionality (on mobille) is to prompt for either
// a realtime camera capture , OR a selection from images already ont the device
// (eg camera roll).
//
// The solid alternative is to either take a phtoto
// or access cemra roll (etc) OR to access solid cloud storage of favorite photo almbums.
// (Especially latest taken ones)
//
/* global alert */
import * as debug from './debug'

/** @module mediaCapture */

var $rdf = require('rdflib')
var media = (module.exports = {})

var UI = {
  icons: require('./iconBase'),
  ns: require('./ns'),
  pad: require('./pad'),
  media: media,
  rdf: $rdf,
  store: require('./store'),
  utils: require('./utils'),
  widgets: require('./widgets')
}

// const cameraIcon = require('./noun_Camera_1618446_000000') // load it in JS
const cameraIcon = UI.icons.iconBase + 'noun_Camera_1618446_000000.svg' // Get it from github
const retakeIcon = UI.icons.iconBase + 'noun_479395.svg' // Get it from github

const canvasWidth = '640'
const canvasHeight = '480'

const controlStyle = `border-radius: 0.5em; margin: 0.8em; width: ${canvasWidth}; height:${canvasHeight};`
// const controlStyle = 'border-radius: 0.5em; margin: 0.8em; width: 320; height:240;'
const contentType = 'image/png'

/** A control to capture a picture using camera
 * @param {Docuemnt} dom - The Document object
 * @param {IndexedForumla} store - The quadstore to store data in
 * @param {NamedNode} getImageDoc() - NN of the image file to be created
 * @param {function} doneCallback - Called when a picture has been taken
 */
module.exports.cameraCaptureControl = function cameraCaptureControl (
  dom,
  store,
  getImageDoc,
  doneCallback
) {
  const div = dom.createElement('div')
  var destination, imageBlob, player, canvas

  const table = div.appendChild(dom.createElement('table'))
  const mainTR = table.appendChild(dom.createElement('tr'))
  const main = mainTR.appendChild(dom.createElement('td'))
  main.setAttribute('colspan', '4')

  const buttons = table.appendChild(dom.createElement('tr'))

  buttons
    .appendChild(dom.createElement('td')) // Cancel button
    .appendChild(UI.widgets.cancelButton(dom))
    .addEventListener('click', _event => {
      stopVideo()
      doneCallback(null)
    })

  const retakeButton = buttons
    .appendChild(dom.createElement('td')) // Retake button
    .appendChild(UI.widgets.button(dom, retakeIcon, 'Retake'))
  retakeButton.addEventListener('click', _event => {
    retake()
  })
  retakeButton.style.visibility = 'collapse' // Hide for now

  const shutterButton = buttons
    .appendChild(dom.createElement('td')) // Trigger capture button
    .appendChild(
      UI.widgets.button(dom, UI.icons.iconBase + 'noun_10636.svg', 'Snap')
    )
  shutterButton.addEventListener('click', grabCanvas)
  shutterButton.style.visibility = 'collapse' // Hide for now

  const sendButton = buttons
    .appendChild(dom.createElement('td')) // Confirm and save button
    .appendChild(UI.widgets.continueButton(dom)) // @@ or send icon??
  sendButton.addEventListener('click', _event => {
    saveBlob(imageBlob, destination)
  })
  sendButton.style.visibility = 'collapse' // Hide for now

  function displayPlayer () {
    player = main.appendChild(dom.createElement('video'))
    player.setAttribute('controls', '1')
    player.setAttribute('autoplay', '1')
    player.setAttribute('style', controlStyle)
    if (!navigator.mediaDevices) {
      throw new Error('navigator.mediaDevices not available')
    }
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      player.srcObject = stream
      shutterButton.style.visibility = 'visible' // Enable
      sendButton.style.visibility = 'collapse'
      retakeButton.style.visibility = 'collapse'
    })
  }

  const constraints = {
    video: true
  }

  function retake () {
    main.removeChild(canvas)
    displayPlayer() // Make new one as old one is stuck black
  }

  function grabCanvas () {
    // Draw the video frame to the canvas.
    canvas = dom.createElement('canvas')
    canvas.setAttribute('width', canvasWidth)
    canvas.setAttribute('height', canvasHeight)
    canvas.setAttribute('style', controlStyle)
    main.appendChild(canvas)

    const context = canvas.getContext('2d')
    context.drawImage(player, 0, 0, canvas.width, canvas.height)

    player.parentNode.removeChild(player)

    canvas.toBlob(blob => {
      const msg = `got blob type ${blob.type} size ${blob.size}`
      debug.log(msg)
      destination = getImageDoc()
      imageBlob = blob // save for review
      reviewImage()
      // alert(msg)
    }, contentType) // toBlob
  }

  function reviewImage () {
    sendButton.style.visibility = 'visible'
    retakeButton.style.visibility = 'visible'
    shutterButton.style.visibility = 'collapse' // Hide for now
  }

  function stopVideo () {
    if (player && player.srcObject) {
      player.srcObject.getVideoTracks().forEach(track => track.stop())
    }
  }
  function saveBlob (blob, destination) {
    const contentType = blob.type
    // if (!confirm('Save picture to ' + destination + ' ?')) return
    debug.log(
      'Putting ' + blob.size + ' bytes of ' + contentType + ' to ' + destination
    )
    store.fetcher
      .webOperation('PUT', destination.uri, {
        data: blob,
        contentType: contentType
      })
      .then(
        _resp => {
          debug.log('ok saved ' + destination)
          stopVideo()
          doneCallback(destination)
        },
        err => {
          stopVideo()
          alert(err)
        }
      )
  }

  // Attach the video stream to the video element and autoplay.
  displayPlayer()
  return div
}

/** A button to capture a picture using camera
 * @param {Docuemnt} dom - The Document object
 * @param {IndexedForumla} store - The quadstore to store data in
 * @param {fuunction} getImageDoc - returns NN of the image file to be created
 * @param {function<Node>} doneCallback - called with the image taken
 * @returns {DomElement} - A div element with the buton in it
 *
 * This expacts the buttton to a large control when it is pressed
 */

module.exports.cameraButton = function cameraButton (
  dom,
  store,
  getImageDoc,
  doneCallback
) {
  const div = dom.createElement('div')
  const but = UI.widgets.button(dom, cameraIcon, 'Take picture')
  var control
  function restoreButton (imageDoc) {
    div.removeChild(control)
    div.appendChild(but)
    doneCallback(imageDoc)
  }
  div.appendChild(but)
  but.addEventListener('click', _event => {
    div.removeChild(but)
    control = UI.media.cameraCaptureControl(
      dom,
      store,
      getImageDoc,
      restoreButton
    )
    div.appendChild(control)
  })
  return div
}

/// /////////////////////////////////////// OLD BROKEN

//  Put up a video stream and take a picture
//  In: context.div, dom

UI.media.cameraOLD = function (context, _gotBlob) {
  function takeSnapshot () {
    var dom = context.dom
    var img = dom.createElement('img')
    var ctx
    var width = video.offsetWidth
    var height = video.offsetHeight

    var canvas = context.canvas || document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, width, height)

    img.src = canvas.toDataURL(contentType) // @@@
    context.div.appendChild(img)
  }

  var video = context.dom.createElement('video')
  context.div.appendChild(video)
  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(function (stream) {
      video.src = window.URL.createObjectURL(stream)
      video.addEventListener('click', takeSnapshot)
    })
    .catch(function (error) {
      alert('Could not access the camera. Error: ' + error.name)
    })
  return video
}
