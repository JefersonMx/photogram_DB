'use strict'

const test = require('ava')
const Db = require('../lib/db')
const r = require('rethinkdb')
const uuid = require('uuid-base62')
const fixture = require('./fixtures/index')
const utils = require('../lib/utils')

test.beforeEach('Conectar base de datos', async t => {
  const dbName = `picter_${uuid.v4()}`
  const db = new Db({ db: dbName })
  await db.connect()
  t.context.db = db
  t.context.dbName = dbName
  t.true(db.connected, 'Debería conectar')
})
test.afterEach.always('Borrar base de datos', async t => {
  const db = t.context.db
  const dbName = t.context.dbName
  await db.disconnect()
  t.false(db.connected, 'Debería desconectar')

  const conn = await r.connect({ host: '192.168.0.14' })
  await r.dbDrop(dbName).run(conn)
})

test('Grabar imagen', async t => {
  const db = t.context.db
  t.is(typeof db.saveImage, 'function', 'saveImage is a function')

  const image = fixture.getImage()
  const created = await db.saveImage(image)
  t.is(created.description, image.description)
  t.is(created.url, image.url)
  t.is(created.likes, image.likes)
  t.is(created.liked, image.liked)
  t.is(created.userId, image.userId)
  t.deepEqual(created.tags, ['holidays', 'family', 'awesome'])
  t.is(typeof created.id, 'string')
  t.is(created.publicId, uuid.encode(created.id))
  t.truthy(created.createdAt)
})

test('Like imagen', async t => {
  const db = t.context.db
  t.is(typeof db.likeImage, 'function', 'LikeImage is a function')
  const image = fixture.getImage(3)
  const created = await db.saveImage(image)
  const result = await db.likeImage(created.publicId)

  t.true(result.liked)
  t.is(result.likes, image.likes + 1)
})

test('Obtener imagen', async t => {
  const db = t.context.db

  t.is(typeof db.getImage, 'function', 'getImage is a function')

  const image = fixture.getImage()
  const created = await db.saveImage(image)
  const result = await db.getImage(created.publicId)

  t.deepEqual(created, result)
  // t.throws(db.getImage('foo'), /not found/)
})

test('Listar imágenes', async t => {
  const db = t.context.db
  const images = fixture.getImages()
  const saveImages = images.map(img => db.saveImage(img))
  const created = await Promise.all(saveImages)
  const result = await db.getImages()

  t.is(created.length, result.length)
})

test('Grabar usuarios', async t => {
  const db = t.context.db

  t.is(typeof db.saveUser, 'function', 'saveUser is a function')
  const user = fixture.getUser()
  const plainPass = user.password
  const created = await db.saveUser(user)
  t.is(user.username, created.username)
  t.is(user.email, created.email)
  t.is(user.name, created.name)
  t.is(utils.encrypt(plainPass), created.password)
  t.is(typeof created.id, 'string')
  t.truthy(created.createdAt)
})

test('Obtener usuarios', async t => {
  const db = t.context.db
  t.is(typeof db.getUser, 'function', 'getUser is a function')
  const user = fixture.getUser()
  const created = await db.saveUser(user)
  const result = await db.getUser(user.username)

  t.deepEqual(created, result)
})

test('Autenticar usuario', async t => {
  const db = t.context.db

  t.is(typeof db.authenticate, 'function', 'authenticate is a function')

  const user = fixture.getUser()
  const plainPass = user.password
  await db.saveUser(user)

  const success = await db.authenticate(user.username, plainPass)
  t.true(success)

  const fail1 = await db.authenticate(user.username, 'asda')
  t.false(fail1)

  const fail2 = await db.authenticate('test', 'admn12')
  t.false(fail2)
})

test('Listar imágenes por user', async t => {
  const db = t.context.db

  t.is(typeof db.getImagesByUser, 'function', 'getImagesByUser is a function')

  const images = fixture.getImages(10)
  const userId = uuid.uuid()
  const random = Math.round(Math.random() * images.length)

  const saveImage = []
  for (let i = 0; i < images.length; i++) {
    if (i < random) {
      images[i].userId = userId
    }

    saveImage.push(db.saveImage(images[i]))
  }

  await Promise.all(saveImage)

  const result = await db.getImagesByUser(userId)
  t.is(result.length, random)
})

test('Listar imágenes por tag', async t => {
  const db = t.context.db

  t.is(typeof db.getImagesByTag, 'function', 'getImagesByUser is a function')

  const images = fixture.getImages(10)
  const tag = '#ava'
  const random = Math.round(Math.random() * images.length)

  const saveImage = []
  for (let i = 0; i < images.length; i++) {
    if (i < random) {
      images[i].description = tag
    }

    saveImage.push(db.saveImage(images[i]))
  }

  await Promise.all(saveImage)

  const result = await db.getImagesByTag(tag)
  t.is(result.length, random)
})
