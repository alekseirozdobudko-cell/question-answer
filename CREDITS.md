# Bass recordings

Instrument: electric bass. Original source credited by the upstream catalogue: **Karoryfer**.
Collection and editing: **tonejs-instruments, Nicholaus P. Brosowsky and contributors**.

- Collection: https://github.com/nbrosowsky/tonejs-instruments
- Original source catalogue: https://github.com/nbrosowsky/tonejs-instruments/blob/master/sample-source-info.txt
- Sample license declared by collection: Creative Commons Attribution 3.0 Unported, https://creativecommons.org/licenses/by/3.0/
- Original sample provider: https://www.karoryfer.com/karoryfer-samples

The original WAV files are in `assets/`.
Application adaptations: mono signed PCM at 22050 Hz, truncation to six seconds; linear-interpolation pitch shifting to adjacent notes, amplitude envelopes and mixing during playback. The bass is recorded, not synthesized. Metronome clicks are synthesized by this application.

Retain this credit and the license link when redistributing the samples or the application.

## Acoustic guitar

The acoustic-guitar voice currently uses an original Karplus–Strong plucked-string synthesis implemented in `src/render.ts`. It does not bundle or redistribute a third-party acoustic-guitar recording, so there are no additional sample attribution or redistribution terms for this voice.

## Synthesizer 1

The synthesizer voice is generated in `src/render.ts` from additive partials. It uses no third-party recordings or sample bank.

## Synthesizer 2

The second synthesizer voice is generated in `src/render.ts` with a procedural model of a hammer transient, detuned strings, inharmonic partials, and pitch-dependent decay. It uses no third-party recordings or sample bank.

## Piano samples

Sample source: **Meta Piano**, Meta Open Sound, https://github.com/facebookincubator/Meta-open-sound. The 88-key upright piano collection is released under **CC0 1.0 Universal**; commercial use, modification, and redistribution are allowed, and attribution is not required.

This app includes one medium-dynamic layer (`Vel03`) for every chromatic key from A0 to C8. The OGG/Opus source files are in `assets/meta-piano/`; the playback bank is converted to mono signed PCM at 22050 Hz and trimmed to five seconds per note in `src/pianoSamples.json`.\n
