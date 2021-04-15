'use strict'

const test = require('ava')
const utils = require('../lib/utils')

test('Extraer #hashtags de un texto', t => {
  let tags = utils.extractTags('a #picture with tags #picter #ava20 ##Good')

  t.deepEqual(tags, ['picture', 'picter', 'ava20', 'good'])

  tags = utils.extractTags('no tags aaah')
  t.deepEqual(tags, [])

  tags = utils.extractTags()
  t.deepEqual(tags, [])

  tags = utils.extractTags(null)
  t.deepEqual(tags, [])
})
test('Encriptar contraseñas', t => {
  const password = 'foo123'
  const ecrypted = '02b353bf5358995bc7d193ed1ce9c2eaec2b694b21d2f96232c9d6a0832121d1'
  const result = utils.encrypt(password)
  t.is(result, ecrypted)
})
