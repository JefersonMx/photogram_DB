'use strict'

const r = require('rethinkdb')
const Promise = require('bluebird')
const utils = require('./utils')
const uuid = require('uuid-base62')

const defaultValues = {
  host: '192.168.0.14',
  port: 28015,
  db: 'picter'
}
class Db {
  constructor (options) {
    options = options || {}
    this.host = options.host || defaultValues.host
    this.port = options.port || defaultValues.port
    this.db = options.db || defaultValues.db
  }

  connect (callback) {
    this.connection = r.connect({
      host: this.host,
      port: this.port
    })
    this.connected = true
    const db = this.db
    const connection = this.connection

    const setup = async () => {
      const conn = await connection
      const dbList = await r.dbList().run(conn)

      if (dbList.indexOf(db) === -1) {
        await r.dbCreate(db).run(conn)
      }

      const dbTables = await r.db(db).tableList().run(conn)
      if (dbTables.indexOf('images') === -1) {
        await r.db(db).tableCreate('images').run(conn)
        await r.db(db).table('images').indexCreate('createdAt').run(conn)
        await r.db(db).table('images').indexCreate('userId', { multi: true }).run(conn)
      }
      if (dbTables.indexOf('users') === -1) {
        await r.db(db).tableCreate('users').run(conn)
        await r.db(db).table('users').indexCreate('username').run(conn)
      }

      return conn
    }
    return Promise.resolve(setup()).asCallback(callback)
  }

  disconnect (callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado').asCallback(callback))
    }
    this.connected = false
    return Promise.resolve(this.connection)
      .then((conn) => conn.close())
  }

  saveImage (image, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado').asCallback(callback))
    }
    const connection = this.connection
    const db = this.db

    const task = async () => {
      const conn = await connection
      image.createdAt = new Date()
      image.tags = utils.extractTags(image.description)

      const result = await r.db(db).table('images').insert(image).run(conn)

      if (result.errors > 0) {
        return Promise.reject(new Error(result.first_error))
      }
      image.id = result.generated_keys[0]

      await r.db(db).table('images').get(image.id).update({
        publicId: uuid.encode(image.id)
      }).run(conn)

      const created = await r.db(db).table('images').get(image.id).run(conn)

      return Promise.resolve(created)
    }
    return Promise.resolve(task()).asCallback(callback)
  }

  likeImage (id, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado').asCallback(callback))
    }
    const connection = this.connection
    const db = this.db
    const getImage = this.getImage.bind(this)

    const task = async () => {
      const conn = await connection
      const image = await getImage(id)
      await r.db(db).table('images').get(image.id).update({
        liked: true,
        likes: image.likes + 1
      }).run(conn)

      const created = await getImage(id)
      return Promise.resolve(created)
    }
    return Promise.resolve(task()).asCallback(callback)
  }

  getImage (id, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado').asCallback(callback))
    }
    const connection = this.connection
    const db = this.db
    const imageId = uuid.decode(id)

    const task = async () => {
      const conn = await connection
      const image = await r.db(db).table('images').get(imageId).run(conn)

      if (!image) {
        return Promise.reject(new Error(`image ${imageId} not found`))
      }
      return Promise.resolve(image)
    }
    return Promise.resolve(task()).asCallback(callback)
  }

  getImages (callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado').asCallback(callback))
    }
    const connection = this.connection
    const db = this.db

    const task = async () => {
      const conn = await connection
      const images = await r.db(db).table('images').orderBy({ index: r.desc('createdAt') }).run(conn)
      const result = await images.toArray()

      return Promise.resolve(result)
    }
    return Promise.resolve(task()).asCallback(callback)
  }

  saveUser (user, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado').asCallback(callback))
    }
    const connection = this.connection
    const db = this.db

    const task = async () => {
      const conn = await connection
      user.password = utils.encrypt(user.password)
      user.createdAt = new Date()

      const result = await r.db(db).table('users').insert(user).run(conn)

      if (result.errors > 0) {
        return Promise.reject(new Error(result.first_error))
      }

      user.id = result.generated_keys[0]
      const created = await r.db(db).table('users').get(user.id).run(conn)
      return Promise.resolve(created)
    }
    return Promise.resolve(task()).asCallback(callback)
  }

  getUser (username, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado').asCallback(callback))
    }
    const connection = this.connection
    const db = this.db

    const task = async () => {
      const conn = await connection

      await r.db(db).table('users').indexWait().run(conn)
      const users = await r.db(db).table('users').getAll(username, {
        index: 'username'
      }).run(conn)
      let result = null

      try {
        result = await users.next()
      } catch (e) {
        return Promise.reject(new Error(`user ${username} not found`))
      }

      return Promise.resolve(result)
    }
    return Promise.resolve(task()).asCallback(callback)
  }

  authenticate (username, password, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado').asCallback(callback))
    }

    const getUser = this.getUser.bind(this)

    const task = async () => {
      let user = null
      try {
        user = await getUser(username)
      } catch (e) {
        return Promise.resolve(false)
      }

      if (user.password === utils.encrypt(password)) {
        return Promise.resolve(true)
      }
      return Promise.resolve(false)
    }
    return Promise.resolve(task()).asCallback(callback)
  }

  getImagesByUser (userId, password, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado').asCallback(callback))
    }
    const connection = this.connection
    const db = this.db

    const task = async () => {
      const conn = await connection
      await r.db(db).table('images').indexWait().run(conn)
      const images = await r.db(db).table('images').getAll(userId, { index: 'userId' }).orderBy(r.desc('createdAt')).run(conn)

      const result = await images.toArray()

      return Promise.resolve(result)
    }
    return Promise.resolve(task()).asCallback(callback)
  }

  getImagesByTag (tag, password, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('no conectado').asCallback(callback))
    }
    const connection = this.connection
    const db = this.db
    tag = utils.resetText(tag)

    const task = async () => {
      const conn = await connection
      await r.db(db).table('images').indexWait().run(conn)
      const images = await r.db(db).table('images').filter((img) => {
        return img('tags').contains(tag)
      }).orderBy(r.desc('creatdAt')).run(conn)

      const result = await images.toArray()

      return Promise.resolve(result)
    }
    return Promise.resolve(task()).asCallback(callback)
  }
}
module.exports = Db
