const express = require('express');
const uuid = require('uuid/v4');
const logger = require('./logger');
const bookmarks = require('./store')

const bookmarkRouter = express.Router();
const bodyParser = express.json();

bookmarkRouter
    .route('/')
    .get((req, res) => {
        res.json(bookmarks)
    })
    .post(bodyParser, (req, res) => {
        const {title, url, rating, description = ""} = req.body;
        const id = uuid();

        if(!title){
            logger.error('Title is required');
            res
                .status(400)
                .send('Title is required')
        }

        if(title.length > 100 || title.length < 3){
            logger.error('Title must be between 3 and 100 characters');
            res
                .status(400)
                .send('Title must be between 3 and 100 characters')
        }
        if(!url){
            logger.error('url is required');
            res
                .status(400)
                .send('url is required')
        }
        if(!rating){
            logger.error('rating is required');
            res
                .status(400)
                .send('rating is required')
        }

        const bookmark = {id, title, url, rating, description};
        bookmarks.push(bookmark);
        res
            .status(201)
            .location('http://localhost:8000/bookmark/:id')
            .send(bookmark)
    })

    bookmarkRouter
                .route('/:id')
                .get((req, res) => {
                    const { id } = req.params;
                    const bookmark = bookmarks.find(bm => bm.id == id)
                    
                    if (!bookmark) {
                        logger.error(`Cannot find bookmark with id ${id}`)
                        res 
                            .status(404)
                            .send(`Cannot find bookmark with id ${id}`)
                    }

                    res
                        .json(bookmark)
                })
                .delete((req, res) => {
                    const { id } = req.params;
                    const bookmarkIndex = bookmarks.findIndex(bm => bm.id == id)

                    if (bookmarkIndex == -1) {
                        logger.error(`Cannot find bookmark with id ${id}`)
                        res 
                            .status(404)
                            .send(`Cannot find bookmark with id ${id}`)
                    }

                    bookmarks.splice(bookmarkIndex, 1);
                    res
                        .status(204)
                        .end()
                })

module.exports = bookmarkRouter