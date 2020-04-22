const R = require('ramda')

const check_params = R.curry((querySchema, logger) => (req, res, next) => {
    const validation = querySchema.validate(req.params);
    if(!validation.error) {
        logger.info({
            'event': 'incoming_request',
            'method': req.method,
            'url': req.url,
            'validation': 'passed'
        })
        next()
    } else {
        logger.info({
            'event': 'incoming_request',
            'method': req.method,
            'url': req.url,
            'validation': 'failed',
            'error': validation.error
        })
        res.status(400).send(validation.error)
    }
})

const get_sample_song_metadata = R.curry((source, logger) => (req, res, next) => {
    source.get_sample_song_metadata(req.params.sampleSubmitterId, req.params.studyId).then((result) => {
        if(result.isRight) {
            logger.debug({
                'event': 'get_sample_metadata_success',
                'method': req.method,
                'url': req.url,
                'source': source.label,
                'sample_submitter_id': req.params.sampleSubmitterId,
                'study_id': req.params.studyId,
                'result': result.value
            })
            res.status(200).send(result.value)
        } else {
            logger.info({
                'event': 'get_sample_metadata_failure',
                'method': req.method,
                'url': req.url,
                'source': source.label,
                'sample_submitter_id': req.params.sampleSubmitterId,
                'study_id': req.params.studyId,
                'error': result.value
            })
            next(result.value)
        }
    })
})

const health_check = R.curry((source, logger) => {
    return (req, res, next) => {
        source.is_healthy().then((isHealthy) => {
            if(isHealthy) {
                logger.info('Health check succeeded')
                res.status(200)
                res.send('ok')
            } else {
                logger.warn('Health check failed')
                res.status(500)
                res.send('not ok')
            }
        }).catch((err) => {
            logger.warn('Health check failed')
            res.status(500)
            res.send('not ok')
        })
    }
})

module.exports = {
    check_params,
    get_sample_song_metadata,
    health_check
}