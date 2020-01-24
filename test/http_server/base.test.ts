import { GTFS } from '@come25136/gtfs'
import { assert } from 'chai'
import { readFile } from 'fs'
import * as req from 'supertest'
import { Connection, createConnection, getManager } from 'typeorm'
import { promisify } from 'util'

import app from '../../app'
import { Remote } from '../../db/entitys/gtfs/remote'

const readFileAsync = promisify(readFile)

let dbConnection: Connection

before(async function () {
  this.timeout(300000)

  dbConnection = await createConnection()

  return readFileAsync(`${__dirname}/../../../test_data/unobus.co.jp.zip`)
    .then(GTFS.importZipBuffer)
    .then(async gtfs =>
      getManager().transaction(async trn =>
        Remote.import(
          'unobus.co.jp',
          gtfs,
          'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          trn
        ))
    )
})

after(async () => dbConnection.close())

describe('swagger ui', () => {
  it('document', async () =>
    req(app)
      .get('/')
      .expect(200))
})

describe('remote ids', () => {
  it('list', async () =>
    req(app)
      .get('/v2')
      .expect(200)
      .then(({ body }) => assert.sameMembers(body, ['unobus.co.jp'])))

    describe('Not found', () => {
      it('/null', async () =>
        req(app)
          .get('/v2/null')
          .expect(404)
          .then(({ body }) =>
            assert.deepEqual(body, {
              error: [
                {
                  message: 'There\'s no remote ID.'
                }
              ]
            })
          ))
    })
  })
})
