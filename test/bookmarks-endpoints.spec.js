const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const {testBookmarks} = require('./test-bookmarks')
const {makeMaliciousBookmark} = require('./test-bookmarks')

describe('Bookmarks Endpoints', () => {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
    })
    before('clean the table', () => db('bookmarks').truncate())
    afterEach('clean up table', () => db('bookmarks').truncate())
    after('disconnect from db', () => db.destroy())

    describe('GET /api/bookmarks endpoint', () => {
        context('bookmarks has data', () => {
            beforeEach('insert test bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('GET /bookmarks responds with 200 and the bookmarks', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .expect(200, testBookmarks)
            })
        })
        context('bookmarks has no data', () => {
            it('GET /bookmarks responds with 200 and empty array', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .expect(200, [])
            })
        })
        context('there is a malicious attack article', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([ maliciousBookmark ])
            })

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/bookmarks`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].title).to.eql(expectedBookmark.title)
                        expect(res.body[0].description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })
    describe('GET /api/bookmark/:id endpoint', () => {
        context('bookmarks db has data', () => {
            beforeEach('insert test bookmarks', () => {
                return db.into('bookmarks').insert(testBookmarks)
            })

            it('GET /apibookmarks/:id responds with the bookmark', () => {
                const bookmarkId = 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .expect(200, expectedBookmark)
            })
        })
        context('bookmarks has no data', () => {
            it('responds with 404', () => {
                const bookmarkId = 98765
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .expect(404, { error: { message: `Bookmark doesn't exist` } })
            })
        })
        context('there is a malicious attack article', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([ maliciousBookmark ])
            })

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/bookmarks/${maliciousBookmark.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title)
                        expect(res.body.description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })
    describe('POST bookmarks endpoint', () => {
        const newBookmark = {
            title: 'test bookmark',
            url: 'booking.com',
            rating: 5,
            description: 'test description'
        }
        context('The bookmark to be inserted is valid', () => {
            it('when given valid bookmark, responds with 201 and creates', () => {
                return supertest(app)
                    .post(`/api/bookmarks`) 
                    .send(newBookmark)
                    .expect(201)
                    .expect(res => {
                        const { id, title, url, rating, description } = res.body
                        const insertedBookmark = { id, title, url, rating, description }
                        expect(res.body).to.deep.eql(insertedBookmark)
                        expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                    })
                    .then(postRes =>
                        supertest(app)
                        .get(`/api/bookmarks/${postRes.body.id}`)
                        .expect(postRes.body)
                    )
            })
        })
        context('Bookmark to be inserted is missing a field', () => {
            const requiredFields = ['title', 'url', 'rating'];
            requiredFields.forEach(field => {
                const newNewBookmark = {
                    title: 'test bookmark',
                    url: 'booking.com',
                    rating: 5,}
            
                it(`responds with a 400 and an error message when the '${field} is missing`, () => {
                    delete newNewBookmark[field]
                    return supertest(app)
                        .post('/api/bookmarks')
                        .send(newNewBookmark)
                        .expect(400, {
                            error: { message:   `Missing '${field}' in request body`}
                        })
                })
            })
        })
        context('Bookmark to be inserted has improper fields', () => {
            it('responds with a 400 and an error message when the title is too short', () => {
                newBookmark.title = 'hi'
                return supertest(app)
                    .post('/api/bookmarks')
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: 'Title must be between 3 and 100 characters'}
                    })
            })
            it('responds with a 400 and an error message when the rating is too high', () => {
                newBookmark.title = 'test bookmark'
                newBookmark.rating = 7
                return supertest(app)
                    .post('/api/bookmarks')
                    .send(newBookmark)
                    .expect(400, {
                        error: {message: 'Rating must be a number between 1 and 5'}
                    })
            })
            it('responds with a 400 and an error message when the rating is too low', () => {
                newBookmark.rating = 0
                return supertest(app)
                    .post('/api/bookmarks')
                    .send(newBookmark)
                    .expect(400, {
                        error: {message: 'Rating must be a number between 1 and 5'}
                    })
            })
            it('responds with a 400 and an error message when the rating is not a number', () => {
                newBookmark.rating = 'A'
                return supertest(app)
                    .post('/api/bookmarks')
                    .send(newBookmark)
                    .expect(400, {
                        error: {message: 'Rating must be a number between 1 and 5'}
                    })
            })
        })
        context('sanitizes malicious POST attempts', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

            it('removes XSS attack content', () => {
                return supertest(app)
                    .post(`/api/bookmarks`)
                    .send(maliciousBookmark)
                    .expect(201)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title)
                        expect(res.body.description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })
    describe('DELETE endpoint', () => {
        context('the bookmark is in the database', () => {
            beforeEach('insert test bookmarks', () => {
                return db.into('bookmarks').insert(testBookmarks)
            })
            it('DELETE bookmark responds with a 204 and deletes the bookmark', () => {
                const idToRemove = 2
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                        .get(`/api/bookmarks`)
                        .expect(expectedBookmarks))
            })
        })
        context(`the bookmark doesn't exist`, () => {
            it( `responds with a 404`, () => {
                const idToRemove = 123456
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .expect(404, {error: {message: `Bookmark doesn't exist`}})
                })
        })
    })
    describe(`PATCH /api/bookmarks/:bookmark_id`, () => {
        context(`Given no articles`, () => {
            it(`responds with a 404`, () => {
                const bookmarkId = 123456
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .expect(404, {error: {message: `Bookmark doesn't exist`}})
            })
        })
        context(`Given there are bookmarks in the database`, () => {
            beforeEach(`insert bookmarks`, () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it(`responds with 204 and updates the bookmark`, () => {
                const idToUpdate = 2
                const updateBookmark = {
                    title: 'updated bookmark title',
                    url: 'update.com',
                    rating: 3,
                    description: 'updated description'
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                }
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .expect(expectedBookmark)
                    })
            })
        })
    })
})