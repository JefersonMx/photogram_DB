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
      }
      if (dbTables.indexOf('users') === -1) {
        await r.db(db).tableCreate('users').run(conn)
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
        public_id: uuid.encode(image.id)
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
    const imageId = uuid.decode(id)

    const task = async () => {
      const conn = await connection
      const image = await r.db(db).table('images').get(imageId).run(conn)
      await r.db(db).table('images').get(imageId).update({
        liked: true,
        likes: image.likes + 1
      }).run(conn)

      const created = await r.db(db).table('images').get(imageId).run(conn)
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
      return Promise.resolve(image)
    }
    return Promise.resolve(task()).asCallback(callback)
  }
}
module.exports = Db
