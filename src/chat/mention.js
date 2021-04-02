
const UI = {
  style: require('./mentionStyle')
}

export function createMentionBox (dom, mentionees) {
  const mentionWrapper = dom.createElement('div')
  mentionWrapper.classList.add('mention-select-wrapper')
  mentionWrapper.setAttribute('style', UI.style.mentionSelectWrapperStyle + UI.style.mentionDivStyle)
  mentionWrapper.addEventListener('click', function () {
    this.querySelector('mention-select').classList.toggle('open')
    this.setAttribute('style', UI.style.mentionSelectOpenPlusOptionsStyle)
  })

  mentionWrapper.appendChild(createMentionSelector(dom, mentionees))
  return mentionWrapper
}

const createMentionSelector = (dom, mentionees) => {
  const mentionSelect = dom.createElement('div')
  mentionSelect.classList.add('mention-select')
  mentionSelect.classList.add('open')
  mentionSelect.setAttribute('style', UI.style.mentionSelectStyle + UI.style.mentionSelectOpenPlusOptionsStyle + UI.style.mentionDivStyle)
  mentionSelect.appendChild(createMentionSelectTrigger(dom, mentionees))
  return mentionSelect
}

const createMentionSelectTrigger = (dom, mentionees) => {
  const mentionSelectTrigger = dom.createElement('div')
  mentionSelectTrigger.classList.add('mention-select__trigger')
  mentionSelectTrigger.setAttribute('style', UI.style.mentionSelectTriggerStyle + UI.style.mentionDivStyle)
  mentionSelectTrigger.appendChild(createMentionOptions(dom, mentionees))
  return mentionSelectTrigger
}

const createMentionOptions = (dom, mentionees) => {
  const mentionOptions = dom.createElement('div')
  mentionOptions.classList.add('mention-options')
  mentionOptions.setAttribute('style', UI.style.mentionOptionsStyle + UI.style.mentionDivStyle)
  const options = mentionees.map(function (mentionee) {
    mentionOptions.appendChild(createMentionOption(dom, mentionee))
    return null
  })
  return mentionOptions
}

const createMentionOption = (dom, mentionee) => {
  // parp.uri, parp.id
  const mentionOption = dom.createElement('span')
  mentionOption.classList.add('mention-option')
  mentionOption.setAttribute('style', UI.style.mentionOptionStyle + UI.style.mentionDivSpanStyle)
  mentionOption.textContent = mentionee.uri
  mentionOption.setAttribute('data-value', mentionee.uri)

  mentionOption.addEventListener('click', function () {
    if (!this.classList.contains('selected')) {
      this.parentNode.querySelector('.mention-option.selected').classList.remove('selected')
      this.classList.add('selected')
      this.setAttribute('style', UI.style.mentionOptionSelectedStyle)
      this.closest('.mention-select').querySelector('.mention-select__trigger span').textContent = this.textContent
    }
  })
  return mentionOption
}
