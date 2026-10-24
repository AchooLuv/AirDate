# Anime index data

`anime-index.json` is a compact, runtime-friendly projection of
[bangumi-data](https://github.com/bangumi-data/bangumi-data), keyed by AniList
media IDs. It supplies Simplified Chinese titles and streaming-platform labels
for the AniList broadcast schedule.

- Source project: <https://github.com/bangumi-data/bangumi-data>
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Package version used at generation time: see `package.json` (`bangumi-data`)
- Regenerate with:

```bash
npm run sync:anime
```

Only the fields required by AirDate are retained: AniList id, original title,
Simplified Chinese title, English title, streaming platform labels and the
first broadcast date. The upstream dataset is not bundled into the browser;
it is read by the server provider only.
