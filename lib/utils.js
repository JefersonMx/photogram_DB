'use strict'

const crypto = require('crypto')

const utils = {
  extractTags,
  encrypt,
  resetText
}

function extractTags (text) {
  if (text == null) return []

  let matches = text.match(/#(\w+)/g)

  if (matches === null) return []

  matches = matches.map(resetText)

  return matches
}

function resetText (text) {
  text = text.toLowerCase()
  text = text.replace(/#/g, '')
  return text
}

function encrypt (password) {
  const shasum = crypto.createHash('sha256')
  shasum.update(password)
  return shasum.digest('hex')
}

module.exports = utils
