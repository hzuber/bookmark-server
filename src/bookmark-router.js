const express = require('express');
const path = require('path')
const xss = require('xss');
const logger = require('./logger');
const BookmarksService = require('./bookmarks-service');

const bookmarkRouter = express.Router();
const bodyParser = express.json();

const sanitizedBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: xss(bookmark.url),
    rating: bookmark.rating,
    description: xss(bookmark.description)
})

bookmarkRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getAllBooksmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks.map(sanitizedBookmark))
            })
            .catch(next)
    })
    .post(bodyParser, (req, res) => {
        const { title, url, rating, description = "" } = req.body;
        const newBookmark = {title, url, rating, description}

        for (const [key, value] of Object.entries(newBookmark)) {
            if(value == null) {
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body`}
                })
            }
        }
        if (title.length > 100 || title.length < 3) {
            logger.error('Title must be between 3 and 100 characters');
            return res
                .status(400)
                .json({error: {message: 'Title must be between 3 and 100 characters'}})
        }
        if( isNaN(rating) || rating < 1 || rating > 5 ){
            return res
                .status(400)
                .json({
                    error: { message: 'Rating must be a number between 1 and 5'}
                })
        }

        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
        .then(bookmark => {
            res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
                .json(sanitizedBookmark(bookmark))
            })
    })

bookmarkRouter
    .route('/:id')
    .all((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getById(knexInstance, req.params.id)
            .then(bookmark => {
                if(!bookmark){
                    return res.status(404).json({
                        error: { message: `Bookmark doesn't exist`}
                    })
                }
                res.bookmark = bookmark
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(sanitizedBookmark(res.bookmark))
    })
    .delete((req, res, next) => {
        BookmarksService.deleteBookmark(
            req.app.get('db'),
            req.params.id
        ).then(() => {
            res.status(204).end()
        })
        .catch(next)
    })
    .patch(bodyParser, (req, res, next) => {
        const { title, url, rating, description } = req.body
        const bookmarkToUpdate = { title, url, rating , description}
        const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
        if (numberOfValues === 0) {
            return res.status(400).json({
                error: {
                    message: `Request body must contain either title, url, description or rating`
                }
            })
        }

        BookmarksService.updateBookmark(
            req.app.get('db'),
            req.params.id,
            bookmarkToUpdate
        )
        .then(numRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
    })

module.exports = bookmarkRouter