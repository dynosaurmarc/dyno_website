# dyno_website

DYNO Rechner-Komponenten inkl. Framer-Embed und optionaler Next.js-Route.

## Neu: Rechner (Altersvorsorgedepot + DYNO bAV)

- Framer Code Component: `components/DynoRechner.tsx`
- Rechenlogik: `lib/calc/*`
- Tests: `tests/*`
- Optional Next.js Route: `app/rechner/page.tsx`

## Framer Integration (kurz)

1. In Framer **Code → New Code File** erstellen.
2. Inhalt von `components/DynoRechner.tsx` einfügen.
3. Komponente auf die `/rechner` Seite ziehen.
4. Props setzen (`defaultNetOutlay`, `defaultYears`, `themePrimary`, `themeBg`, `themeText`, `radius`, `showChart`).
5. Publish.

## Testen

```bash
npm install
npm test
```
