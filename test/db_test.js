'use strict'

const test = require('ava')
const Db = require('../lib/db')
const r = require('rethinkdb')
const uuid = require('uuid-base62')
const fixture = require('./fixtures/index')

const dbName = `picter_${uuid.v4()}`
const db = new Db({ db: dbName })

test.before('Conectar base de datos', async t => {
  await db.connect()
  t.true(db.connected, 'Debería conectar')
})
test.after('Desconectar base de datos', async t => {
  await db.disconnect()
  t.false(db.connected, 'Debería desconectar')
})
test.after.always('Borrar base de datos', async t => {
  const conn = await r.connect({ host: '192.168.0.14' })
  await r.dbDrop(dbName).run(conn)
})

test('Grabar imagen', async t => {
  t.is(typeof db.saveImage, 'function', 'saveImage is a function')

  const image = fixture.getImage()
  const created = await db.saveImage(image)
  t.is(created.description, image.description)
  t.is(created.url, image.url)
  t.is(created.likes, image.likes)
  t.is(created.liked, image.liked)
  t.is(created.user_id, image.user_id)
  t.deepEqual(created.tags, ['holidays', 'family', 'awesome'])
  t.is(typeof created.id, 'string')
  t.is(created.public_id, uuid.encode(created.id))
  t.truthy(created.createdAt)
})

test('Like image', async t => {
  t.is(typeof db.likeImage, 'function', 'LikeImage is a function')
  const image = fixture.getImage()
  const created = await db.saveImage(image)
  const result = await db.likeImage(created.public_id)

  t.true(result.liked)
  t.is(result.likes, image.likes + 1)
})

test('Obtener imagen', async t => {
  t.is(typeof db.getImage, 'function', 'getImage is a function')
  const image = fixture.getImage()
  const created = await db.saveImage(image)
  const result = await db.getImage(created.public_id)

  t.deepEqual(created, result)
})
