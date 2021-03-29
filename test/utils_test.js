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
