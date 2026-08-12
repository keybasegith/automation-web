# Reply to IT (Keith) — the `_next/static` folder request

Plain-text, paste-ready. Attach `~/Desktop/keybase-business-card.zip`.

**Subject:** Re: Digital business card — the /_next/ files

---

Hi Keith,

There isn't a subfolder I can send for that file, and I want to explain why rather than have you
keep chasing it. The file you're testing is a saved copy of the live page, not the version built
for your server.

That page is server-rendered, and the /_next/ paths in it aren't all files. The CSS and JS under
/_next/static/chunks/ are real files, but their names contain a build hash plus a deployment ID
(the ?dpl=... on the end). Both change every time we publish, so a copied folder would work today
and break on our next deploy.

More importantly, /_next/image?url=...&w=640&q=75 is not a file at all. It's a live image-resizing
endpoint that runs on the server. Every image on the card — logo, banner, headshot — is requested
through it, so there's nothing I can zip up that would make those URLs resolve on your end. That's
why the images stay broken no matter what we copy across.

The reason it looks empty is the missing stylesheet: all the layout and colour lives in it. The
blank black panel on the back is the QR code, which is drawn by JavaScript that also didn't load.

Use the attached zip instead. It contains business-card-template.html plus a
business-card-assets folder, and that's the build meant for dropping into tcard.aspx:

- One self-contained file. No /_next/ paths, no CDN, no web fonts, no analytics. The only things
  it requests are the three images, from your own server.
- Unzip it with the HTML and the assets folder side by side and it works with no edits. If you
  move the images, point assetBase at their new location — it's in the CARD block at the bottom,
  which is the only part that changes per advisor.
- It degrades cleanly. A missing logo is dropped, a missing banner falls back to a Keybase-green
  gradient, a missing headshot falls back to the advisor's initials. No broken-image icons.
- All the code is wrapped so it defines no global variables and won't clash with jQuery, and every
  element ID is prefixed kb- so it can't collide with IDs already on the page.

One thing worth checking on your side: the copy that came back to me had the em-dashes and
interpuncts mangled (â€” and Â· instead of — and ·). That may have crept in when the page was
saved, but if the served page shows it too, it's the Content-Type header — it should be
text/html; charset=utf-8.

Two things still outstanding from my last note:

1. The final URL each card will live at. The QR code encodes it and it's still a placeholder.
2. Whether inline <script> and <style> are permitted, so I know whether to send the
   no-JavaScript build instead.

Thank you!

Taehee
