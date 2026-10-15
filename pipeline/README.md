# Card creator

Run `Start Card Creator.command` from the project folder. It uses Node.js when installed, otherwise the Node runtime included in your existing VS Code installation. Keep the terminal open.

Open http://127.0.0.1:4317/ in a browser. For a preview beside your code in your installed VS Code version, run **Open Integrated Browser** from the Command Palette and enter that URL. The Live Preview static server cannot save results; use this server for the creator.

1. Choose a JPG, PNG or WebP image (8 MB maximum), or load the Macron example.
2. Enter the card name and one to three attack names. Damage and effect text are optional; supplied values are preserved.
3. Choose common, uncommon, rare, legendary, mistic, full art, or shiny. The existing MemeCard component supplies the corresponding appearance.
4. The card renders after every input change. Click **Enregistrer dans results** to save a new HTML file and JSON file under `results/`. Each save has a unique name and never replaces an earlier card.

The preview reuses `MemeCard.dc.html`. The original component's internal rarity keys are `common`, `rare` (Uncommon), `epic` (Rare), `legendary`, `mistic`, `fullart`, and `shiny`.

The HTML contains the renderer, React, artwork, and card-back image. It can be opened directly later; fonts may fall back to system fonts without internet. The JSON includes the image as a data URL. Import a JSON to reuse its image, name, attacks, and rarity; other fields regenerate. Keep names under 32 characters, attack names under 36, and effect descriptions under 140 characters to fit the card.

Remaining details are generated locally from rules: theme keywords select the type, rarity sets HP, and missing attack effects/damage receive defaults. No AI API, account, or image upload to a remote service is involved. Ask Codex to rewrite a generated flavor or attack effect when you want more specific improvisation.

The server binds only to the local machine. The page obtains a per-run token for rendering and saving. Stop it with Ctrl+C. To use a different port, set `CARD_PORT` before launch.
