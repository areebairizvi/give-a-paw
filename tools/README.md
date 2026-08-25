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

The canine quiz (`anatomy-quiz.html`) has four modes (multiple choice,
find-and-click, typed answers, matching) over item pools defined in
`script.js` (`QUIZZES`). All 27 full-skeleton bone items carry traced
outlines generated from the skeleton SVG's own paths; refine any outline by
hand in the `?dev=1` editor and paste the updated block over the matching
`items:` entry. Custom quizzes are plain URLs
(`anatomy-quiz.html?quiz=bones&mode=click&parts=scapula,femur`) built by the
Customize panel on the page; slugs derive from item names, so renaming an
item breaks existing links to it.
