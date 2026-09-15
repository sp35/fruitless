# Fruitless

A browser demo in which a simulated male *Drosophila melanogaster* reacts to fly-only encounter profiles. It runs a spiking model over the full MaleCNS v1.0 connection graph and shows the resulting courtship-related activity.

## Run locally

```bash
python3 -m http.server 4173 --directory dist
```

Open `http://127.0.0.1:4173`.

## What it is

The demo uses four tested relay-stimulation conditions, presented as eight fly cards. It reads pC1, pMP2, pCd-linked DNpe034, and pIP10 activity to label a simulated response as interested, investigating, or not interested. The cards and labels are a playful interface to the model; this is not a living fly, a prediction of natural mate preference, or research validation.

## Data and attribution

`dist/data/` is a derived browser-ready export of the [MaleCNS v1.0 dataset](https://male-cns.janelia.org/download/): 166,700 neurons and 25,582,938 directed connections. MaleCNS is licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); source URLs and checksums are in `dist/data/manifest.json`.

`dist/fly.jpg` is an illustrative photograph by [Rolf Dietrich Brecher](https://commons.wikimedia.org/wiki/File:Drosophila_melanogaster_%E2%99%80_(38978426500).jpg), CC BY 2.0. `dist/fly-profiles.png` contains generated illustrative fly portraits and is not a model input.
