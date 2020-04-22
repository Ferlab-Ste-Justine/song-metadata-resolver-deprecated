//Library dependencies
const R = require('ramda')
const express = require('express')
const Either = require('data.either')
const Joi = require('@hapi/joi')

//Internal dependencies
const configs = require('./config')
const logger = require('./logger')
const sources = require('./sources')
const middleware = require('./middleware')

//Routing

const server = express()

const nonEmptyString = Joi.string().min(1).required()

server.get('/health',
    middleware.health_check(sources.clin_elasticsearch, logger.livelinessLogger)
)

const sampleSongMetadataParams = Joi.object({
    'studyId': nonEmptyString,
    'sampleSubmitterId': nonEmptyString
})
server.get('/studies/:studyId/samples/with-submitter-id/:sampleSubmitterId/song-metadata',
    middleware.check_params(sampleSongMetadataParams, logger.httpLogger),
    middleware.get_sample_song_metadata(sources.clin_elasticsearch, logger.sourceLogger)
)

server.use(function (req, res, next) {
    logger.httpLogger.info({
        'event': 'unhandled_request',
        'method': req.method,
        'url': req.url
    })
    res.status(404).send('Unknown Url')
})

const err_message = R.path(['body', 'message'])
const err_code = R.path(['body', 'code'])
const err_has_code = R.compose(R.not, R.isNil, err_code)
server.use(function (err, req, res, next) {
    if (err_has_code(err)) {
        const code = err_code(err)
        if(code == 'Unauthorized') {
            res.status(401).send(err_message(err))
        } else if(code == 'Forbidden') {
            res.status(403).send(err_message(err))
        } else if (code == 'NotFound') {
            res.status(404).send(err_message(err))
        } else if (code == 'ServiceUnavailable') {
            res.status(503).send(err_message(err))
        } else {
            res.status(500).send('Undefined Error')
        }
    } else {
        return next(err)
    }
    
})

//Server launch

server.listen(configs.servicePort, function() {
    console.log('%s listening at %s', server.name, server.url)
})