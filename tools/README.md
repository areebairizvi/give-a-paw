# Site maintenance tools

Run these from the repository root with `python tools/<script>.py`. Both are
idempotent, so re-running them is always safe.

## `site_infra.py`

Owns three regions that appear identically in every page. The site has no
build step and no template includes, so these regions are generated rather
than hand-edited across 18 files:

- **the sidebar navigation** — edit `NAV_GROUPS` and re-run, never edit a
  page's `<nav class="sidebar-nav">` directly, or the next run overwrites it
- **the footer credits block** — edit `FOOTER`; it carries the Creative
  Commons attribution the reference meshes legally require, so keep the link
  to `credits.html` intact
- **head metadata** — edit `META` to change a page's description or Open
  Graph title. The generated block sits between `<!-- meta:start -->` and
  `<!-- meta:end -->` markers; leave those in place.

Adding a page means adding it to both `NAV_GROUPS` and `META`, then running
the script. A page missing from `META` is skipped entirely.

## `check_links.py`

Reports three classes of problem across every page and JS file:

- **missing local references** — `src`/`href`/`data-model` targets with no
  matching file. Missing component GLBs are expected and are handled at
  runtime (see below), so treat this list as inventory, not as errors.
- **dead placeholder links** — any remaining `href="#"`. This should stay at
  zero; unpublished files are marked `<li class="pending">` instead.
- **placeholder headshots** — remaining uses of `person-placeholder.jpg`.

## Related conventions

Component GLBs referenced by a case study's `.model-toggle` are HEAD-checked
in `script.js` when the page loads. Components whose file is absent are
removed from the tab strip, and a figure with nothing available collapses to
a short note. Committing a new export therefore makes its tab appear with no
HTML edit, which is why the case-study HTML lists the full component set even
before the meshes exist.

After editing `style.css` or `script.js`, bump the `?v=` number on every page
(`site_infra.py` does not manage those; a one-line `re.sub` over the pages
does it). Returning visitors keep the cached copy otherwise.

## `new_patient.py`

Scaffolds a case study for a new patient:

```
python tools/new_patient.py "Biscuit" --year 2027
```

Creates `biscuit-case-study.html` from `patient-template.html`, adds the page
to `site_infra.py` (Our Patients nav group + META) and regenerates all pages.
`--card` also appends the home-page conveyor card; run that once
`biscuit-photo.jpg` is committed so the card has its portrait. The generated
page needs no assets to be publishable: the 3D figure shows a "still being
prepared" note and grows a tab per committed `biscuit-*.glb`, and download
entries render as "coming soon" until real links replace them. The script
prints the full asset checklist.

## Anatomy quiz data

Both quizzes run the same engine, `quiz-engine.js`, in four modes (multiple
choice, find-and-click with hover preview, typed answers, matching) with
URL-shareable custom part selections. Each page supplies its own data file
before loading the engine:

- `anatomy-quiz.html` -> `quiz-data-canine.js` (28 bones / 16 joints on the
  full skeleton, 7 / 8 on the thoracic limb)
- `human-anatomy-quiz.html` -> `quiz-data-human.js` (23 bones / 15 joints on
  the full skeleton, 8 / 10 on the upper limb)

A data file sets `window.QUIZ_CONFIG = {appId, quizzes, aliases}`. To add a
quiz page, write a third data file and load it before the engine; nothing in
the engine needs to change.

Bone outlines were generated from each skeleton drawing's own vector
geometry rather than traced by hand. The two drawings are built differently:
the canine SVG has one path per bone in labelled layers, while the human SVG
is a single path holding 328 closed subpaths. Either way the workflow was the
same - sample every path, render numbered contact sheets to identify each
one, then emit `points` arrays (single paths simplified, bone clusters
hulled, curved runs outlined as thick polylines). Refine any outline by hand
in the `?dev=1` shape editor and paste the block back over the matching
`items:` entry.

Two things the generator guarantees, both of which the modes depend on:
every item's marker sits inside its own outline, and never inside a smaller
sibling's (otherwise a matching pin would appear on the wrong bone).

Joint markers are generated, not hand-placed: each sits at the midpoint of
the closest pair of points between the two bones that articulate there. Two
guards run afterwards. A new joint landing within 2.5 percent units of an
existing one is dropped rather than shipped, because two markers that close
cannot be told apart by clicking (this is what stopped Acromioclavicular,
1.2 from Shoulder, and Radioulnar, 1.6 from Elbow, going into the human
full-skeleton set; both survive in the zoomed limb set). And where one
outline encloses another - the ribs hull around the sternum - a closest-pair
midpoint is meaningless, so those joints step outward from the inner shape
instead.

Custom quiz links encode slugs derived from item names
(`?quiz=bones&mode=click&parts=femur,patella`), so renaming an item breaks
existing links to it.

`human-upper-limb.svg` is the human skeleton drawing cropped by `viewBox` to
the image-right arm, so the wrist and finger bones are big enough to quiz on.
Cropping rather than sourcing a second drawing keeps one source of truth: the
limb coordinates are the full-image percentages mapped through the crop box.

Group items (ribs, carpals, a row of phalanges) are convex hulls over a
cluster of subpaths, which is why the hand is one Phalanges item rather than
three rows: the fingers fan out, so per-row hulls overlap enough that half of
the distal row would resolve to the middle row under smallest-area-wins. If
you split them, check interior coverage, not just the markers.

The human quiz has no Mandible item: that drawing merges the jaw into the
cranium contour, so there is no honest outline for it. Trace one in the
`?dev=1` editor if it is wanted.

## Home page hero

The hero model switcher is driven by `HERO_MODELS` at the bottom of
`script.js`. Adding a model is one entry there and nothing else: the buttons
are generated, and each file is HEAD-checked on load, so an entry whose GLB
is not committed yet simply does not appear (and the strip hides itself
entirely if fewer than two models resolve). Only the first model's geometry
is downloaded; the rest are fetched when clicked, which keeps the home page
near 0.8 MB of 3D.

Per-model camera framing lives in `HERO_VIEWS`. To set it, open
`index.html?dev=1`: auto-rotate is suspended, and a panel below the hero lets
you orbit each model into place, capture it, and copy a `HERO_VIEWS` block to
paste back over the one in `script.js`. A model with no entry uses
model-viewer's automatic framing, which is the shipped default.

Two things in that code look like fussiness and are not. The capture reads
the field of view from the controls' `goalLogFov` (a natural log) rather than
`getFieldOfView()`, which reports the framing value and never moves when the
user zooms. And the view is applied on a `setTimeout`, not a
`requestAnimationFrame`, because rAF does not fire in a background tab -
which would leave the hero on automatic framing for anyone opening the page
in one.
