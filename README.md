# VVS KEM PRO

React + Vite + TypeScript + Tailwind CSS. Kjører lokalt, beregningene skjer i nettleseren.

## Kom i gang

**Enklest:** dobbeltklikk `Start VVS KEM PRO.command` (macOS). Første gang installeres avhengighetene automatisk (krever internett og Node.js 20+).

**Fra terminal:**

```bash
npm install     # kun første gang
npm run dev     # starter på http://localhost:5173
npm test        # kjører beregningstestene mot Excel-fasiten
npm run build   # produksjonsbygg i dist/
```

Hvis `.command`-filen blir blokkert av macOS: høyreklikk → Åpne, eller kjør `chmod +x "Start VVS KEM PRO.command"`.

## Status

| Fase | Innhold | Status |
|---|---|---|
| 1 | Dashbord + Sanitær (trykkfall, spillvann, overvann, bereder) | Ferdig |
| 2–6 | Resterende 8 moduler | Planlagt (se masterplan) |

## Struktur

- `src/engine/` – rene beregningsfunksjoner uten UI-avhengighet, testet i `engine.test.ts`
- `src/components/modules/01_sanitaer/` – sanitærmodulens faner
- `src/components/common/` – felles UI-komponenter
- `src/modules.ts` – register over de 9 modulene

## Verifisering og kjente forbehold

Testene sjekker blant annet trykkbudsjettet (77,85 / 15,57 / 62,28 kPa), Σ R·l = 52,7042547830631 kPa, qS fra `San.kv2.xlsx`, beredervolum fra `San vvb.xlsx` og overvannsareal fra `San.ov.xlsx`.

- Spillvannets **kapasitetsgrenser per dimensjon** er overtatt fra den gamle prototypen og er *ikke* verifisert mot Byggforsk 553.111 / NS 3056.
- Beredermodulen bruker parametrene fra Excel-arket (0,5 kWh/servant, 0,015 kWh/m², ΔT 50 K). Den gamle prototypen brukte andre tall (12 kWh/badekar, 4,5 kWh/dusj, ΔT 50,5 K) som ikke finnes i Excel-filene; disse er ikke tatt med.
