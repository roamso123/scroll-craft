BIG FELLAS — static site
========================

Upload the contents of this folder to any static host. There is no build step,
no framework and no server: index.html plus two stylesheets, two scripts and
the assets folder.

  index.html        the page
  site.css          this page's design (colours, type, every cut's layout)
  site.js           this page's own behaviour, including the portion switch
  scrollcraft.css   the scroll engine's stylesheet. Not edited per project.
  scrollcraft.js    the scroll engine. Not edited per project.
  assets/           photography, the two plate renders and one clip
  assets/menu/      the restaurant's own dish and bottle photographs

Prices
------
Every price appears twice in index.html, as data-l (Little Fellas) and data-b
(Big Fellas) attributes on the element that shows it. Change them there. There
is no price list in the JavaScript.

All prices were taken from the live Toast ordering page on 2026-11-10.

Photographs
-----------
The storefront, the mural room, the dining room, the Dome and the Cajun shrimp
pasta are the restaurant's own photographs.

The other plates (wings, fifty wings, frites, rice bowl, ribs, the Chubs meal,
the desserts) are renders made to match the house look, standing in for
photographs that do not exist at usable resolution yet. Replace each one with a
real photograph of the real plate when you have it: one src per cut.
