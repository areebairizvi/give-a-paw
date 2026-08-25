"""Scaffold a new patient case study.

    python tools/new_patient.py "Name" [--year 2027] [--card]

Creates <slug>-case-study.html from tools/patient-template.html, registers
the page in site_infra.py (nav group "Our Patients" + META), regenerates the
shared regions across all pages, and prints the asset checklist. --card also
appends the patient card to the home-page conveyor (do this once
<slug>-photo.jpg is committed, or the card shows a broken image).

Everything degrades gracefully before assets exist: the 3D figure shows a
"models are still being prepared" note until the first GLB is committed, and
download entries are styled "coming soon" until real links replace them.
"""
import argparse
import pathlib
import re
import subprocess
import sys

TOOLS = pathlib.Path(__file__).resolve().parent
ROOT = TOOLS.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('name', help='Patient name, e.g. "Biscuit"')
    ap.add_argument('--year', default='2027', help='Cohort year for the meta description')
    ap.add_argument('--card', action='store_true',
                    help='Also add the home-page patient card (needs <slug>-photo.jpg)')
    args = ap.parse_args()

    name = args.name.strip()
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    if not slug:
        sys.exit('Could not derive a slug from that name.')
    page = '%s-case-study.html' % slug
    target = ROOT / page
    if target.exists():
        sys.exit('%s already exists; refusing to overwrite.' % page)

    html = (TOOLS / 'patient-template.html').read_text(encoding='utf-8')
    html = html.replace('{{NAME}}', name).replace('{{SLUG}}', slug)
    target.write_text(html, encoding='utf-8')

    infra = TOOLS / 'site_infra.py'
    src = infra.read_text(encoding='utf-8')
    changed = False

    if page not in src:
        # nav: append to the "Our Patients" group, before its closing ]),
        pat = re.compile(r'(\("Our Patients", \[\n(?:.*?\n)*?)(    \]\),)')
        new_line = '        ("%s", "%s"),\n' % (page, name)
        src2, n = pat.subn(lambda m: m.group(1) + new_line + m.group(2), src, count=1)
        if n != 1:
            sys.exit('Could not find the Our Patients nav group in site_infra.py.')
        src = src2
        changed = True

    if '"%s": (' % page not in src:
        desc = ("%s's case study: scan, socket design, and build progress for a "
                "custom 3D-printed prosthetic from the %s cohort.") % (name, args.year)
        meta_entry = ('    "%s": (\n        "%s Case Study",\n        "%s"),\n'
                      % (page, name, desc))
        anchor = '    "credits.html": ('
        if anchor not in src:
            sys.exit('Could not find the credits.html META anchor in site_infra.py.')
        src = src.replace(anchor, meta_entry + anchor, 1)
        changed = True

    if changed:
        infra.write_text(src, encoding='utf-8')

    if args.card:
        index = ROOT / 'index.html'
        t = index.read_text(encoding='utf-8')
        if page not in t:
            card = ('''                            <a class="patient-card" href="%s">
                                <img src="%s-photo.jpg" alt="%s">
                                <span class="patient-caption">
                                    <span class="patient-name">%s</span>
                                    <span class="patient-cta">View case study &rarr;</span>
                                </span>
                            </a>
''' % (page, slug, name, name))
            marker = '                        </div>\n                    </div>\n                </section>\n\n                <section class="playground"'
            if marker not in t:
                print('WARNING: could not find the conveyor end in index.html; add the card by hand.')
            else:
                t = t.replace(marker, card + marker, 1)
                index.write_text(t, encoding='utf-8')
                if not (ROOT / ('%s-photo.jpg' % slug)).exists():
                    print('NOTE: %s-photo.jpg is not committed yet; the new card will '
                          'show a broken image until it is.' % slug)

    subprocess.run([sys.executable, str(infra)], check=True, cwd=str(ROOT))

    print()
    print('Created %s and registered it in the nav and metadata.' % page)
    print()
    print('Asset checklist for %s (commit any of these and the page picks them up):' % name)
    print('  %s-photo.jpg              home-page card portrait (square-ish)' % slug)
    print('  %s-gallery-01..04.jpg     carousel (then uncomment it in the page)' % slug)
    print('  %s-full-prosthetic.glb    3D tabs appear per committed component:' % slug)
    print('  %s-solid-animal.glb       run each export through the usual' % slug)
    print('  %s-attachment-surface.glb 3MF->GLB pipeline (decimate, normals,' % slug)
    print('  %s-mechanical-interface.glb  draco) before committing' % slug)
    print('  %s-solid-interface.glb' % slug)
    print()
    print('Then fill the TODO stats and copy in the page%s.'
          % ('' if args.card else ', and run with --card once the photo exists'))


if __name__ == '__main__':
    main()
