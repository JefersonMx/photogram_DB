'use strict'

const uuid = require('uuid-base62')

const fixtures = {
  getImage () {
    return {
      description: 'Disfrutando en #holidays con #family es #awesome',
      url: `https://picter.test/${uuid.v4()}.jpg`,
      likes: 0,
      liked: false,
      user_id: uuid.uuid()
    }
  },
  getImages (n) {
    const images = []
    while (n-- > 0) {
      images.push(this.getImage())
    }
    return images
  }
}
module.exports = fixtures
