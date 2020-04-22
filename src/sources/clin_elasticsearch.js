const R = require('ramda')
const Either = require('data.either')

const errors = require('restify-errors')

const { Client } = require('@elastic/elasticsearch')

const eUtils = require('./clin_elasticsearch_utils')

const { 
    load_mandatory_str_env_var
} = require('../utils')

const client = new Client({ node: load_mandatory_str_env_var('ELASTISEARCH_URL') })

const process_result = R.curry((submittedSampleId, result) => {
    const sample = eUtils.resultAccesors.sampleWithSubmitterId(submitterId)(result)
    sample_specimen = eUtils.resultAccesors.specimenWithId(
        eUtils.sampleAccesors.parentSpecimentId(sample)
    )(result)
    return {
        'submitterSampleId': submitterSampleId,
        'sampleType': eUtils.sampleAccesors.type(sample),
        'specimen': {
            'submitterSpecimenId': eUtils.specimenAccessors.submitterId(sample_specimen),
            'specimenType': 'Normal',
            'specimenTissueSource': eUtils.specimenAccessors.type(sample_specimen),
            'tumourNormalDesignation': 'Normal'
        },
        'donor': {
            'submitterDonorId': eUtils.resultAccesors.patientSubmitterId(result),
            'studyId': eUtils.resultAccesors.studyId(result),
            'gender': eUtils.resultAccesors.patientGender(result).capitalize()
        }
    }
})

const get_sample_song_metadata  = async (submittedSampleId, studyId) => {
    const search = eUtils.generate_patient_and_search({
        "studies.id":  studyId,
        "samples.container":  submittedSampleId
    })
    try {
        const { body } = await client.search(search)
        return R.compose(
            (result) => Promise.resolve(result),
            eUtils.get_from_first_result(
                process_result(submittedSampleId)
            )
        )(body)
    } catch(err) {
        return Promise.resolve(
            Either.Left(new errors.ServiceUnavailableError({
                cause: err
            }, "Elasticsearch request failed"))
        )
    }
}

const is_healthy = async () => {
    return client.cat.health({'format': 'json'})
}

const label = 'clin-elastisearch'

module.exports = {
    get_sample_song_metadata,
    is_healthy,
    label
}