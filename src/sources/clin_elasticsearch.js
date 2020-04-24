const R = require('ramda')
const Either = require('data.either')

const errors = require('restify-errors')

const { Client } = require('@elastic/elasticsearch')

const eUtils = require('./clin_elasticsearch_utils')

const { 
    load_mandatory_str_env_var
} = require('../utils')

const client = new Client({ node: load_mandatory_str_env_var('ELASTISEARCH_URL') })

const capitalize = R.compose(
    R.join(''),
    R.juxt([R.compose(R.toUpper, R.head), R.tail])
);

const process_result = R.curry((submitterSampleId, result) => {
    const sample = eUtils.resultAccessors.sampleWithSubmitterId(submitterSampleId)(result)
    sample_specimen = eUtils.resultAccessors.specimenWithId(
        eUtils.sampleAccessors.parentSpecimenId(sample)
    )(result)
    return {
        'matchedNormalSubmitterSampleId': null,
        'sampleId': null, //Could be resolved here, but SONG expects to make a separate call to an ID service
        'specimenId': null, //Could be resolved here, but SONG expects to make a separate call to an ID service
        'submitterSampleId': submitterSampleId,
        'sampleType': eUtils.sampleAccessors.type(sample),
        'specimen': {
            'donorId': null, //Could be resolved here, but SONG expects to make a separate call to an ID service
            'specimenId': null, //Could be resolved here, but SONG expects to make a separate call to an ID service
            'submitterSpecimenId': eUtils.specimenAccessors.submitterId(sample_specimen),
            'specimenType': 'Normal',
            'specimenTissueSource': eUtils.specimenAccessors.type(sample_specimen),
            'tumourNormalDesignation': 'Normal'
        },
        'donor': {
            'donorId': null, //Could be resolved here, but SONG expects to make a separate call to an ID service
            'submitterDonorId': eUtils.resultAccessors.patientSubmitterId(result),
            'studyId': eUtils.resultAccessors.studyId(result),
            'gender': capitalize(eUtils.resultAccessors.patientGender(result))
        }
    }
})

const get_sample_song_metadata  = async (submitterSampleId, studyId) => {
    const search = eUtils.generate_patient_and_search({
        "studies.id":  studyId,
        "samples.container":  submitterSampleId
    })
    try {
        const { body } = await client.search(search)
        return R.compose(
            (result) => Promise.resolve(result),
            eUtils.get_from_first_result(
                process_result(submitterSampleId)
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