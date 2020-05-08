![](https://github.com/cr-ste-justine/song-metadata-resolver/workflows/Build/badge.svg)
![](https://github.com/cr-ste-justine/song-metadata-resolver/workflows/Publish/badge.svg)

# About

When submitting an analysis with genome files, SONG expects certain metada fields for each sample that the submitter is unlikely to have.

Those fields are obtainable in Clin's Elasticsearch database, but rather than give the client (and its operator) unfettered to the database, that service was created to return all the information for each sample in the format SONG expects.

The SONG reverse-proxy calls this service to get the missing information and insert it in the analysis creation payload before sending it to SONG.