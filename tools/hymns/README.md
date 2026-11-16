# Hymn import tools

How the hymnal carols in the library were made. These are one-off tools, not part of the site build.

1. `ly.cjs` reads a LilyPond score: the `\relative` voices, durations, dots, ties, `\partial`, `\time` and `\key`.
2. `convert.cjs` takes the soprano line as the right-hand melody and works out a chord for each half bar (each bar in 3/4, 2/4 and 6/8) from all four voices. It scores every major, minor, dominant 7th and diminished chord against the notes sounding, gives the bass note and the melody note a bonus, and prefers the common chords of the key.
3. `songs.cjs` lists the source file, target key and any transposition or time change for each carol. Run `node songs.cjs hark` to print a song bar by bar with its chords.
4. `build.cjs` applies hand fixes where a derived chord clashed with a main melody note and writes `built.json`.

Sources (the music is public domain; the LilyPond files are CC BY-NC 4.0):
- Musicam Ecclesiae, [English Hymns](https://github.com/magdalenesacredmusic/English-Hymns)
- Ben Kuhn, [carols](https://github.com/benkuhn/carols)

```
HYMNS_DIR=../English-Hymns CAROLS_DIR=../carols node songs.cjs
```
