import { AgentDefinisjon } from './types';

export const AGENTER: AgentDefinisjon[] = [
  {
    id: 'agent-01',
    nummer: 1,
    navn: 'VVS-Orkestrator & Prosjektleder',
    kortNavn: 'Orkestrator',
    nsKode: 'Prosjektledelse / QA',
    kategori: 'prosjekt',
    ikon: '🎯',
    standarder: ['NS 8401', 'NS 8402', 'Bygg21', 'Systemmanual 19 Agenter'],
    kjernefunksjon: 'Hovedhjernen som analyserer oppdraget, registrerer prosjektdata, fanger opp manglende koter/trykk (100 %-regelen), etablerer timebudsjett og styrer Agent 02–19.',
    rolleBeskrivelse: 'Prosjektleder og strategisk dirigent for hele VVS-prosjekteringen. Sikrer at ingen beregninger startes uten nødvendige forutsetninger.',
    tilknyttetModulId: 'prosjekt',
    tilknyttetBeregningNavn: 'Prosjektstyring & Ressursallokering',
    seksjoner: [
      {
        tittel: '1. Prosjektregistrering & Administrativt Rammeverk',
        innhold: 'Registrering av prosjektnavn, bygningskategori, BRA, adresse, gnr/bnr, oppdragsgiver og tverrfaglige aktører (ARK, RIB, RIE, RIBr, LARK, kommunal VA-myndighet).'
      },
      {
        tittel: '2. ⚠️ HINT: Manglende Underlag for 100 % Sikkerhet',
        innhold: 'Systematisk kontroll av ufullstendige inndata:\n• (a) VA-kart med koter (IBR/ITR) på kommunal hovedledning/kum for 950 mm tilbakeslagskontroll.\n• (b) Q/p-måling for vanntrykk og sprinklerforsyning fra lokalt vannverk.\n• (c) Brannkonsept fra RIBr for hulrom og seksjonering.\n• (d) Fullstendig romskjema, takhøyder og bruksmønster.'
      },
      {
        tittel: '3. Timeestimat (Tradisjonelt Bransjeestimat vs. Reell AI-tidsbruk)',
        innhold: 'Matrise over tidsforbruk for (a) Underlag & befaring, (b) Beregning & dimensjonering (Agent 03–06, 09, 17, 19), (c) Tverrfaglig koordinering BIM/ITB (Agent 07, 08, 12), (d) Anbud, LCC, tilbud og QA-revisjon (Agent 10, 13, 15, 16, 18).'
      },
      {
        tittel: '4. Kronologisk Handlingsplan (Agent 02–19)',
        innhold: 'Styring av rekkefølge: Agent 17 (3 alternativer) og Agent 19 (Utvendig VA/koter) kjøres først, før Agent 03 (Sanitær) og Agent 04–06. Agent 16 (QA-port) er alltid siste kontroll før leveranse.'
      },
      {
        tittel: '5. Ferdige Super-Kommandoer for Videre Prosess',
        innhold: 'Generering av skreddersydde flertrinnskommandoer for å trigge delprosjektering i kommandosentralen.'
      },
      {
        tittel: '6. Mesterens Huskeliste & Risikoelementer',
        innhold: 'Kritiske oppmerksomhetspunkter knyttet til grunnforhold, koter, leietakertilpasninger og grensesnitt.'
      }
    ],
    sjekkliste: [
      { id: 'a1-1', tekst: 'Gnr/Bnr, adresse og formell byggherre verifisert', standard: 'NS 8401' },
      { id: 'a1-2', tekst: 'VA-kart med innvendige bunn- og toppkoter (IBR/ITR) innhentet', standard: 'VA-norm', kritisk: true },
      { id: 'a1-3', tekst: 'Q/p-trykkmåling fra kommunalt vannverk rekvirert', standard: 'NS-EN 12845', kritisk: true },
      { id: 'a1-4', tekst: 'Brannkonsept fra RIBr mottatt og gjennomgått', standard: 'TEK17 Kap. 11' },
      { id: 'a1-5', tekst: 'Tverrfaglig kontaktliste for ARK, RIB, RIE, RIAu etablert', standard: 'Bygg21' },
      { id: 'a1-6', tekst: 'Timebudsjett satt opp med skille mellom AI-prosjektering og tradisjonell tid', standard: 'NS 8402' },
    ],
    kilder: [
      { navn: 'Systemmanual 19 Agenter', type: 'veileder', kilde: 'VVS KEM PRO Kunnskapsbase' },
      { navn: 'Bygg21 Neste Steg', type: 'veileder', kilde: 'bygg21.no' },
      { navn: 'NS 8401 / NS 8402', type: 'standard', kilde: 'standard.no' },
      { navn: 'TEK17 Forskrift og veiledning', type: 'lov', kilde: 'dibk.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 01: VVS-ORKESTRATOR & PROSJEKTLEDER]
Du opererer nå som Agent 01, hovedhjernen i min VVS-kommandosentral med 19 spesialist-agenter (Agent 01–19). Lever alltid disse 6 seksjonene:
1. PROSJEKTREGISTRERING & KONTAKTINFO: Prosjektnavn, Bygningskategori, BRA, Adresse, Gnr/Bnr, Oppdragsgiver, ARK/RIB/RIE og kommunal VA-myndighet.
2. ⚠️ HINT: MANGLENDE UNDERLAG FOR 100 % SIKKERHET: Sjekk spesielt om det mangler: (a) VA-kart med kotehøyder (IBR/ITR) på kommunal hovedledning/kum for 950 mm tilbakeslagskontroll, (b) Q/p-måling for vanntrykk/sprinkler, (c) Brannkonsept fra RIBr, (d) Romskjema og takhøyder. Formuler konkrete spørsmål til kunde/kommune.
3. TIMEESTIMAT (TRADISJONELT BRANSJEESTIMAT VS. REELL AI-TIDSBRUK INKL. QA): Tabell for (a) Underlag/befaring, (b) Beregning/dimensjonering (Agent 03–06, 09, 17, 19), (c) Koordinering DAK/ITB/Bygg (Agent 07, 08, 12), (d) Anbud, LCC, Tilbud og QA-revisjon (Agent 10, 13, 15, 16, 18).
4. KRONOLOGISK HANDLINGSPLAN (AGENT 02–19): Sett opp rekkefølgen agentene skal kjøres i. Ved nybygg/ombygging skal Agent 17 (3 alternativer), Agent 19 (Utvendig VA/koter) og Agent 03 (Innvendig sanitær) tidlig inn, og Agent 16 (QA) alltid være siste port.
5. FERDIGE "SUPER-KOMMANDOER": Skriv 3 klare copy-paste kommandoer for å kjøre neste steg direkte i chatten.
6. MESTERENS HUSKELISTE & OBS-PUNKTER: De viktigste tekniske og kontraktsmessige fallgruvene i prosjektet.`,
    mesterensHuskeliste: [
      'Gjett ALDRI på manglende kotehøyder i kommunal kum. Feil på 20 cm kan forårsake kloakkoversvømmelse til millioner.',
      'Sjekk alltid om byggherres romprogram har tatt høyde for TEK17 § 14-4 krav til varmesentral (10 m² + 1 % BRA).',
      'Krev skriftlig bekreftelse på Q/p-måling fra vannverket før sprinklerprosjektering låses.'
    ]
  },
  {
    id: 'agent-02',
    nummer: 2,
    navn: 'Fremdrift, Faseplan & Prosjektstyrer',
    kortNavn: 'Fremdrift',
    nsKode: 'Bygg21 / Neste Steg',
    kategori: 'prosjekt',
    ikon: '📅',
    standarder: ['Bygg21 Neste Steg', 'NS 8405', 'NS 8407'],
    kjernefunksjon: 'Sikrer kronologisk, fysisk byggbar rekkefølge fra grunnarbeid, anboring og bunnledninger før støp, til råbygg, sjakter, himling, ITB og prøvedrift.',
    rolleBeskrivelse: 'Fremdriftsplanlegger som forhindrer at feil oppdages for sent (f.eks. glemt utsparing før betongstøp eller manglende tilbakeslagskontroll før grøftelukking).',
    tilknyttetModulId: 'prosjekt',
    tilknyttetBeregningNavn: 'Faseplan & Milepæler',
    seksjoner: [
      {
        tittel: '1. Fase A — Grunn, Grøft og Bunnplate',
        innhold: 'VA-søknad/sanitærabonnement, anboringspunkt, utvendig stoppekran, koteregnskap mot 950 mm-regelen, sandfangkummer, olje-/fettutskillere, bunnledninger med fall og eksakte oppstikkskoordinater FØR RIB armerer og støper bunnplate.'
      },
      {
        tittel: '2. Fase B — Råbygg, Sjakter og Tekniske Rom',
        innhold: 'Låsing av sjaktstørrelser, takhøyder, tekniske rom, driftsvekt med vann til RIB, utsparinger i bærevegger/dekker og innheising av store komponenter (beredere, aggregater, kjeler).'
      },
      {
        tittel: '3. Fase C — Detaljprosjektering og Grensesnitt',
        innhold: 'Kanal- og rørnett i himling, branntromler, kollisjonskontroll (Agent 07), strøm- og SD-lister til RIE/RIAu (Agent 08), innregulering av varme/kjøling/ventilasjon.'
      },
      {
        tittel: '4. Fase D — Utførelse, Vannbehandling, ITB og Prøvedrift',
        innhold: 'Trykktesting, TV-inspeksjon av bunnledninger/stikkledninger, innregulering, fullskalatest (NS 6450), vannkvalitet (VDI 2035) og FDV-overlevering (Agent 18).'
      },
      {
        tittel: '5. ⚠️ HINT for 100 % Sikkerhet',
        innhold: 'Avklaring av kritiske låsepunkter hvor manglende avgjørelser vil stoppe byggeplassen.'
      },
      {
        tittel: '6. Mesterens Huskeliste for Byggeplassfremdrift',
        innhold: 'Praktiske sjekkpunkter for koordinering med forskalingssnekkere, betongentreprenør og maskinentreprenør.'
      }
    ],
    sjekkliste: [
      { id: 'a2-1', tekst: 'Bunnledningskoordinater godkjent av rørlegger før armering påbegynnes', standard: 'Bygg21 Fase 3', kritisk: true },
      { id: 'a2-2', tekst: 'Kotekontroll mot 950 mm-regelen utført før grøftebunn avrettes', standard: 'TEK17 § 15-6/8', kritisk: true },
      { id: 'a2-3', tekst: 'Driftsvekt med vann på beredere og buffertanker meldt til RIB', standard: 'Eurokode / RIB' },
      { id: 'a2-4', tekst: 'Inntransportåpninger for ventilasjonsaggregat og akkumulatortanker sikret', standard: 'Bygg21 Fase 4' },
      { id: 'a2-5', tekst: 'TV-inspeksjon av bunnledning gjennomført før gulvstøp og etter ferdig råbygg', standard: 'NS-EN 13508' },
    ],
    kilder: [
      { navn: 'Bygg21 Neste Steg', type: 'veileder', kilde: 'bygg21.no' },
      { navn: 'NS 3451 Bygningsdelstabell', type: 'standard', kilde: 'standard.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 02: FREMDRIFT, FASEPLAN & PROSJEKTSTYRER]
Du opererer nå som Agent 02. Sett opp kronologisk gjennomføringsplan:
1. FASE A — GRUNN, GRØFT OG BUNNPLATE (HVA MÅ LÅSES ALLER FØRST?):
   - Kommunal VA-søknad/sanitærabonnement, anboringspunkt, utvendig stoppekran, koteregnskap mot 950 mm-regelen, sandfangkummer, olje-/fettutskillere, bunnledninger med fall og eksakte oppstikkskoordinater FØR RIB armerer og støper bunnplate.
2. FASE B — RÅBYGG, SJAKTER OG TEKNISKE ROM: Låsing av sjaktstørrelser, takhøyder, tekniske rom, driftsvekt med vann til RIB og utsparinger i bærevegger/dekker.
3. FASE C — DETALJPROSJEKTERING OG GRENSESNITT: Kanal- og rørnett i himling, branntromler, kollisjonskontroll (Agent 07) og strøm-/SD-lister til RIE/RIAu (Agent 08).
4. FASE D — UTFØRELSE, VANNBEHANDLING, ITB OG PRØVEDRIFT: Trykktesting, TV-inspeksjon av bunnledning/stikkledning, innregulering, fullskalatest (NS 6450) og FDV (Agent 18).
5. ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Støp ALDRI bunnplate før TV-inspeksjon og trykkprøving av bunnledning er signert.',
      'Sørg for at utvendig stoppekran er montert og merket før provisorisk byggevann kobles til.',
      'Hold av 1–3 måneders prøvedrift før formell overtakelse iht. NS 6450.'
    ]
  },
  {
    id: 'agent-03',
    nummer: 3,
    navn: 'Innvendig Sanitær, Bunnledninger & Vannfordeling',
    kortNavn: 'Innvendig Sanitær',
    nsKode: 'Kode 310',
    kategori: 'fag',
    ikon: '🚰',
    standarder: ['TEK17 § 15-5/15-6', 'NS-EN 806', 'NS-EN 1717', 'NS-EN 12056', 'Byggforsk 553.115'],
    kjernefunksjon: 'Ansvarlig for alt innvendig sanitær fra og med innvendig hovedstoppekran, vannmåler, BA-ventil, fordelerskap, varmtvannskapasitet og bunnledninger (45° Y-gren, stakegren, over tak).',
    rolleBeskrivelse: 'Sanitæringeniør og rørleggermester med ansvar for hygienisk drikkevannsforsyning, sikker avløpshåndtering og ufeilbarlig rørføring innvendig.',
    tilknyttetModulId: 'sanitaer',
    tilknyttetBeregningNavn: 'Trykkfall KV/VV, Spillvann & Bereder',
    seksjoner: [
      {
        tittel: '1. Vanninntak, Hovedstoppekran og Tilbakeslagssikring (NS-EN 806 / NS-EN 1717)',
        innhold: 'Innføring i varerør med radontett mansjett gjennom bunnplate. Hovedstoppekran, smussfilter, vannmålerkonsoll med konsollbrakett, trykkreduksjonsventil og væskekategori 1–5 tilbakeslagssikring (BA-tilbakeslagsventil med trakt til sluk for kategori 4 på vaskehall/storkjøkken).'
      },
      {
        tittel: '2. Vannmengder, Hovedstammer, Forgreninger og Fordelerskap',
        innhold: 'Summert vannmengde q_S og sannsynlig maksimal vannmengde q_dim for KV, VV og VVC.\nDimensjonering av hovedstammer (Mapress rustfritt/kobber eller Sanipex/Uponor, maks 1,5–2,0 m/s).\nRør-i-rør fordelerskap med vanntett bunn, avstengning per kurs og drensrør til rom med sluk.\nBerederdimensjonering for spissbelastning (min 70 °C i tank, 60–65 °C VVC).'
      },
      {
        tittel: '3. Spesialutstyr Innvendig',
        innhold: 'Frostfrie utekraner/spylekraner i fasade og teknisk rom. Nøddusj og øyevask med temperert vann for kjemikalie-/batterirom. Sluk i tekniske rom (Blücher/Joti med klemring) og trakt for sikkerhetsventiler og kondensavløp.'
      },
      {
        tittel: '4. Innvendige Bunnledninger, Fallstammer og Rørdel-regler (NS-EN 12056)',
        innhold: 'Avløpsenheter (DU) og spillvannsmengde q_ww. Min Ø110 for WC, Ø75/Ø110 for sluk. Fall 1:60.\nUFRAVIKELIGE RØRDEL-REGLER:\n• Kun 45° grenrør (Y-gren) i liggende bunnledning (ALDRI 88° T-rør!).\n• Ved overgang fra vertikal fallstamme til liggende bunnledning: 2 × 45° bend med mellomstykke (min 200–250 mm).\n• Stake-/spylegren ved foten av hver fallstamme og før utgang grunnmur.\n• Hovedlufting min DN110 ført uinnsnevret over yttertak.\n• KOTEKONTROLL: Hvis laveste sluk er under 950 mm over kommunal ITR, kreves avløpspumpestasjon (NS-EN 12050).'
      },
      {
        tittel: '5. ⚠️ HINT for 100 % Sikkerhet',
        innhold: 'Avdekking av underdimensjonerte beredervolum, manglende BA-ventiler eller risiko for stillestående vann.'
      },
      {
        tittel: '6. Mesterens Huskeliste for Innvendig Sanitær',
        innhold: 'Kritiske krav til klamring, ekspansjonsopptak, isolasjon mot kondens/støy og lekkasjesikring.'
      }
    ],
    sjekkliste: [
      { id: 'a3-1', tekst: 'Radontetting rundt varerør ved gjennomføring i bunnplate prosjektert', standard: 'TEK17 § 13-5', kritisk: true },
      { id: 'a3-2', tekst: 'BA-tilbakeslagsventil med åpent avløp/trakt prosjektert for væskekategori 4', standard: 'NS-EN 1717', kritisk: true },
      { id: 'a3-3', tekst: 'Forbud mot 88° T-rør i liggende bunnledning eksplisitt spesifisert (kun 45° Y-gren)', standard: 'NS-EN 12056', kritisk: true },
      { id: 'a3-4', tekst: 'Overgang fallstamme til bunnledning prosjektert med 2x45° bend + mellombend (min 200 mm)', standard: 'Byggforsk 553.115' },
      { id: 'a3-5', tekst: 'Stakeluker plassert ved foten av alle fallstammer og før grunnmur', standard: 'NS-EN 12056' },
      { id: 'a3-6', tekst: 'Varmtvannskapasitet verifisert mot spissbelastning (f.eks. dusjvakt)', standard: 'NS-EN 806-2', kritisk: true },
      { id: 'a3-7', tekst: 'VVC sirkulasjonstemperatur holder min. 65 °C tur / min. 60 °C retur mot Legionella', standard: 'TEK17 § 15-5' },
      { id: 'a3-8', tekst: 'Rør-i-rør fordelerskap har vanntett utførelse med drensrør ført til rom med sluk', standard: 'TEK17 § 15-5' },
    ],
    kilder: [
      { navn: 'TEK17 Kapittel 15 (§ 15-5, § 15-6)', type: 'lov', kilde: 'dibk.no' },
      { navn: 'NS-EN 806 Drikkevannsanlegg', type: 'standard', kilde: 'standard.no' },
      { navn: 'NS-EN 1717 Tilbakeslagssikring', type: 'standard', kilde: 'standard.no' },
      { navn: 'NS-EN 12056 Avløpsinstallasjoner', type: 'standard', kilde: 'standard.no' },
      { navn: 'Geberit / Uponor / Sanipex tekniske håndbøker', type: 'leverandor', kilde: 'geberit.no / uponor.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 03: INNVENDIG SANITÆR, BUNNLEDNINGER & VANNFORDELING (KODE 310)]
Du opererer nå som Agent 03. Prosjekter innvendig sanitæranlegg i tett samspill med Agent 19 (Utvendig VA):
1. VANNINNTAK, HOVEDSTOPPEKRAN OG TILBAKESLAGSSIKRING (NS-EN 806 / NS-EN 1717):
   - Beskriv innføring i varerør med radontett mansjett gjennom bunnplate, hovedstoppekran, smussfilter, vannmålerkonsoll, trykkreduksjonsventil og tilbakeslagssikring iht. væskekategori 1–5 (f.eks. BA-ventil med trakt til sluk for kat. 4 på verksted/storkjøkken).
2. VANNMENGDER, HOVEDSTAMMER, FORGRENINGER OG FORDELERSKAP:
   - Beregn summert vannmengde og sannsynlig største vannmengde (q_max i l/s) for KV, VV og VVC.
   - Dimensjoner hovedstammer og forgreninger (Mapress rustfritt/kobber eller Sanipex/Uponor, maks hastighet 1,5–2,0 m/s) og spesifiser rør-i-rør fordelerskap med vanntett bunn, stengeventiler per kurs og drensrør ("siklemikk") til rom med sluk.
   - Dimensjoner VV-akkumulering/beredervolum ved samtidige dusjer (min. 70 °C i bereder / 60 °C på VVC).
3. SPESIALUTSTYR INNVENDIG:
   - Frostfrie utekraner/spylekraner i fasade, vaskehall og teknisk rom, nøddusjer/øyevask med temperert vann, sluk i tekniske rom (Blücher/Joti med klemring) og trakt for sikkerhetsventiler/kondens.
4. INNVENDIGE BUNNLEDNINGER, FALLSTAMMER, GRENRØR OG STAKE-/SPYLEGREN (NS-EN 12056):
   - Beregn avløpsenheter (DU) og spillvannsmengde (q_ww), samt innvendige taknedløp (f.eks. Geberit Pluvia eller selvfall).
   - Dimensjoner bunnledninger og oppstikk (min. Ø110 for WC, Ø75/Ø110 for sluk) med spesifisert fall (f.eks. 1:60).
   - UFRAVIKELIGE RØRDEL-REGLER: Kun 45° grenrør (Y-gren) i liggende bunnledning og horisontale forgreninger (ALDRI 88° T-rør!). Ved overgang fra vertikal fallstamme til liggende bunnledning SKAL det brukes 2 x 45° bend med mellombend/hvilebend (min. 200–250 mm).
   - Spesifiser stake-/spylegren (stakeluker) ved foten av hver fallstamme, ved retningsendringer og før utgang grunnmur, samt hovedlufting (min. DN110) ført uinnsnevret over tak.
   - Kontroller kotehøyde på laveste innvendige sluk mot Agent 19 og 950 mm-regelen! Hvis laveste sluk ligger lavere enn 950 mm over ITR på kommunal hovedledning, dimensjoner innvendig avløpspumpestasjon (NS-EN 12050).
5. ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Bruk aldri 88° T-rør i liggende avløp. Papir og faste stoffer vil hope seg opp og gi umiddelbar blokkering.',
      'Sjekk at berederen har tilstrekkelig kolbeeffekt eller vekslerkapasitet til å gjeninnhente temperaturen før neste vakt.',
      'Påse at spylekraner og utekraner er selvtømmende og frostsikre med godkjent tilbakeslagssikring.'
    ]
  },
  {
    id: 'agent-04',
    nummer: 4,
    navn: 'Varme, Kjøling & Hydroniske Systemer',
    kortNavn: 'Varme/Kjøling',
    nsKode: 'Kode 320 / 350',
    kategori: 'fag',
    ikon: '🔥',
    standarder: ['NS-EN 12828', 'NS-EN 12831', 'VDI 2035', 'TEK17 Kap. 14'],
    kjernefunksjon: 'Dimensjonering av hydroniske varme- og kjøleanlegg: Varmepumper, kjeler, fjernvarme, gulvvarme, radiatorer, isvann, rørnett, shuntgrupper, ekspansjon og avgassing.',
    rolleBeskrivelse: 'Hydronikkekspert som sikrer energieffektiv varme- og kjøledistribusjon, hydraulisk balanse og korrekt trykkholding.',
    tilknyttetModulId: 'varme',
    tilknyttetBeregningNavn: 'Varmeeffekt, Massestrøm & Trykktap',
    seksjoner: [
      {
        tittel: '1. Effektbehov, Temperaturregime (ΔT) og Massestrøm',
        innhold: 'Dimensjonerende varmeeffekt P (kW), valgt tur/retur-temperatur (f.eks. 40/30 °C gulvvarme, 55/45 °C radiatorer, 7/12 °C isvann) og beregnet massestrøm q = P / (c · ΔT) i l/s og m³/h.'
      },
      {
        tittel: '2. Rørdimensjonering, Shuntgrupper og Balansering',
        innhold: 'Trykktapsbegrensning R ≤ 100–150 Pa/m. Trykkfall i rørnett, vekslere og ventiler. Dynamiske innreguleringsventiler / PIBCV (f.eks. Danfoss AB-QM eller IMI TA-Modulator).'
      },
      {
        tittel: '3. Pumper, Ekspansjonskar og Sikkerhetsventiler (NS-EN 12828)',
        innhold: 'Sirkulasjonspumper (Grundfos Magna3 / Wilo Stratos MAXO) med kurvevalg. Trykkekspansjonskar beregnet etter vannvolum, fortrykk og statisk høyde. Sikkerhetsventil med utblåsningsrør ført til åpen trakt/sluk.'
      },
      {
        tittel: '4. Vannbehandling og Måling (VDI 2035)',
        innhold: 'Automatisk vannpåfylling med BA-tilbakeslagssikring og vannmåler. Vakuumavgasser, mikrobobleutskiller og magnetittfilter (delstrømsfilter). Ultralyd energimålere for nøyaktig energiregnskap.'
      },
      {
        tittel: '5. ⚠️ HINT for 100 % Sikkerhet',
        innhold: 'Kontroll av ekspansjonskarstørrelse, buffervolum mot varmepumpestopp og trykkfall over reguleringsventiler.'
      },
      {
        tittel: '6. Mesterens Huskeliste for Hydroniske Anlegg',
        innhold: 'Krav til spyling, trykktesting, glykolblandinger, kavitering og termisk ekspansjon i lukkede kretser.'
      }
    ],
    sjekkliste: [
      { id: 'a4-1', tekst: 'Maksimalt trykktap i rørstrekk holdt under 150 Pa/m', standard: 'NS-EN 12828' },
      { id: 'a4-2', tekst: 'PIBCV / trykkuavhengige reguleringsventiler spesifisert for alle kurser', standard: 'God praksis' },
      { id: 'a4-3', tekst: 'Ekspansjonskar dimensjonert med hensyn til totalt systemvolum og statisk kotehøyde', standard: 'NS-EN 12828', kritisk: true },
      { id: 'a4-4', tekst: 'Sikkerhetsventilens avblåsningsrør ført usperret til gulvsluk/trakt', standard: 'TEK17 § 15-5', kritisk: true },
      { id: 'a4-5', tekst: 'Magnetittfilter og vakuumavgasser prosjektert iht. VDI 2035', standard: 'VDI 2035' },
      { id: 'a4-6', tekst: 'Energimålere plassert med nødvendig rettstrekk før og etter måleren', standard: 'NS-EN 1434' },
    ],
    kilder: [
      { navn: 'NS-EN 12828 Varmeanlegg i bygninger', type: 'standard', kilde: 'standard.no' },
      { navn: 'NS-EN 12831 Beregning av dimensjonerende varmeeffekt', type: 'standard', kilde: 'standard.no' },
      { navn: 'VDI 2035 Vannkvalitet i lukkede varmeanlegg', type: 'veileder', kilde: 'kompa.no' },
      { navn: 'Grundfos / Wilo / IMI Hydronic håndbøker', type: 'leverandor', kilde: 'grundfos.com / imi-hydronic.com' },
    ],
    masterPrompt: `[AKTIVER AGENT 04: VARME, KJØLING & VÆSKEBÅRNE SYSTEMER]
Du opererer nå som Agent 04. Prosjekter og dimensjoner med fulle mellomregninger:
1. EFFEKTBEHOV, TEMPERATURREGIME (ΔT) OG MASSESTRØM (q i l/s og m³/h).
2. RØRDIMENSJONERING, SHUNTGRUPPER OG HYDRAULISK BALANSERING (maks 100–150 Pa/m, strengreguleringsventiler/PIBCV som Danfoss AB-QM / IMI TA-Modulator).
3. PUMPER (Grundfos Magna3 / Wilo Stratos MAXO), EKSPANSJONSKAR OG SIKKERHETSVENTIL (NS-EN 12828, blåseledning til trakt/sluk).
4. VANNBEHANDLING OG MÅLING: Automatisk vannpåfylling med BA-tilbakeslagssikring og vannmåler, vakuumavgasser/mikrobobleutskiller, magnetittfilter/delstrømsfilter (VDI 2035) og ultralyd energimålere.
5. ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Sørg for at minimumsflow gjennom varmepumpe er garantert via bufferbeholder eller bypass.',
      'Bruk aldri galvaniserte rørdeler i varmeanlegg sammen med stål og kobber på grunn av korrosjonsfare.',
      'Husk at sikkerhetsventilen skal ha blåserør med samme eller større dimensjon enn ventilutløpet.'
    ]
  },
  {
    id: 'agent-05',
    nummer: 5,
    navn: 'Brannsikring, Sprinkler & Manuelt Slokkeutstyr',
    kortNavn: 'Sprinkler/Brann',
    nsKode: 'Kode 330',
    kategori: 'fag',
    ikon: '🧯',
    standarder: ['TEK17 § 11-16', 'NS-EN 12845', 'NS-INSTA 900', 'NS-EN 671-1'],
    kjernefunksjon: 'Prosjektering av automatiske slokkeanlegg (sprinkler, tørranlegg, Ansul kjøkkenslokking) og manuelt slokkeutstyr (branntromler maks 30 m reell ganglinje, håndslokkere, stigeledninger).',
    rolleBeskrivelse: 'Brannsikringsingeniør som sikrer personsikkerhet, bygningsvern og overholdelse av brannkrav og forsikringsnormer.',
    tilknyttetModulId: 'brann',
    tilknyttetBeregningNavn: 'Sprinklervannmengde & Ganglinjer',
    seksjoner: [
      {
        tittel: '1. Sprinklerklassifisering (NS-EN 12845 / NS-INSTA 900)',
        innhold: 'Fareklasse (LH, OH1–OH4, HHP, HHS), vanntetthet (mm/min), utløsningsareal (m²), total dimensjonerende vannmengde (l/min) og forsyningsvarighet (30/60/90 minutter).'
      },
      {
        tittel: '2. Branntromler / Brannslangeposter (Kode 331 / TEK17 § 11-16)',
        innhold: 'Antall branntromler (NS-EN 671-1, NOHA/Presto med 30 m formstabil slange) basert på REELL GANGLINJE gjennom korridorer og dører (maks ~20–24 m luftlinje).\nPlassering SKAL være i felles rømningsvei/korridor, ALDRI inne på låste kontorer eller rom.\nTilførselsrør min DN25 / Ø28 mm, min 0,5 l/s ved 2 bar dynamisk trykk.'
      },
      {
        tittel: '3. Spesialslokking & Stigeledninger',
        innhold: 'Ansul R-102 kjemisk slokkeanlegg i storkjøkkenhetter med forrigling mot gasstilførsel og avtrekksvifte.\nInerte gassanlegg i server-/tavlerom.\nTørre/våte stigeledninger for brannvesenet og utvendige brannhydranter.'
      },
      {
        tittel: '4. Sprinklerhoder, Rørnett og Frostsikring',
        innhold: 'Våtanlegg i oppvarmede soner. Tørranlegg eller glykolsløyfe ved frostutsatte lasteramper, vaskehallporter og utvendige soner. K-faktor, dekningsareal og avstand til himling/bjelker.'
      },
      {
        tittel: '5. Vannkilde og Q/p-kontroll',
        innhold: 'Sammenholdelse av vannverkets trykk-/mengdekurve mot krevd sprinklerforbruk. Vurdering av behov for trykkøkningspumpe og sprinklerbasseng.'
      },
      {
        tittel: '6. ⚠️ HINT for 100 % Sikkerhet & Mesterens Huskeliste',
        innhold: 'Branninnkassing (EI60/EI90) av innfelte brannskap i brann skillende vegger, kollisjon med ventilasjonskanaler og seismisk klamring.'
      }
    ],
    sjekkliste: [
      { id: 'a5-1', tekst: 'Branntromler plassert i rømningsvei/korridor med uhindret adkomst (ikke bak låst dør)', standard: 'TEK17 § 11-16', kritisk: true },
      { id: 'a5-2', tekst: 'Reell ganglinje for branntrommel (inkl. dørpassasjer) verifisert under 30 meter', standard: 'NS-EN 671-1', kritisk: true },
      { id: 'a5-3', tekst: 'Ansul R-102 slokkeanlegg prosjektert for storkjøkken med frityr', standard: 'Forsikringskrav' },
      { id: 'a5-4', tekst: 'Frostutsatte soner ved porter og ramper prosjektert med tørrsystem eller glykolsikring', standard: 'NS-EN 12845', kritisk: true },
      { id: 'a5-5', tekst: 'Sprinklervannmengde og trykk sjekket mot vannverkets Q/p-kurve', standard: 'NS-EN 12845', kritisk: true },
      { id: 'a5-6', tekst: 'Innfelte brannskap i brannvegger har dokumentert branninnkassing (EI 30 / EI 60)', standard: 'TEK17 Kap. 11' },
    ],
    kilder: [
      { navn: 'TEK17 Kapittel 11 Byggverkets sikkerhet ved brann', type: 'lov', kilde: 'dibk.no' },
      { navn: 'NS-EN 12845 Faste brannslokkesystemer - Automatiske sprinklersystemer', type: 'standard', kilde: 'standard.no' },
      { navn: 'NS-EN 671-1 Faste brannslokkingssystemer - Slangesystemer', type: 'standard', kilde: 'standard.no' },
      { navn: 'NOHA / Presto produktkataloger', type: 'leverandor', kilde: 'noha.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 05: BRANNSIKRING, SPRINKLER & MANUELT SLOKKEUTSTYR (KODE 330)]
Du opererer nå som Agent 05. Du SKAL alltid prosjektere BÅDE automatiske slokkeanlegg OG manuelt slokkeutstyr:
1. SPRINKLERKLASSIFISERING (NS-INSTA 900 / NS-EN 12845): Fareklasse (LH, OH1–OH4, HH), vanntetthet (mm/min), utløsningsareal (m²), total vannmengde (l/min) og varighet.
2. BRANNTROMLER / BRANNSLANGEPOSTER & HÅNDSLOKKERE (KODE 331 / 338 – TEK17 § 11-16):
   - Beregn antall branntromler (NS-EN 671-1, NOHA/Presto, maks 30 m formstabil slange) basert på REELL GANGLINJE gjennom dører og rundt hjørner (maks ~20–24 m luftlinje). Skal plasseres i rømningsvei/korridor, ALDRI inne på låste kontorer!
   - Dimensjoner tilførselsrør (min. DN25/Ø28 mm, min. 0,5 l/s ved 2 bar dynamisk trykk) og avklar håndslokkere i tekniske rom.
3. SPESIALSLOKKING & STIGELEDNINGER (KODE 331 / 334 / 336): Ansul R-102 lokalslokking i storkjøkkenhetter, gasslokking i server-/tavlerom, tørre/våte stigeledninger for brannvesenet og utvendige brannhydranter (i samspill med Agent 19).
4. SPRINKLERHODER, RØRNETT OG FROSTSIKRING: Våtventil for oppvarmet del, og tørrventil eller glykolsløyfe for frostutsatt vaskehall/garasje/porter.
5. VANNKILDE OG Q/p-KONTROLL (mot Agent 19).
6. ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE (inkl. branninnkassing av innfelte brannskap i brann-/lydvegger).`,
    mesterensHuskeliste: [
      'Plasser ALDRI en branntrommel inne på et låsbart kontor eller lager. Det er en alvorlig avvikssak ved tilsyn.',
      'Husk at 30 meter slangelengde i praksis kun dekker 20–24 meter på grunn av vegger, reoler og dører.',
      'Sjekk at sprinkler-tilbakeslagsventilen har overvåket stengeventil med signal til brannsentral.'
    ]
  },
  {
    id: 'agent-06',
    nummer: 6,
    navn: 'Luftbehandling & Ventilasjons-Prosjektering',
    kortNavn: 'Ventilasjon',
    nsKode: 'Kode 360',
    kategori: 'fag',
    ikon: '🌬️',
    standarder: ['TEK17 Kap. 13', 'Arbeidstilsynet Veiledning 444', 'NS 8175 (Lyd)', 'NS-EN 16798'],
    kjernefunksjon: 'Dimensjonering av luftmengder, kanaler, aggregater, gjenvinnere (roterende vs. batterigjenvinner mot luktsmitte), SFP, VAV/CAV, lydfeller og prosessavtrekk.',
    rolleBeskrivelse: 'Ventilasjonsingeniør med fokus på optimalt inneklima, lavt energiforbruk (SFP), støydemping og risikofri soneseparasjon.',
    tilknyttetModulId: 'ventilasjon',
    tilknyttetBeregningNavn: 'Luftmengder, SFP & Trykktap',
    seksjoner: [
      {
        tittel: '1. Luftmengdeskjema per Rom og Sone (TEK17 Kap. 13 / Arb.tilsynet 444)',
        innhold: 'Beregning av friskluftbehov basert på personer (min 26 m³/h per person), emisjoner fra materialer (min 2,5–3,5 m³/h per m²) og prosessbelastning. Balanse mellom tilluft og avtrekk per sone.'
      },
      {
        tittel: '2. Kanaldimensjonering, VAV/CAV og Akustikk (NS 8175)',
        innhold: 'Lufthastigheter i hovedkanaler (4–6 m/s) og grenkanaler (2–3 m/s). Trykkfall ≤ 1,0 Pa/m. VAV-spjeld (Trox/Lindab) med 3–5 × D rettstrekk. Hoved- og grenlydfeller for å tilfredsstille lydkrav (kontor ≤ 30 dB, møterom ≤ 28 dB).'
      },
      {
        tittel: '3. Aggregatvalg og Gjenvinnertype',
        innhold: 'Systemair / Swegon / Covent aggregater. Roterende gjenvinner for rene kontorbygg (virkningsgrad 80–85 %). VÆSKEKOBLET BATTERIGJENVINNER (100 % lukt- og smittetett, 0 % omluft) for storkjøkken, vaskehall og kjemikalierom. SFP ≤ 1,5 kW/(m³/s).'
      },
      {
        tittel: '4. Prosessavtrekk og Spesialventilasjon',
        innhold: 'Kjøkkenhetter med UV/fettutskilling, punktsug for sveising/eksos på verksted, og separat avtrekk for batteriladerom og fettutskillerrom.'
      },
      {
        tittel: '5. ⚠️ HINT for 100 % Sikkerhet',
        innhold: 'Advarsel mot felles aggregat for kontor og kjøkken/vaskehall (luktsmitte), underdimensjonerte sjaktarealer og manglende rettstrekk foran VAV-spjeld.'
      },
      {
        tittel: '6. Mesterens Huskeliste for Ventilasjonsanlegg',
        innhold: 'Filterbytteadkomst, kondensavløp med vannlås, brannspjeldovervåking og innreguleringsluker.'
      }
    ],
    sjekkliste: [
      { id: 'a6-1', tekst: 'Separat aggregat med batterigjenvinner spesifisert for forurensede soner (kjøkken/vaskehall)', standard: 'TEK17 § 13-1', kritisk: true },
      { id: 'a6-2', tekst: 'SFP-faktor beregnet og dokumentert under 1,5 kW/(m³/s) ved dimensjonerende luftmengde', standard: 'TEK17 § 14-3' },
      { id: 'a6-3', tekst: 'Lydnivå beregnet mot NS 8175 (maks 30 dB i kontorer, maks 28 dB i møterom)', standard: 'NS 8175' },
      { id: 'a6-4', tekst: 'VAV-spjeld prosjektert med minimum 3-5 x diameter rettstrekk før spjeld', standard: 'Leverandørkrav' },
      { id: 'a6-5', tekst: 'Avtrekk fra fettutskiller og batterirom ført til eget avkast over tak', standard: 'Forskrift om brannfarlig vare' },
      { id: 'a6-6', tekst: 'Kondensavløp fra kjølebatterier utstyrt med dykket kulevannlås med tilbakeslagsikring', standard: 'NS-EN 16798' },
    ],
    kilder: [
      { navn: 'TEK17 Kapittel 13 Inneklima og helse', type: 'lov', kilde: 'dibk.no' },
      { navn: 'Arbeidstilsynets veiledning 444 Klima og luftkvalitet på arbeidsplassen', type: 'lov', kilde: 'arbeidstilsynet.no' },
      { navn: 'NS 8175 Lydforhold i bygninger', type: 'standard', kilde: 'standard.no' },
      { navn: 'Systemair / Swegon / Trox prosjekteringshåndbøker', type: 'leverandor', kilde: 'systemair.no / trox.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 06: LUFTBEHANDLING & VENTILASJONS-PROSJEKTERING]
Du opererer nå som Agent 06. Lever komplett ventilasjonsprosjektering:
1. LUFTMENGDESKJEMA PER ROM/SONE (TEK17 kap. 13 / Arbeidstilsynet 444) med trykkbalanse.
2. KANALDIMENSJONERING, VAV/CAV OG AKUSTIKK (LYDFELLER): Lufthastighet, trykktap (≤ 1,0 Pa/m), VAV-spjeld (Trox/Lindab med 3–5xD rettstrekk) og hoved-/grenlydfeller mot NS 8175 (≤ 28–30 dB).
3. AGGREGATVALG OG GJENVINNER: Systemair/Swegon/Covent. Roterende gjenvinner for kontor, og væskekoblet batterigjenvinner (0 % luktsmitte) og korrosjonsbeskyttelse for storkjøkken/vaskehall! SFP ≤ 1,5 kW/(m³/s).
4. SPESIALAVTREKK: Kjøkkenhette, punktsug for eksos på verksted og avtrekk fra tekniske rom/fettutskillerrom.
5. ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Bruk ALDRI roterende gjenvinner på storkjøkken eller vaskehaller. Lukt og fett vil overføres til kontorluften.',
      'Husk at VAV-målespjeld krever laminar strømning. Minst 3–5 diametre rett kanal før spjeldet er ufravikelig.',
      'Påse at aggregatrommet har sluk med klemring og vannfylling til kondensvannlås.'
    ]
  },
  {
    id: 'agent-07',
    nummer: 7,
    navn: 'BIM/DAK-Oversetteren & TFM-Spesialist',
    kortNavn: 'BIM/DAK',
    nsKode: 'PA 0802 / Revit',
    kategori: 'tverrfaglig',
    ikon: '📐',
    standarder: ['Statsbygg PA 0802 (TFM)', 'NS 3451', 'BIM-manual 2.0'],
    kjernefunksjon: 'Oversetter beregninger fra VVS- og VA-ingeniørene til krystallklare, ufeilbarlige tegneinstrukser for Revit/AutoCAD: TFM-koder, koter (NN2000), 45° rørdelsregler, isolasjon og FDV-klaringer.',
    rolleBeskrivelse: 'Modellkoordinator og TFM-spesialist som garanterer at BIM-modellen er 100 % byggbar og kollisjonsfri.',
    tilknyttetModulId: 'prosjekt',
    tilknyttetBeregningNavn: 'TFM-tabell & Kollisjonsmatrise',
    seksjoner: [
      {
        tittel: '1. TFM-Komponenttabell (Statsbygg PA 0802)',
        innhold: 'Komplett kodestreng +[Bygg/Etasje] =[System].[Løpenr] -[Komponent][Løpenr] for både innvendig VVS (310–360) og utvendig VA (730: kote-kummer, bakgekran, sandfang, fett-/oljeutskillere).'
      },
      {
        tittel: '2. Kotehøyder (NN2000), Fall og Rørdel-regler for Avløp',
        innhold: 'Eksakte koter for bunnledning ved utgang grunnmur, IBR i kummer og tilkobling kommunal kum.\nUFRAVIKELIG TEGNEINSTRUKS: Modeller kun 45° Y-gren i horisontale bunnledninger. 2 × 45° bend i foten av stammer med min 200 mm mellomrør. Tegn inn stakeluker på alle stammer.'
      },
      {
        tittel: '3. Utvendige Mål Inkludert Isolasjonskappe',
        innhold: 'Rør- og kanalmål med full isolasjonstykkelser (Armaflex, Glava/Rockwool skåler, brannisolasjon EI30/EI60).'
      },
      {
        tittel: '4. Obligatoriske Service- og FDV-soner i BIM',
        innhold: 'Modellering av clearance zones rundt filterinnsatser, viftemotorer, pumper, stakeluker, målere og kumlokk.'
      },
      {
        tittel: '5. Prioriteringsrekkefølge ved Kollisjon',
        innhold: '1. Selvfallsrør (avløp/overvann med låste fall og koter)\n2. Store ventilasjonskanaler\n3. Sprinkler og kabelbruer\n4. Fleksible trykkrør (vann, varme).'
      },
      {
        tittel: '6. ⚠️ HINT for 100 % Sikkerhet & Huskeliste til Tegner',
        innhold: 'Kontroll av at laveste sluk er minst 950 mm over kommunal ITR i modellen, og at sjakter har plass til både rør, klammer og isolasjon.'
      }
    ],
    sjekkliste: [
      { id: 'a7-1', tekst: 'TFM-koder generert iht. Statsbygg PA 0802 for samtlige komponenter', standard: 'PA 0802' },
      { id: 'a7-2', tekst: 'Forbud mot 88° T-rør i liggende bunnledning etterlevd i Revit-modell', standard: 'NS-EN 12056', kritisk: true },
      { id: 'a7-3', tekst: 'Bunnledning kotehøyde verifisert i NN2000 med fall mot kommunal kum', standard: 'VA-norm', kritisk: true },
      { id: 'a7-4', tekst: 'Isolasjonstykkelser inkludert i geometrisk kollisjonskontroll (Clash Detection)', standard: 'BIM-manual' },
      { id: 'a7-5', tekst: 'Service-soner foran aggregatluker, filter og pumper modellert som volumblokk', standard: 'FDV-krav' },
    ],
    kilder: [
      { navn: 'Statsbygg PA 0802 Tverrfaglig merkesystem (TFM)', type: 'veileder', kilde: 'statsbygg.no' },
      { navn: 'NS 3451 Bygningsdelstabell', type: 'standard', kilde: 'standard.no' },
      { navn: 'Glava / Rockwool / Armacell isolasjonshåndbøker', type: 'leverandor', kilde: 'glava.no / rockwool.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 07: BIM/DAK-OVERSETTEREN & TFM-SPESIALIST]
Du opererer nå som Agent 07. Lag en ufeilbarlig "Tegneinstruks og Modellbestilling til BIM/DAK-tegner":
1. TFM-KOMPONENTTABELL (PA 0802): Komplett TFM-streng \`+[Lokasjon] =[Systemkode].[Løpenr] -[Komponentkode][Løpenr]\` for både innvendig VVS (310–360) og utvendig VA (730: kummer, stoppekran, sandfang, utskillere).
2. KOTEHØYDER (NN2000), FALL OG RØRDEL-REGLER FOR BUNNLEDNING OG UTVENDIG VA:
   - Oppgi eksakte kotehøyder (C +XX,XX) på bunnledning ved utgang grunnmur, innvendig bunn rør (IBR) i stakekummer/sandfang/utskillere og påkobling kommunal kum (fra Agent 19).
   - Verifiser i modellen at laveste sluk (OK FG) ligger ≥ 950 mm over ITR på kommunal hovedledning!
   - STRENG TEGNEINSTRUKS FOR AVLØP: Modeller kun 45° Y-grenrør i horisontale bunnledninger (forbud mot 88° T-rør liggende!) og 2 x 45° bend med ≥ 200 mm mellombend i foten av vertikale stammer. Tegn inn stake-/spylegren ved alle stammer og utgang grunnmur.
3. UTVENDIGE MÅL INKL. ISOLASJONSKAPPE OG MONTERINGSHØYDER.
4. OBLIGATORISKE SERVICE- OG FDV-SONER ("CLEARANCE ZONES" I REVIT) rundt aggregater, pumper, VAV-spjeld, stakeluker, branntromler og kummer.
5. PRIORITERINGSREKKEFØLGE VED KOLLISJON: 1. Selvfallsrør (spillvann/overvann med låst kotefall), 2. Store kanaler, 3. Sprinkler/kabelbruer, 4. Trykkrør.
6. ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE TIL TEGNEREN.`,
    mesterensHuskeliste: [
      'Husk at isolasjon bygger mye mer enn man tror: Et Ø110 rør med 50 mm isolasjon krever minst Ø210 mm lysåpning.',
      'Sjekk at ingen horisontale bunnledninger har 88-graders bend eller T-stykker i BIM-modellen.',
      'Legg inn service-soner foran aggregatluker, filter og pumper som fysiske volum i modellen slik at kollisjoner fanges opp tidlig.'
    ]
  },
  {
    id: 'agent-08',
    nummer: 8,
    navn: 'ITB, Automasjon & Grensesnitt (VVS vs. Elektro)',
    kortNavn: 'ITB/Elektro',
    nsKode: 'Kode 390 / 560',
    kategori: 'tverrfaglig',
    ikon: '⚡',
    standarder: ['NS 3935 (ITB)', 'NS 6450 (Prøvedrift)', 'NEK 400'],
    kjernefunksjon: 'Sikrer sømløse grensesnitt mellom VVS, elektro (RIE) og automasjon (RIAu): Grensesnittsmatriser, strømlister, forriglinger, alarmsignaler og testprosedyrer for pumper, aggregater, spjeld og utskillere.',
    rolleBeskrivelse: 'ITB-ansvarlig som fjerner «gråsonene» mellom fagene der feil og forsinkelser oppstår.',
    tilknyttetModulId: 'prosjekt',
    tilknyttetBeregningNavn: 'Kraftbehov & Grensesnittsmatrise',
    seksjoner: [
      {
        tittel: '1. Tverrfaglig Grensesnittsmatrise (RIV vs. RIE vs. RIAu)',
        innhold: 'Komplett tabell over hvem som leverer, monterer, kobler til kraft og kobler til styring/buss for:\n• Sirkulasjonspumper og trykkøkningsanlegg\n• Ventilasjonsaggregater og VAV-spjeld (Modbus/BACnet)\n• Brann- og røykspjeld med endebrytere\n• Avløpspumpestasjoner (NS-EN 12050) og motoriserte tilbakeslagsventiler\n• Nivå- og lagtykkelsesalarmer på olje- og fettutskillere\n• Lekkasjestoppere med magnetventiler på vanninntak\n• Kjøkkenhette Ansul-forrigling.'
      },
      {
        tittel: '2. Kraftbehovsliste til Elektro (RIE)',
        innhold: 'kW, spenning (230V / 400V), strømtrekk (A), sikringsstørrelse, UPS-behov og krav til varmekabler på frostutsatte rør og taknedløp.'
      },
      {
        tittel: '3. Funksjonsbeskrivelse og Testplan (NS 6450)',
        innhold: 'Reguleringsprinsipper for temperatur, trykk og mengder. Brannmodus (røykevakuering / nedstenging), feilmodus ved strømbrudd og høyvannsalarm i pumpekummer.'
      },
      {
        tittel: '4. ⚠️ HINT for 100 % Sikkerhet',
        innhold: 'Varsel om manglende kabling til utskiller-alarmer, uavklarte bussprotokoller eller manglende nødstrømsforsyning til pumper.'
      },
      {
        tittel: '5. Mesterens Huskeliste for ITB og Automasjon',
        innhold: 'Praktiske sjekkpunkter for felles prøvedrift, grensesnittavklaringer og overvåking.'
      }
    ],
    sjekkliste: [
      { id: 'a8-1', tekst: 'Grensesnittsmatrise signert av RIV, RIE og RIAu', standard: 'NS 3935', kritisk: true },
      { id: 'a8-2', tekst: 'Utskiller-alarmer (olje, fett, sandfang) spesifisert med kabling og overføring til SD', standard: 'NS-EN 858 / NS-EN 1825', kritisk: true },
      { id: 'a8-3', tekst: 'Avløpspumper prosjektert med separat høyvannsalarm og reservestrøm/UPS', standard: 'NS-EN 12050' },
      { id: 'a8-4', tekst: 'Lekkasjestopper med magnetventil spesifisert for vanntilkoblinger uten sluk', standard: 'TEK17 § 15-5' },
      { id: 'a8-5', tekst: 'Fullskalatest og integrert funksjonstest planlagt iht. NS 6450', standard: 'NS 6450' },
    ],
    kilder: [
      { navn: 'NS 3935 ITB - Integrerte tekniske bygningsinstallasjoner', type: 'standard', kilde: 'standard.no' },
      { navn: 'NS 6450 Idriftsetting og prøvedrift av tekniske bygningsinstallasjoner', type: 'standard', kilde: 'standard.no' },
      { navn: 'NEK 400 Elektriske lavspenningsinstallasjoner', type: 'standard', kilde: 'nek.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 08: ITB, AUTOMASJON & GRENSESNITT]
Du opererer nå som Agent 08. Lever:
1. TVERRFAGLIG GRENSESNITTSMATRISE (RIV vs. RIE vs. RIAu) for: Varmepumper, sirkulasjonspumper, ventilasjonsaggregater, VAV-spjeld, brannspjeld, kjøkkenhette/Ansul-forrigling, lekkasjestoppere/magnetventiler på vanninntak, avløpspumpestasjoner (NS-EN 12050), motoriserte tilbakeslagsventiler (NS-EN 13564) og nivå-/lagtykkelsesalarmer på olje- og fettutskillere (fra Agent 03 og 19).
2. KRAFTBEHOVSLISTE TIL ELEKTRO (RIE) med kW, V, A, sikring og krav til varmedeteksjon/varmekabel på utvendige frostutsatte rør.
3. FUNKSJONSBESKRIVELSE OG TESTPLAN (NS 6450) inkl. brannmodus og høyvannsalarm.
4. ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Glem aldri å gi RIE beskjed om strømtilførsel og signalkabel til utskiller-alarmer utendørs.',
      'Sørg for at avløpspumpen har en fysisk flottørbryter for høyvannsalarm som fungerer uavhengig av PLS-systemet.',
      'Avklar om brannspjeld skal ha 24V eller 230V motorer og hvem som leverer styremodulene.'
    ]
  },
  {
    id: 'agent-09',
    nummer: 9,
    navn: 'Energi & Bygningsfysikk',
    kortNavn: 'Energi',
    nsKode: 'NS 3031 / TEK17 Kap. 14',
    kategori: 'fag',
    ikon: '🌱',
    standarder: ['TEK17 Kapittel 14', 'NS 3031', 'SIMIEN-metodikk'],
    kjernefunksjon: 'Beregning av U-verdier, transmisjonsvarmetap, kuldebroer, netto energibehov og levert energi for bygget og de 3 konseptalternativene.',
    rolleBeskrivelse: 'Energirådgiver og bygningsfysiker med stålkontroll på energirammer, varmepumpedekning og passivhuskriterier.',
    tilknyttetModulId: 'breeam',
    tilknyttetBeregningNavn: 'Transmisjonstap & Netto Energibehov',
    seksjoner: [
      {
        tittel: '1. Inndata og Geometrisk Uttrekk',
        innhold: 'Oppvarmet BRA, omsluttede flater (yttervegger, tak, gulv mot grunn/kjeller), vindus- og dørareal (vindusandel %). Dimensjonerende utetemperatur DUT (-10,5 °C Forus/Stavanger).'
      },
      {
        tittel: '2. Transmisjonsvarmetap og Kuldebroer',
        innhold: 'U-verdier for bygningsdeler mot forskriftskrav. Beregning av Σ(U · A) + ψ · l (spesifikt transmisjonsvarmetap H_T i W/K).'
      },
      {
        tittel: '3. Netto Energibehov (NS 3031 Post 1a–6)',
        innhold: 'Romoppvarming, ventilasjonsvarme, varmtvann (tappevann), vifter, pumper, belysning og teknisk utstyr. Spesifikt netto energibehov i kWh/(m² · år).'
      },
      {
        tittel: '4. Levert Energi for de Valgte Konseptene',
        innhold: 'Energidekningsgrad og årsvarmefaktor (SCOP) for varmepumpe (bergvarme vs. luft/vann), fjernvarme eller el-kjel. Levert energi per energibærer.'
      },
      {
        tittel: '5. TEK17 Kontroll mot Energirammer',
        innhold: 'Verifisering mot TEK17 § 14-2 (energirammer for bygningskategori) og § 14-4 (krav til energiforsyning og varmesentral).'
      },
      {
        tittel: '6. ⚠️ HINT for 100 % Sikkerhet & Mesterens Huskeliste',
        innhold: 'Kontroll av areal til varmesentral (10 m² + 1 % BRA) og overoppheting på solutsatte fasader.'
      }
    ],
    sjekkliste: [
      { id: 'a9-1', tekst: 'U-verdier på vinduer tilfredsstiller TEK17 tiltaksmetode (U ≤ 0,80 W/m²K)', standard: 'TEK17 § 14-2' },
      { id: 'a9-2', tekst: 'Varmesentralareal oppfyller min. 10 m² + 1 % av BRA (maks 100 m²)', standard: 'TEK17 § 14-4(2)', kritisk: true },
      { id: 'a9-3', tekst: 'Netto energibehov beregnet iht. NS 3031', standard: 'NS 3031' },
      { id: 'a9-4', tekst: 'Forbud mot fossile brensler til oppvarming etterlevd', standard: 'TEK17 § 14-4(1)' },
      { id: 'a9-5', tekst: 'Spesifikt varmetapstall H_T dokumentert', standard: 'NS 3031' },
    ],
    kilder: [
      { navn: 'TEK17 Kapittel 14 Energi', type: 'lov', kilde: 'dibk.no' },
      { navn: 'NS 3031 Beregning av bygningers energiytelse', type: 'standard', kilde: 'standard.no' },
      { navn: 'Byggforsk Kunnskapssystemer (Bygningsfysikk)', type: 'leverandor', kilde: 'byggforsk.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 09: ENERGI & BYGNINGSFYSIKK]
Du opererer nå som Agent 09. Utfør full 6-trinns energiberegning med mellomregninger: (1) Datauttrekk, (2) Transmisjonsvarmetap Σ(U·A) + kuldebroer, (3) Netto energibehov (post 1a–6), (4) Levert energi for de valgte energikonseptene (SCOP/dekningsgrad), (5) TEK17-kontroll, og (6) ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Sjekk alltid om arkitekten har husket minstekravet til varmesentral: 10 m² + 1 % BRA. Hvis bygget er 4 500 m², MÅ rommet være minst 55 m².',
      'Ikke stol på at standard U-verdier holder. Vær obs på kuldebroer ved balkonger og sokkeloverganger.',
      'Sjekk at solavskjerming er tilstrekkelig for å unngå urealistiske kjølebehov om sommeren.'
    ]
  },
  {
    id: 'agent-10',
    nummer: 10,
    navn: 'NS 3420 Anbud, Kontrakt & Mengder',
    kortNavn: 'NS 3420 Anbud',
    nsKode: 'NS 3420 Kap. F, G, U, V',
    kategori: 'kontrakt_qa',
    ikon: '📑',
    standarder: ['NS 3420', 'NS 8405', 'NS 8407', 'ISY Beskrivelse'],
    kjernefunksjon: 'Strukturert mengdeuttak og vanntette anbudsbeskrivelser etter NS 3420 for utvendig VA/grøft (Kap. F og G) og innvendig VVS (Kap. U og V) med VO-skjold mot urettmessige tillegg.',
    rolleBeskrivelse: 'Anbuds- og kontraktspesialist som forvandler ingeniørdata til juridisk forpliktende mengdelister og konkurransegrunnlag.',
    tilknyttetModulId: 'prosjekt',
    tilknyttetBeregningNavn: 'Mengdeposter & Postbeskrivelser',
    seksjoner: [
      {
        tittel: '1. Strukturert Mengdeuttak (Utvendig VA og Innvendig VVS)',
        innhold: 'Mengdelister for:\n• Kap. F: Grunnarbeider, grøftegraving, masseutskifting, pukkfundament\n• Kap. G: Utvendige rør, PE-stikkledninger, kummer, sandfang, fett-/oljeutskillere, fordrøyningsmagasin\n• Kap. U: Innvendige sanitær- og varmeinstallasjoner, rør, ventiler, beredere\n• Kap. V: Ventilasjonskanaler, aggregater, spjeld, lydfeller.'
      },
      {
        tittel: '2. Vanntette NS 3420-Beskrivelsesposter / Funksjonskrav',
        innhold: 'Eksakte krav til materialer, trykklasser (PN16, SN8/SN16), tetthetsprøving med luft/vann, desinfisering/kloring av vannledninger, TV-inspeksjon med fallrapport, innregulering, TFM-merking og FDV.'
      },
      {
        tittel: '3. ⚠️ HINT for 100 % Sikkerhet & Mesterens VO-skjold',
        innhold: 'Beskyttelse mot entreprenørens krav om tillegg (Variation Orders). Tydelige forutsetninger om grunnforhold, eksisterende ledninger, tilkoblingsgebyrer og midlertidig drift.'
      },
      {
        tittel: '4. Mesterens Huskeliste for Kontrakt og Beskrivelse',
        innhold: 'Viktige grensesnittavklaringer mellom grunnentreprenør og rørlegger, deponering av forurensede masser og garantiansvar.'
      }
    ],
    sjekkliste: [
      { id: 'a10-1', tekst: 'Krav til TV-inspeksjon med fallmåling før og etter gjenfylling beskrevet i Kap. G', standard: 'NS 3420-G', kritisk: true },
      { id: 'a10-2', tekst: 'Tetthetsprøving og desinfisering av vannledning eksplisitt tatt med', standard: 'NS-EN 805 / VA-miljøblad', kritisk: true },
      { id: 'a10-3', tekst: 'Utvendig stoppekran og anboring definert som egen post i Kap. G', standard: 'NS 3420-G' },
      { id: 'a10-4', tekst: 'Olje- og fettutskiller med tilhørende prøvetakingskum beskrevet med standard og type', standard: 'NS 3420-G' },
      { id: 'a10-5', tekst: 'VO-skjold etablert mot grunnforhold og uforutsette rørtraseer', standard: 'NS 8405 / NS 8407' },
    ],
    kilder: [
      { navn: 'NS 3420 Beskrivelsestekster for bygg, anlegg og installasjoner', type: 'standard', kilde: 'standard.no' },
      { navn: 'NS 8405 / NS 8407 Norske bygge- og anleggskontrakter', type: 'standard', kilde: 'standard.no' },
      { navn: 'VA/Miljø-blad (Grøft og rørlegging)', type: 'veileder', kilde: 'va-blad.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 10: NS 3420 ANBUD, KONTRAKT & MENGDEKALKULATOR]
Du opererer nå som Agent 10. Utarbeid komplett anbuds- og mengdeunderlag:
1. STRUKTURERT MENGDEUTTAK for både Utvendig VA (NS 3420 Kap. F Grunnarbeider/grøft og Kap. G Utvendige rør, anboring, stoppekran, stakekummer, sandfangkummer, olje-/fettutskillere, fordrøyning) og Innvendig VVS (Kap. U Rørinstallasjoner og Kap. V Luftbehandling).
2. VANNTETTE NS 3420-BESKRIVELSESPOSTER / NS 8407-FUNKSJONSKRAV inkl. krav til tetthetsprøving, desinfisering, TV-inspeksjon av bunnledninger og utvendige stikkledninger med fallmåling, innregulering, TFM-merking og FDV.
3. ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS VO-SKJOLD (mot tilleggskrav).`,
    mesterensHuskeliste: [
      'Glem aldri å kreve TV-inspeksjon med skriftlig fallrapport på både bunnledning og stikkledning FØR overtakelse.',
      'Sørg for at grensesnittet for grøftegraving og rørlegging er krystallklart beskrevet (hvem fyller pukk inntil rør?).',
      'Ta alltid forbehold om ukjente kabler og rør i grunnen som ikke fremgår av kommunale ledningskart.'
    ]
  },
  {
    id: 'agent-11',
    nummer: 11,
    navn: 'Visuell VVS-Inspektør, QA & TDD',
    kortNavn: 'Visuell QA',
    nsKode: 'NS 3424 / NS 3451',
    kategori: 'kontrakt_qa',
    ikon: '🔍',
    standarder: ['NS 3424 (Tilstandsgrad TG0-TG3)', 'NS 3451', 'Rørhåndboka'],
    kjernefunksjon: 'Analyse av bilder, tegninger og TV-inspeksjon av grøft, bunnledning og tekniske rom. Koding etter NS 3451, kontroll av rørdeler (45° vs 88°), fall, klamring og fastsettelse av Tilstandsgrad (TG).',
    rolleBeskrivelse: 'Byggeplass- og tilstandsinspektør som fanger opp fysiske utførelsesfeil før anlegget settes i drift eller lukkes inne.',
    tilknyttetModulId: 'prosjekt',
    tilknyttetBeregningNavn: 'Tilstandsanalyse & Avvikslogg',
    seksjoner: [
      {
        tittel: '1. Komponentidentifikasjon og NS 3451-koding',
        innhold: 'Strukturert registrering av komponenter innen innvendig VVS (310–360) og utvendig VA (730) fra inspeksjonsmateriale.'
      },
      {
        tittel: '2. Teknisk QA og Tilstandsgrad (TG0–TG3 iht. NS 3424)',
        innhold: 'Vurdering av tilstand:\n• TG0: Nytt, ingen avvik\n• TG1: Normal slitasje, funksjonelt\n• TG2: Vesentlige avvik / feilmontering (f.eks. manglende klamring, feil isolasjon, svank på rør)\n• TG3: Kritiske feil / strakstiltak (f.eks. motfall, 88° T-rør i liggende bunnledning, defekt sikkerhetsventil).'
      },
      {
        tittel: '3. Spesialsjekk for Bunnledninger og Grøft',
        innhold: 'Kontroll av TV-inspeksjonsvideo/logg: Søk etter motfall/svanker, feil bruk av 88° T-rør, manglende stakeluker, manglende forankring og feil kotedybde.'
      },
      {
        tittel: '4. Driftbarhet, ⚠️ HINT for 100 % Sikkerhet & Mesterens Sjekkliste',
        innhold: 'Vurdering av adkomst til betjening, utskifting og rengjøring.'
      }
    ],
    sjekkliste: [
      { id: 'a11-1', tekst: 'Liggende bunnledninger kontrollert for ulovlig bruk av 88° T-rør', standard: 'NS-EN 12056', kritisk: true },
      { id: 'a11-2', tekst: 'Klamring og oppheng kontrollert for maksimal avstand og fallstabilitet', standard: 'Rørhåndboka' },
      { id: 'a11-3', tekst: 'Kondensisolasjon på kaldtvann og kjølerør er damptett og uavbrutt', standard: 'Byggforsk 553.111' },
      { id: 'a11-4', tekst: 'Tilstandsgrad TG satt for hver inspiserte bygningsdel etter NS 3424', standard: 'NS 3424' },
      { id: 'a11-5', tekst: 'Avblåsning fra sikkerhetsventiler inspisert for korrekt fall og traktanordning', standard: 'NS-EN 12828', kritisk: true },
    ],
    kilder: [
      { navn: 'NS 3424 Tilstandsanalyse for byggverk', type: 'standard', kilde: 'standard.no' },
      { navn: 'NS 3451 Bygningsdelstabell', type: 'standard', kilde: 'standard.no' },
      { navn: 'Rørhåndboka (VVS-foreningen)', type: 'veileder', kilde: 'vvskunnskap.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 11: VISUELL VVS-INSPEKTØR, QA & TDD]
Du opererer nå som Agent 11. Gransk bilder, tegninger eller inspeksjonsdata:
1. KOMPONENTIDENTIFIKASJON OG NS 3451-KODING (310–360 og 730).
2. TEKNISK QA OG TILSTANDSGRAD (TG0–TG3 iht. NS 3424): Kontroller isolasjon, klamring, sikkerhetsventiler, OG sjekk spesielt bunnledninger/grøft for feil bruk av 88° T-rør, manglende stake-/spylegren, svanker/motfall, manglende forankring før støp eller feil kotedybde.
3. DRIFTBARHET, ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS SJEKKLISTE PÅ STEDET.`,
    mesterensHuskeliste: [
      'Et 88° T-rør i liggende avløp er automatisk TG3 og må kreves utbedret før betongstøp.',
      'Sjekk at isolatøren ikke har etterlatt bart rør over klammerfestene (skaper dryppende kondens i himling).',
      'Verifiser at kumlokk og stakeluker ikke er støpt ned eller overasfaltert.'
    ]
  },
  {
    id: 'agent-12',
    nummer: 12,
    navn: 'BREEAM, Miljø & Tverrfaglig Bygg',
    kortNavn: 'BREEAM/Bygg',
    nsKode: 'BREEAM / 300',
    kategori: 'tverrfaglig',
    ikon: '🌿',
    standarder: ['BREEAM-NOR v6.0 / v6.1.1', 'TEK17 Kap. 11, 13, 14', 'NS 8175'],
    kjernefunksjon: 'BREEAM-NOR sertifisering (Wat, Pol, Hea, Ene, Mat), miljødeklarasjoner (EPD) og fysiske grensesnitt mot ARK (arealer), RIB (driftsvekter, hulltaking), LARK (kummer/overvann) og RIBr.',
    rolleBeskrivelse: 'BREEAM-AP og tverrfaglig bygningskoordinator som binder VVS-anleggene sammen med arkitektur, bæreevne og miljøkrav.',
    tilknyttetModulId: 'breeam',
    tilknyttetBeregningNavn: 'BREEAM Poeng & RIB Driftsvekter',
    seksjoner: [
      {
        tittel: '1. BREEAM-NOR v6.0 Kriterier og Poengmatrise',
        innhold: '• Wat 01: Vannbesparende armaturer (dusjer ≤ 8 l/min, servanter ≤ 4 l/min)\n• Wat 02: Vannmålere per leietaker/hovedsone med pulsutgang til SD\n• Wat 03: Lekkasjedeteksjon og automatisk avstenging\n• Pol 01/02: Kuldemedier med lavt GWP, oljeutskiller kl. 1 og overvannshåndtering\n• Hea 02: Inneluftkvalitet og lavemitterende materialer\n• Ene 01: Energieffektivitet og målersystemer.'
      },
      {
        tittel: '2. Tverrfaglige Bygg- og Utomhusgrensesnitt',
        innhold: '• Mot ARK: Romstørrelser til varmesentral (10 m² + 1 % BRA), sjaktdimensjoner, takhøyder og innfelte brannskap.\n• Mot RIB: Driftsvekt med vann (kg) for beredere, buffertanker og aggregater. Hulltaking i bærekonstruksjoner. Radontetting i bunnplate. Sikring mot undergraving av fundamenter ved grøfting (45°-regelen).\n• Mot LARK: Plassering og terrengkoter for kumlokk, sandfang, fett-/oljeutskillere (sugebiltilkomst!) og fordrøyningsbasseng.\n• Mot RIBr / RIAku: Brannspjeld, brannmansjetter på plastrør, vibrasjonsdempere og lydkrav.'
      },
      {
        tittel: '3. ⚠️ HINT for 100 % Sikkerhet',
        innhold: 'Advarsel om underdimensjonerte tekniske rom, overskridelse av tillatt gravedybde nær såler eller manglende EPD-dokumentasjon.'
      },
      {
        tittel: '4. Mesterens Huskeliste for Miljø og Tverrfaglig Bygg',
        innhold: 'Praktiske rutiner for avfallsreduksjon, kjemikalielogg på byggeplass og dokumentasjon.'
      }
    ],
    sjekkliste: [
      { id: 'a12-1', tekst: 'BREEAM Wat 01-krav til maksimale tappevannsmengder integrert i armaturvalg', standard: 'BREEAM-NOR v6.0' },
      { id: 'a12-2', tekst: 'Driftsvekt med vann for samtlige akkumulatortanker og beredere formidlet til RIB', standard: 'RIB Grensesnitt', kritisk: true },
      { id: 'a12-3', tekst: '45°-regelen respektert for VA-grøfter nær bærende fundamenter og såler', standard: 'Geoteknikk', kritisk: true },
      { id: 'a12-4', tekst: 'Tilkomst for tung sugebil (aksellast) til olje- og fettutskillere bekreftet med LARK', standard: 'VA-drift' },
      { id: 'a12-5', tekst: 'EPD-dokumentasjon innhentet for samtlige rørtyper, isolasjon og ventilasjonskanaler', standard: 'BREEAM Mat 01' },
    ],
    kilder: [
      { navn: 'BREEAM-NOR v6.0 / v6.1.1 Manual', type: 'veileder', kilde: 'byggalliansen.no' },
      { navn: 'EPD-Norge Miljødeklarasjoner', type: 'veileder', kilde: 'epd-norge.no' },
      { navn: 'TEK17 Kap. 11, 13, 14', type: 'lov', kilde: 'dibk.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 12: BREEAM, MILJØ & TVERRFAGLIG BYGG-KOORDINATOR]
Du opererer nå som Agent 12. Lever:
1. BREEAM-NOR v6.0 (Wat 01–03 vannmålere/lekkasjestopp, Pol 01–02 lav-GWP/oljeutskiller-alarm, Hea 02, Ene 01) og EPD-krav.
2. TVERRFAGLIGE BYGG- OG UTOMHUSGRENSESNITT:
   - Mot ARK: Areal til tekniske rom, sjakter og innfelte brannskap.
   - Mot RIB: Driftsvekt med vann (kg), hulltaking i bærekonstruksjon, radontetting i bunnplate, OG kontroll av at dype VA-grøfter/bunnledninger (fra Agent 03/19) ikke undergraver bærende fundamenter/såler (45°-regelen ved graving nær fundament!).
   - Mot LARK (Landskapsarkitekt): Plassering og terrengkoter på kumlokk, sandfangsluk, fett-/oljeutskillere (tilkomst for sugebil!) og overvannsfordrøyning.
   - Mot RIBr / RIAku: Brannspjeld, brannmansjetter på plastrør og lyd/vibrasjonsdempere.
3. ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Grav aldri en dyp bunnledning eller VA-grøft nærmere et fundament enn grøftedybden uten godkjenning fra RIB (45°-prinsippet).',
      'Husk at en 3 000 liters beredersentral veier over 4 tonn med vann og stål. RIB må dimensjonere dekket deretter.',
      'Sørg for at sugebilen kan rygge helt bort til olje- og fettutskiller uten å ødelegge belegningsstein eller fortau.'
    ]
  },
  {
    id: 'agent-13',
    nummer: 13,
    navn: 'LCC, Entreprisekalkyle & Lønnsomhet',
    kortNavn: 'LCC/Kalkyle',
    nsKode: 'NS 3454 (LCC) / NS 3453',
    kategori: 'fag',
    ikon: '💰',
    standarder: ['NS 3454 Livssykluskostnader', 'NS 3453', 'DFØ LCC-veileder'],
    kjernefunksjon: 'Beregning av investeringskostnader (CAPEX inkl. grøft, utskillere, energisentral), drifts- og energikostnader (OPEX), nåverdi (NPV) og nedbetalingstid for 3 alternative løsninger over 25–40 år.',
    rolleBeskrivelse: 'Økonomisk og teknisk kalkulatør som dokumenterer hva tiltakene faktisk koster over byggets levetid.',
    tilknyttetModulId: 'breeam',
    tilknyttetBeregningNavn: '25-års LCC & Nåverdi',
    seksjoner: [
      {
        tittel: '1. Investeringskalkyle (CAPEX)',
        innhold: 'Total investeringskostnad fordelt på innvendig sanitær, varmeanlegg, ventilasjon, sprinkler og utvendig VA/grøft for Alternativ 1, 2 og 3.'
      },
      {
        tittel: '2. Årlige Drifts-, Energi- og Vedlikeholdskostnader (OPEX)',
        innhold: 'Energikostnad basert på levert energi og energipris. Årlige serviceavtaler, filterbytter, feiing/kontroll og tømmekostnader for olje- og fettutskillere og sandfangkummer.'
      },
      {
        tittel: '3. 25-års Nåverdisammenligning (LCC iht. NS 3454)',
        innhold: 'Diskontering av fremtidige kostnader med kalkulasjonsrente r (f.eks. 4 %) og levetid n = 25 år: Nåverdifaktor = (1 - (1+r)^-n) / r. Total LCC for de 3 alternativene.'
      },
      {
        tittel: '4. Nedbetalingstid og Lønnsomhetsvurdering',
        innhold: 'Merinvestering i mer energieffektivt utstyr (f.eks. bergvarme vs el-kjel) målt mot årlig energibesparelse. Enkel nedbetalingstid og nåverdi av besparelsen.'
      },
      {
        tittel: '5. ⚠️ HINT for 100 % Sikkerhet',
        innhold: 'Varsel om urealistiske energipriser, glemte tømmekostnader for utskillere eller manglende reinvesteringsavsetning.'
      },
      {
        tittel: '6. Mesterens Huskeliste for LCC og Kalkyle',
        innhold: 'Vurdering av reservedelstilgang, levetid på pumper (10–15 år) vs rørnett (40–50 år) og driftsstabilitet.'
      }
    ],
    sjekkliste: [
      { id: 'a13-1', tekst: 'LCC-beregning utført etter formelverk i NS 3454', standard: 'NS 3454' },
      { id: 'a13-2', tekst: 'Både CAPEX, årlig energi-OPEX og lovpålagte tømmerutiner inkludert', standard: 'NS 3454' },
      { id: 'a13-3', tekst: 'Kalkulasjonsrente og analyseperiode eksplisitt oppgitt (f.eks. 4 % over 25 år)', standard: 'DFØ' },
      { id: 'a13-4', tekst: 'Nedbetalingstid beregnet for de 3 alternativene fra Agent 17', standard: 'NS 3454' },
      { id: 'a13-5', tekst: 'Reinvesteringskostnader for pumper og automatikk innregnet etter 12–15 år', standard: 'NS 3454' },
    ],
    kilder: [
      { navn: 'NS 3454 Livssykluskostnader for byggverk (LCC)', type: 'standard', kilde: 'standard.no' },
      { navn: 'DFØ Veileder i livssykluskostnader (LCC)', type: 'veileder', kilde: 'anskaffelser.no' },
      { navn: 'Norsk Prisbok VVS', type: 'leverandor', kilde: 'norskprisbok.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 13: LCC, ENTREPRISEKALKYLE & LØNNSOMHETSANALYSE]
Du opererer nå som Agent 13. Sett opp (1) Investeringskalkyle (CAPEX inkl. innvendig VVS, utvendig VA/grøft/utskillere og energisentral), (2) Årlig energi-, tømme- og FDV-kostnad (OPEX), (3) 25-års LCC-sammenligning av de 3 alternativene fra Agent 17 med nåverdi (NPV) og nedbetalingstid, og (4) ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Glem aldri tømmekostnadene for olje- og fettutskiller i driftskalkylen. Slambilsuging kan koste titusenvis av kroner i året.',
      'Husk at pumper, vifter og automatikk må påregnes skiftet ut etter 12–15 år, mens rørnettet varer i 50 år.',
      'Bruk alltid realistiske energipriser inkludert nettleie og effektledd når du beregner nedbetalingstid.'
    ]
  },
  {
    id: 'agent-14',
    nummer: 14,
    navn: 'Rehabilitering, Ombygging & Eksisterende Bygg',
    kortNavn: 'Rehabilitering',
    nsKode: 'PBL § 31-2 / As-Built',
    kategori: 'fag',
    ikon: '🏚️',
    standarder: ['Plan- og bygningsloven § 31-2', 'TEK17', 'Byggforsk Rehab'],
    kjernefunksjon: 'Spesialist på tilkobling på eldre rør og kummer (støpejern, asbestsement, betong, stål) i kulverter og grunnmur under pågående drift. Håndterer fravik etter PBL § 31-2 og As-Built revisjon.',
    rolleBeskrivelse: 'Rehabiliteringsingeniør som løser de tøffeste utfordringene i eksisterende bygningsmasse uten utilsiktede driftsstanser.',
    tilknyttetModulId: 'prosjekt',
    tilknyttetBeregningNavn: 'Rehab-risiko & Koblingsmetodikk',
    seksjoner: [
      {
        tittel: '1. Påkobling på Eksisterende Rør og VA-nett',
        innhold: 'Overgang mellom gamle støpejernsrør (MA/norma), betongrør, galvaniserte stålrør og nye rørtyper (PP SN8, PE100 RC). Korrosjonskontroll, trykktesting og fleksible overgangskoblinger (Fernco / Jet-kobling).'
      },
      {
        tittel: '2. Etappevis Drift og Provisoriske Anlegg',
        innhold: 'Planlegging av provisorisk vann- og avløpsforsyning, midlertidig varme, frysing av rør med CO2/nitrogen for ventilsikring og nattarbeid ved kritiske omkoblinger.'
      },
      {
        tittel: '3. Lav Takhøyde, Sjakter og PBL § 31-2 Fravik',
        innhold: 'Håndtering av lave kjellere, trange bjelkelag og formulering av teknisk og økonomisk begrunnede fravikssøknader etter plan- og bygningslovens § 31-2.'
      },
      {
        tittel: '4. ⚠️ HINT for 100 % Sikkerhet',
        innhold: 'Krav til TV-inspeksjon før omkobling, asbestsjekk på rørisolasjon, kontroll av svanker i eksisterende bunnledning og 3D-skanning av kulvert.'
      },
      {
        tittel: '5. Mesterens Huskeliste for Rehabilitering',
        innhold: 'Viktige rutiner for demontering av gamle anlegg, sikring mot legionella i blindrør og vannlekkasjesikring.'
      }
    ],
    sjekkliste: [
      { id: 'a14-1', tekst: 'TV-inspeksjon av eksisterende bunnledninger utført før påkobling', standard: 'NS-EN 13508', kritisk: true },
      { id: 'a14-2', tekst: 'Asbestkartlegging av eksisterende bend- og rørisolasjon gjennomført', standard: 'Arbeidstilsynet', kritisk: true },
      { id: 'a14-3', tekst: 'PBL § 31-2 fravikssøknad forberedt dersom tekniske minstekrav ikke lar seg oppfylle', standard: 'PBL § 31-2' },
      { id: 'a14-4', tekst: 'Provisorisk vanntilførsel og avløp sikret for arealer som skal holdes i drift', standard: 'NS 8405' },
      { id: 'a14-5', tekst: 'Blindrør på drikkevannsanlegget kappet helt inn til hovedstamme mot Legionella', standard: 'Folkehelseinstituttet' },
    ],
    kilder: [
      { navn: 'Plan- og bygningsloven § 31-2 Veiledning om eksisterende bygg', type: 'lov', kilde: 'dibk.no' },
      { navn: 'Byggforskserien Rehabilitering og ombygging', type: 'veileder', kilde: 'byggforsk.no' },
      { navn: 'Folkehelseinstituttet Vannrapport (Legionellasikring)', type: 'veileder', kilde: 'fhi.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 14: REHABILITERING, OMBYGGING & EKSISTERENDE BYGG]
Du opererer nå som Agent 14. Analyser:
1. PÅKOBLING PÅ EKSISTERENDE RØR OG VA-NETT: Overgang mellom gamle støpejernsrør/galvaniserte rør/betongrør og nye systemer (Jet-kobling/fernco, korrosjonssjekk, høydekotekontroll mot eksisterende bunnledning/kum).
2. ETAPPEVIS DRIFT UNDER OMBYGGING: Provisorisk vann/avløp/varme, fryseplugger og nattestengning.
3. LAV TAKHØYDE OG PBL § 31-2 FRAVIK.
4. ⚠️ HINT FOR 100 % SIKKERHET (krav til kamerainspeksjon av gamle rør, 3D-scanning, asbestsjekk) & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Stol ALDRI på gamle "som bygget"-tegninger (As-Built). Kontroller alltid fysisk med laser og vater på plassen.',
      'Fjern alle blindrør helt inn til hovedrøret. Et blindrør på 1 meter er en perfekt bakterie- og legionellafelle.',
      'Vær ekstremt varsom med rørfrysing på gamle korroderte rør - ispluggen kan sprenge røret hvis det er svekket.'
    ]
  },
  {
    id: 'agent-15',
    nummer: 15,
    navn: 'Tilbudsbrev, Møtereferat & Kundekommunikasjon',
    kortNavn: 'Tilbudsbrev',
    nsKode: 'NS 8401 / NS 8402',
    kategori: 'kontrakt_qa',
    ikon: '✉️',
    standarder: ['NS 8401', 'NS 8402', 'Alminnelige kontraktsbestemmelser for rådgivere'],
    kjernefunksjon: 'Produksjon av profesjonelle rådgivertilbud (NS 8401/8402), oppdragsbekreftelser, prosjekteringsreferater og formelle endringsvarsler (VO) med klare forbehold.',
    rolleBeskrivelse: 'Juridisk og kommersiell rådgiver som sikrer rådgiverens rettigheter, tydeliggjør honorar og forhindrer tvister.',
    tilknyttetModulId: 'prosjekt',
    tilknyttetBeregningNavn: 'Tilbudsdokument & Forbehold',
    seksjoner: [
      {
        tittel: '1. Formelt Tilbudsbrev for VVS- og VA-prosjektering',
        innhold: 'Strukturert tilbud iht. NS 8401 (fastpris/målpris/regning): Oppdragsomfang, faglige ytelser, timebudsjett fra Agent 01, timepriser og betalingsplan.'
      },
      {
        tittel: '2. Tydelige Forbehold og Forutsetninger',
        innhold: 'Standard forbehold om:\n• Kommunale VA-koter og tilbakeslagshøyder (krav til nøyaktig innmåling fra oppdragsgiver)\n• Grunnforhold, fjell og forurensede masser\n• Brannkonsept og akustiske krav fra andre rådgivere\n• Byggherres leveringstid for romprogram og leietakerspesifikasjoner.'
      },
      {
        tittel: '3. Prosjekteringsreferat og Beslutningslogg',
        innhold: 'Dokumentasjon av tekniske valg, fellesmøter, oppgaver, frister og godkjente endringer.'
      },
      {
        tittel: '4. Formelt Endringsvarsel (Variation Order - VO)',
        innhold: 'Varsel iht. NS 8401 punkt 11 ved endret underlag, forsinket leveranse fra andre fag eller utvidet omfang, med konsekvenser for tid og kostnad.'
      },
      {
        tittel: '5. ⚠️ HINT for 100 % Sikkerhet & Mesterens Huskeliste',
        innhold: 'Varsel om manglende skriftlige avklaringer som kan lede til uenighet om honorar.'
      }
    ],
    sjekkliste: [
      { id: 'a15-1', tekst: 'NS 8401 eller NS 8402 eksplisitt angitt som kontraktsstandard', standard: 'NS 8401/8402', kritisk: true },
      { id: 'a15-2', tekst: 'Forbehold om nøyaktige kommunale VA-koter og Q/p-måling inntatt i tilbudet', standard: 'God praksis', kritisk: true },
      { id: 'a15-3', tekst: 'Frist for varsling av endringer (VO) innarbeidet i oppdragsrutinen', standard: 'NS 8401' },
      { id: 'a15-4', tekst: 'Timepriser for oppdragsleder, senioringeniør og DAK-tegner spesifisert', standard: 'NS 8401' },
      { id: 'a15-5', tekst: 'Ansvarsbegrensning iht. NS 8401 (maksimalt erstatningsansvar) bekreftet', standard: 'NS 8401' },
    ],
    kilder: [
      { navn: 'NS 8401 Alminnelige kontraktsbestemmelser for prosjekteringsoppdrag', type: 'standard', kilde: 'standard.no' },
      { navn: 'NS 8402 Alminnelige kontraktsbestemmelser for rådgivningsoppdrag', type: 'standard', kilde: 'standard.no' },
      { navn: 'RIF (Rådgivende Ingeniørers Forening) standardmaler', type: 'veileder', kilde: 'rif.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 15: TILBUDSBREV, MØTEREFERAT & KUNDEKOMMUNIKASJON]
Du opererer nå som Agent 15. Produser komplett tilbudsbrev på rådgivning (med timebudsjett fra Agent 01 og tydelige forbehold om grunnforhold, kommunale VA-koter og tverrfaglig underlag), prosjekteringsreferat eller endringsvarsel (VO), avsluttet med ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Start ALDRI prosjektering før skriftlig oppdragsbekreftelse og signert kontrakt foreligger.',
      'Varsle endringer (VO) umiddelbart og skriftlig hvis arkitekten endrer planløsningen eller flytter en sjakt.',
      'Sørg for at tilbudet har et krystallklart forbehold om at kotehøyder må verifiseres i felt.'
    ]
  },
  {
    id: 'agent-16',
    nummer: 16,
    navn: 'QA, Kildekritikk & Djevelens Advokat',
    kortNavn: 'Djevelens Advokat',
    nsKode: 'Overordnet QA-Port',
    kategori: 'kontrakt_qa',
    ikon: '🛡️',
    standarder: ['NS-EN ISO 9001', 'TEK17', 'VA-norm', 'NS-EN 12056', 'NS-EN 12828'],
    kjernefunksjon: 'Den avsluttende, nådeløse kvalitetsrevisoren: Gjennomfører full 6-trinns revisjon (matematisk reversert regning, kotekontroll mot 950 mm-regelen, kildekritikktabell, logisk brist/sanity check, worst-case og 5-minutters sjekkliste før signatur).',
    rolleBeskrivelse: 'Sjefingeniør og faglig revisjonsport. Ingen leveranse forlater huset uten at Agent 16 har godkjent tallene baklengs.',
    tilknyttetModulId: 'sanitaer',
    tilknyttetBeregningNavn: 'Reversert Beregningskontroll & 950 mm-revisjon',
    seksjoner: [
      {
        tittel: '1. Matematisk Revisjon og Reversert Regning',
        innhold: 'Kontrollregning av samtlige formler fra bunnen av i motsatt retning:\n• Trykktap: Verifiser at tilgjengelig vanntrykk minus høydetap og friksjonstap etterlater minst 1,0–1,5 bar ved ugunstigste tappested.\n• Vannmengde: Kontroller q_dim opp mot antall tappesteder med q_dim = a · (Σq_s)^b.\n• Beredervolum: Kontroller energibalanse E = m · c · ΔT mot samtidig dusjtappevolum.\n• Overvann: Reverser A_red · i · kf og kontroller mot magasinvolum og utløpsregulator.'
      },
      {
        tittel: '2. Kote- og 950 mm-revisjon (Spesialsjekk for Sanitær & VA)',
        innhold: '• Reversert koteregnskap: IBR i kommunal kum + (Grøftelengde × Fall) = Kote utgang grunnmur.\n• UFRAVIKELIG KONTROLL: Margin = Kote laveste sluk (OK FG) - Kote ITR kommunal kum.\n• HVIS MARGIN ≥ 0,95 m: Godkjent for selvfall.\n• HVIS MARGIN < 0,95 m (eller negativ): RØD ALARM! Slå alarm og krev lukket avløpspumpestasjon (NS-EN 12050) med svanehals over gatenivå!'
      },
      {
        tittel: '3. Kildekritikk-tabell',
        innhold: 'Strukturert revisjonstabell for samtlige påstander og premisser: Klassifiseres som enten:\n• ✅ Verifisert i kilde\n• ⚠️ Antagelse (krever bekreftelse)\n• ❌ Hallusinasjon / Prosjekteringsfeil.'
      },
      {
        tittel: '4. Logisk Brist og Sanity Check',
        innhold: 'Sjekk av overordnede sammenhenger:\n• Er branntromler plassert i korridor med maks 30 m reell ganglinje?\n• Er det kun benyttet 45° Y-gren i liggende bunnledning?\n• Er det montert stakeluker ved alle stammer?\n• Er det sandfangkummer foran overvannsmagasin?\n• Er det BA-tilbakeslagsventil på vaskehall/verksted?'
      },
      {
        tittel: '5. Konsekvensanalyse (Worst Case)',
        innhold: 'Hva skjer dersom: Kommunal ledning stuver opp til gatelokk? Det oppstår 20-års skybrudd? Strømmen går under spisslast i kjeller?'
      },
      {
        tittel: '6. Seniorrådgiverens 5-minutters Sjekkliste Før Signatur',
        innhold: 'Ferdig avkryssingsliste for RIV/Rørleggermester før dokumenter sendes til oppdragsgiver eller kommune.'
      }
    ],
    sjekkliste: [
      { id: 'a16-1', tekst: 'Kotekontroll mot 950 mm-regelen regnet baklengs og bekreftet', standard: 'TEK17 § 15-6/8 / VA-norm', kritisk: true },
      { id: 'a16-2', tekst: 'Laveste kjellersluk identifisert - pumpekrav utløst dersom margin < 0,95 m', standard: 'NS-EN 12050', kritisk: true },
      { id: 'a16-3', tekst: 'Trykkfallsregnskap balansert med positivt resttrykk ved ugunstigste kran', standard: 'NS-EN 806-3', kritisk: true },
      { id: 'a16-4', tekst: 'Berederkapasitet verifisert mot spisslastforbruk', standard: 'NS-EN 806-2', kritisk: true },
      { id: 'a16-5', tekst: 'Forbud mot 88° T-rør i liggende bunnledning 100 % overholdt i beskrivelse og tegning', standard: 'NS-EN 12056', kritisk: true },
      { id: 'a16-6', tekst: 'Kildekritikktabell utfylt uten uoppklarte "Røde feil"', standard: 'ISO 9001', kritisk: true },
    ],
    kilder: [
      { navn: 'TEK17 Forskrift og veiledning', type: 'lov', kilde: 'dibk.no' },
      { navn: 'Kommunal VA-norm (Lokale bestemmelser)', type: 'lov', kilde: 'va-norm.no' },
      { navn: 'NS-EN 806 / NS-EN 12056 / NS-EN 1717', type: 'standard', kilde: 'standard.no' },
      { navn: 'ISO 9001 Kvalitetsstyringssystemer', type: 'standard', kilde: 'standard.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 16: QA, KILDEKRITIKK & DJEVELENS ADVOKAT]
Du opererer nå som Agent 16, den avsluttende QA-porten. Gjennomfør disse 6 revisjonsstegene:
1. MATEMATISK REVISJON OG REVERSERT REGNING: Kontrollregn alle formler (effekt, vannmengder, luftmengder, energi, LCC) på nytt fra bunnen av.
2. KOTE- OG 950 MM-REVISJON (SPESIALSJEKK FOR SANITÆR/VA):
   - Regn over koteregnskapet fra Agent 19 og Agent 03 baklengs: \`Kote IBR kommunal kum + (Grøftelengde × Fall) = Kote utgang grunnmur\`.
   - Verifiser at \`Kote laveste sluk (OK FG) minus Kote innvendig topp rør (ITR) i kommunal kum ≥ 0,95 meter (950 mm)\`. Flagg ethvert avvik med RØD ALARM!
3. KILDEKRITIKK-TABELL: Klassifiser påstander som \`✅ Verifisert i kilde\`, \`⚠️ Antagelse\` eller \`❌ Hallusinasjon/Feil\`.
4. LOGISK BRIST OG SANITY CHECK: Sjekk at branntromler, stake-/spylegren, 45° Y-grenrør, sandfang og tilbakeslagssikring faktisk er med!
5. KONSEKVENSANALYSE (WORST CASE).
6. SENIORRÅDGIVERENS 5-MINUTTERS MANUELLE SJEKKLISTE FØR SIGNATUR.`,
    mesterensHuskeliste: [
      'Regn alltid kotene baklengs fra kommunal kum til bygget. Mange feil oppstår fordi noen har addert i stedet for å subtrahere et fall.',
      'Hvis marginen mot kommunal ITR er under 950 mm, hjelper det ikke å håpe på det beste - prosjekter pumpe eller godkjent tilbakeslagsventil.',
      'Sjekk alltid om kildene er norske normer og ikke oversatt tysk eller amerikansk praksis.'
    ]
  },
  {
    id: 'agent-17',
    nummer: 17,
    navn: 'Konseptutredning & 3-Alternativs-Arkitekten',
    kortNavn: '3-Alternativer',
    nsKode: 'Tidligfase / Utstyrsvalg',
    kategori: 'fag',
    ikon: '🔀',
    standarder: ['TEK17', 'BREEAM-NOR v6.0', 'NS 3454'],
    kjernefunksjon: 'Etablerer alltid 3 komplette, sammenlignbare systemalternativer med anerkjent, gjennomprøvd norsk bransjeutstyr: Alt. 1 (Lavest CAPEX / Standard TEK17), Alt. 2 (Optimalisert LCC / Best totaløkonomi), Alt. 3 (Beste Miljø / BREEAM Excellent).',
    rolleBeskrivelse: 'Konseptutvikler og systemarkitekt som gir byggherre et reelt, faktabasert beslutningsgrunnlag i tidligfase.',
    tilknyttetModulId: 'prosjekt',
    tilknyttetBeregningNavn: '3-Alternativs Sammenligning',
    seksjoner: [
      {
        tittel: '1. Alternativ 1 — Lavest Investeringskostnad (Standard TEK17)',
        innhold: 'Minimumsløsning iht. forskrift: El-kjel / enkel luft/vann-varmepumpe, standard VAV, selvfallsavløp der mulig, standard beredere og standard overvannshåndtering.'
      },
      {
        tittel: '2. Alternativ 2 — Optimalisert LCC (Best Totaløkonomi over 25 år)',
        innhold: 'Høyeffektiv bergvarmepumpe (geotermisk) eller fjernvarme med lavtemperatursystem, roterende gjenvinnere med høy virkningsgrad og batterigjenvinner på prosess, avløpsvarmegjenvinning fra dusjer, trykkuavhengige ventiler (PIBCV) og fordrøyning i grunnen.'
      },
      {
        tittel: '3. Alternativ 3 — Beste Miljø- og Lavenergiløsning (BREEAM Excellent)',
        innhold: 'Maksimal energisparing med grunnvarme og frikjøling, solfangere/solceller, spillvannsvarmegjenvinning, grønne sedumtak med fordrøyning, avansert behovsstyring (VAV m/ CO2 og temp), lav-GWP kuldemedier og EPD-sertifiserte materialer.'
      },
      {
        tittel: '4. Spesifisert Norsk Bransjeutstyr',
        innhold: 'Spesifikasjon av anerkjente merker med landsdekkende service:\n• Pumper: Grundfos / Wilo\n• Ventiler: Danfoss / IMI Hydronic / Belimo\n• Rør: Geberit Mapress / Silent-db20 / Uponor / Sanipex / Pipelife / Wavin\n• Utskillere: ACO / Kessel\n• Gategods & kummer: Ulefos / AVK\n• Slokking: NOHA / Presto / Ansul\n• Ventilasjon: Systemair / Swegon / Trox\n• Beredere & Varmepumper: OSO Hotwater / NIBE / CTC / Thermia.'
      },
      {
        tittel: '5. Sammenligningsmatrise og Mesterens Anbefaling',
        innhold: 'Tabell med CAPEX, OPEX, LCC (25 år), miljøprofil og teknisk risiko, avsluttet med rådgiverens klare faglige anbefaling.'
      },
      {
        tittel: '6. ⚠️ HINT for 100 % Sikkerhet',
        innhold: 'Forutsetninger om energipriser, geologiske grunnundersøkelser for energibrønner og leietakers krav.'
      }
    ],
    sjekkliste: [
      { id: 'a17-1', tekst: 'Tre distinkte alternativer (Lav CAPEX, Optimal LCC, Beste Miljø) etablert', standard: 'God rådgiverpraksis' },
      { id: 'a17-2', tekst: 'Samtlige utstyrsposter spesifisert med velprøvde merker med norsk serviceapparat', standard: 'Lov 3' },
      { id: 'a17-3', tekst: 'Felles aggregat for kontor og kjøkken unngått i samtlige alternativer', standard: 'TEK17 § 13-1', kritisk: true },
      { id: 'a17-4', tekst: 'Kjelleravløp prosjektert med pumpestasjon i samtlige alternativer hvis margin < 950 mm', standard: 'Lov 2', kritisk: true },
      { id: 'a17-5', tekst: 'Sammenligningstabell med CAPEX, OPEX og 25-års LCC inkludert', standard: 'NS 3454' },
    ],
    kilder: [
      { navn: 'TEK17 Forskrift og veiledning', type: 'lov', kilde: 'dibk.no' },
      { navn: 'BREEAM-NOR v6.0', type: 'veileder', kilde: 'byggalliansen.no' },
      { navn: 'Norske leverandørers tekniske kataloger (Grundfos, OSO, Geberit, NIBE)', type: 'leverandor', kilde: 'Leverandørdatabaser' },
    ],
    masterPrompt: `[AKTIVER AGENT 17: KONSEPTUTREDNING & 3-ALTERNATIVS-ARKITEKTEN]
Du opererer nå som Agent 17. Ved nybygg eller større ombygginger SKAL du sette opp 3 komplette systemalternativer:
- ALTERNATIV 1 (Lavest CAPEX / Standard TEK17-løsning)
- ALTERNATIV 2 (Optimalisert LCC / Beste totaløkonomi og driftssikkerhet over 25 år)
- ALTERNATIV 3 (Beste Miljø- og Lavenergiløsning / BREEAM Excellent / Lavest OPEX)
Spesifiser gjennomprøvd utstyr med norsk serviceapparat i alle alternativer (Grundfos/Wilo pumper, IMI/Danfoss/Belimo ventiler, Geberit Mapress/Silent-db20/Pluvia, Sanipex/Uponor, Blücher/Joti sluk, ACO/Kessel utskillere, Ulefos/AVK gategods og ventiler, Wavin/Pipelife kummer og rør, NOHA/Presto branntromler, Systemair/Swegon/Covent aggregater, Trox/Lindab VAV og NIBE/CTC/Thermia/Carrier varmepumper). Lag sammenligningstabell og avslutt med ⚠️ HINT & MESTERENS ANBEFALING.`,
    mesterensHuskeliste: [
      'Bruk aldri eksotiske importerte produkter uten norsk representasjon eller reservedelslager.',
      'Sørg for at Alternativ 2 alltid fremstår som det mest rasjonelle valget for en langsiktig eiendomsbesitter.',
      'Husk at energibrønner krever geologisk forundersøkelse for å bekrefte varmeledningsevnen i fjellet.'
    ]
  },
  {
    id: 'agent-18',
    nummer: 18,
    navn: 'FDV, Vannbehandling & Prøvedrift',
    kortNavn: 'FDV & VDI 2035',
    nsKode: 'NS 6450 / NS 3456 / VDI 2035',
    kategori: 'fag',
    ikon: '🔧',
    standarder: ['VDI 2035 / Kompa', 'NS 6450 (Prøvedrift)', 'NS 3456 (FDV)'],
    kjernefunksjon: 'Kravspesifikasjon for vannkvalitet i lukkede varme- og kjøleanlegg (VDI 2035/Kompa), driftsinstrukser for utskillere/sandfang, FDV-dokumentasjon og 1–3 års prøvedriftsplan.',
    rolleBeskrivelse: 'Drifts- og forvaltningsrådgiver som sikrer at anleggene beholder virkningsgraden og fungerer knirkefritt i hele driftsfasen.',
    tilknyttetModulId: 'prosjekt',
    tilknyttetBeregningNavn: 'Vannbehandlingskrav & FDV-rutiner',
    seksjoner: [
      {
        tittel: '1. Vannbehandling og Vannkvalitet i Lukkede Anlegg (VDI 2035)',
        innhold: 'Krav til fyllvann og systemvann:\n• Hardhet (< 1 °dH ved store volum eller aluminiumsvekslere)\n• pH-verdi (8,2–9,5 for stål/kobber, 8,2–8,5 for aluminium)\n• Ledningsevne (< 100 µS/cm ved lavsaltmetode)\n• Krav til automatisk påfylling med vannmåler og tilbakeslagssikring BA\n• Montering av vakuumavgasser og magnetittfilter i delstrøm.'
      },
      {
        tittel: '2. Drifts- og Vedlikeholdsinstruks for VA-komponenter',
        innhold: 'Tømme- og kontrollrutiner for:\n• Sandfangkummer (tømming ved 50 % fylt slamsump, min. 1 gang per år)\n• Oljeutskillere (peiling, alarmtest månedlig, tømming ved oppnådd lagtykkelse)\n• Fettutskillere (tømming hver 2.–4. uke avhengig av belastning)\n• Tilbakeslagsventiler (årlig funksjonstest iht. NS-EN 1717 og NS-EN 13564)\n• Avløpspumpestasjoner (månedlig sjekk av flottører og automatisk alternering).'
      },
      {
        tittel: '3. Plan for Prøvedrift og Idriftsetting (NS 6450)',
        innhold: 'Faser i prøvedriften: Teknisk ferdigstillelse, funksjonstesting, integrert test (fullskalatest ved simulert brann og strømbrudd), innregulering over 4 årstider og sesongoptimalisering.'
      },
      {
        tittel: '4. FDV-struktur etter NS 3456',
        innhold: 'Systematisk oppbygging av FDV-dokumentasjon: Systemskjemaer (P&ID), komponentdatablader, TFM-merkelister, serviceavtaler og reservedelslister.'
      },
      {
        tittel: '5. ⚠️ HINT for 100 % Sikkerhet & Mesterens Huskeliste',
        innhold: 'Kritiske mangler ved fylling av råvann uten avsalting, manglende serviceadkomst til filter og glemte vannprøver.'
      }
    ],
    sjekkliste: [
      { id: 'a18-1', tekst: 'Krav til fyllvannskvalitet (pH, ledningsevne, hardhet) spesifisert etter VDI 2035', standard: 'VDI 2035', kritisk: true },
      { id: 'a18-2', tekst: 'Tømme- og kontrollinstruks for fett- og oljeutskillere utarbeidet for driftspersonell', standard: 'NS-EN 858 / NS-EN 1825' },
      { id: 'a18-3', tekst: 'Prøvedriftsplan med sesongjustering i 12 måneder etablert', standard: 'NS 6450' },
      { id: 'a18-4', tekst: 'Vannprøveprotokoll for varmeanlegg før overtakelse innarbeidet i KS', standard: 'VDI 2035' },
      { id: 'a18-5', tekst: 'FDV-dokumentasjon strukturert med TFM-koder i henhold til NS 3456', standard: 'NS 3456' },
    ],
    kilder: [
      { navn: 'VDI 2035 Unngåelse av skader i varmtvannsoppvarmingsanlegg', type: 'veileder', kilde: 'kompa.no' },
      { navn: 'NS 6450 Idriftsetting og prøvedrift av tekniske bygningsinstallasjoner', type: 'standard', kilde: 'standard.no' },
      { navn: 'NS 3456 Dokumentasjon for forvaltning, drift, vedlikehold og utvikling (FDVU)', type: 'standard', kilde: 'standard.no' },
      { navn: 'Kompa Vannbehandlingshåndbok', type: 'veileder', kilde: 'kompa.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 18: FDV, VANNBEHANDLING & PRØVEDRIFTS-REVISOR]
Du opererer nå som Agent 18. Lever: (1) Krav til vannbehandling og vannkvalitet (VDI 2035 / Kompa), (2) FDV- og driftsinstruks for utvendige og innvendige VA-komponenter (tømme- og kontrollrutiner for sandfangkummer, oljeutskiller, fettutskiller, tilbakeslagsventiler BA, stakekummer og pumpestasjon), (3) Plan for 1–3 års prøvedrift (NS 6450), og (4) ⚠️ HINT & MESTERENS HUSKELISTE.`,
    mesterensHuskeliste: [
      'Fyll aldri et moderne varmeanlegg med rått kranvann uten å måle hardhet og ledningsevne. Oksygen og salter spiser opp stål og kobber innen 2–3 år.',
      'Sørg for at anlegget har montert et delstrøms magnetittfilter som er enkelt å tømme for driftspersonalet.',
      'Krev at prøvedrift omfatter minst én hel vinter- og én hel sommersyklus for å finjustere kurvene.'
    ]
  },
  {
    id: 'agent-19',
    nummer: 19,
    navn: 'Utvendig VA, Hovedledninger, Koter & Grøfteteknikk',
    kortNavn: 'Utvendig VA',
    nsKode: 'Kode 730 / TEK17 § 15-7/8',
    kategori: 'fag',
    ikon: '🚜',
    standarder: ['TEK17 § 15-7, § 15-8', 'Kommunal VA-norm', 'VA/Miljø-blad', 'NS 3420 Kap. F/G'],
    kjernefunksjon: 'Ansvarlig for alt utvendig vann og avløp fra 1 m utenfor grunnmur til anboring på kommunal hovedledning: Kotehøyder (NN2000), 950 mm tilbakeslagskontroll, stikkledninger, utvendig stoppekran, sandfang, utskillere og fordrøyning.',
    rolleBeskrivelse: 'Senior VA-ingeniør og rørleggermester i grøfta som sikrer at bygget har trygg vanntilførsel og aldri opplever tilbakeslag fra kommunalt avløp.',
    tilknyttetModulId: 'sanitaer',
    tilknyttetBeregningNavn: 'Koteregnskap, 950 mm-kontroll & Overvannsfordrøyning',
    seksjoner: [
      {
        tittel: '1. Koteregnskap (NN2000), Fallberegning og 950 mm Tilbakeslagskontroll',
        innhold: '• Kote Innvendig Bunn Rør (IBR) og Innvendig Topp Rør (ITR) i kommunal hovedledning/kum: C +XX,XX\n• Stikkledningens lengde (m) × fall (min. 1:60 = 16,7 ‰ eller 1:100 = 10 ‰) = Høydetap i grøft (m)\n• Kote IBR ved utgang grunnmur (1 m utenfor vegg): C +XX,XX\n• Kote laveste sluk / ferdig gulv (OK FG) i bygget: C +XX,XX\n• UFRAVIKELIG 950 MM-KONTROLL: Margin = Kote laveste sluk (OK FG) - Kote ITR på kommunal ledning.\n• Margin ≥ 0,95 m: Godkjent for selvfall.\n• Margin < 0,95 m (eller negativ): RØD ALARM! Krever separat avløpspumpestasjon (NS-EN 12050) med svanehals over gatenivå!'
      },
      {
        tittel: '2. Hovedvannledning, Anboring, Stikkledning og Utvendig Stoppekran',
        innhold: '• Anboring på kommunal hovedvannledning (anboringsklammer eller T-rør med sluseventil i vannkum, AVK/Ulefos).\n• Stikkledning for forbruksvann og sprinkler (PE100 RC SDR11 PN16).\n• UTVENDIG STOPPEKRAN: Bakgekran med teleskopisk spindelforlenger, støttehylse og kjøresterk gategodskappe ved tomtegrense og 1–3 m fra fasade, inkl. blått anvisningsskilt.'
      },
      {
        tittel: '3. Separatsystem for Spillvann (SP), Gråvann og Overvann (OV) + Kummetyper',
        innhold: '• Spillvannsledning (SP - rødbrunt PP SN8/SN16), Overvannsledning (OV - sort/blått PP SN8).\n• Utvendig stakekum eller stake-/spylegren (min. Ø400/Ø600 med kjegle og flytende kumlokk 40 tonn) 1 m utenfor grunnmur, ved retningsendringer > 30–45° og maks hver 40.–50. meter.'
      },
      {
        tittel: '4. Sandfangkummer (SF), Overvannsfordrøyning (LOD) og Utskillere',
        innhold: '• Sandfangkummer: Alle sluk på gårdsplass, taknedløp og drensledninger føres via sandfangkum med dykket utløp/vannlås og min. 500–700 mm slamsump før utslipp til overvannsnett/fordrøyning.\n• Fordrøyning (TEK17 § 15-8): q_r = i · φ · A (klimafaktor ≥ 1,4). Fordrøyningsmagasin (Wavin Q-Bic Plus eller rørforsinkelse) med virvelkammer / mengderegulator mot maksimalt kommunalt påslipp.\n• Utskillere i bakken: Oljeutskiller kl. 1 (NS-EN 858) for vaskehall/verksted, og fettutskiller (NS-EN 1825) for storkjøkken, inkl. prøvetakingskum.'
      },
      {
        tittel: '5. Grøftesnitt, Frostsikring og Avstandskrav (NS 3420 Kap. F/G & VA-Miljøblad)',
        innhold: 'Grøftedybde (frostfri dybde 1,6–2,0 m eller XPS markisolasjon). Fundamentlag min 150 mm pukk, omfyllingsmasser, merke-/varselbånd og søketråd over PE-rør. Avstandskrav mellom vann og avløp (min 40 cm sideveis eller separat grøftehylle).'
      },
      {
        tittel: '6. ⚠️ HINT for 100 % Sikkerhet & Mesterens Huskeliste i Grøfta',
        innhold: 'Manglende koter på VA-kart, tetthetsprøving med luft/vann, spyling, desinfisering (kloring) og TV-inspeksjon med fallmåling før grøftelukking.'
      }
    ],
    sjekkliste: [
      { id: 'a19-1', tekst: 'Kotehøyder for IBR og ITR i kommunal tilkoblingskum bekreftet i NN2000', standard: 'VA-norm', kritisk: true },
      { id: 'a19-2', tekst: '950 mm tilbakeslagskontroll utført for laveste innvendige sluk', standard: 'TEK17 § 15-6/8 / VA-norm', kritisk: true },
      { id: 'a19-3', tekst: 'Utvendig stoppekran (bakgekran) med spindelforlenger prosjektert ved tomtegrense', standard: 'Kommunal VA-norm', kritisk: true },
      { id: 'a19-4', tekst: 'Sandfangkum med dykket utløp og min. 600 mm slamsump prosjektert før fordrøyning', standard: 'VA/Miljø-blad', kritisk: true },
      { id: 'a19-5', tekst: 'Fordrøyningsvolum beregnet med klimafaktor kf ≥ 1,4 og utløpsregulator', standard: 'TEK17 § 15-8', kritisk: true },
      { id: 'a19-6', tekst: 'Olje- og fettutskiller dimensjonert med integrert eller separat slamfang', standard: 'NS-EN 858 / NS-EN 1825', kritisk: true },
      { id: 'a19-7', tekst: 'Varselbånd og søketråd over PE-vannledning spesifisert i grøftebeskrivelse', standard: 'NS 3420-G' },
    ],
    kilder: [
      { navn: 'TEK17 Kapittel 15 (§ 15-7 Utvendig vannforsyning, § 15-8 Utvendig avløp)', type: 'lov', kilde: 'dibk.no' },
      { navn: 'Kommunal VA-norm (f.eks. IVAR, Stavanger, Bergen, Oslo, Asker)', type: 'lov', kilde: 'va-norm.no' },
      { navn: 'VA/Miljø-blad (Norsk Rørsenter)', type: 'veileder', kilde: 'va-blad.no' },
      { navn: 'Ulefos / AVK gategodskatalog', type: 'leverandor', kilde: 'ulefos.com / avk.no' },
      { navn: 'ACO Nordic Utskillere og linjedren', type: 'leverandor', kilde: 'aco.no' },
      { navn: 'Wavin / Pipelife overvannssystemer', type: 'leverandor', kilde: 'wavin.no / pipelife.no' },
    ],
    masterPrompt: `[AKTIVER AGENT 19: UTVENDIG VA, HOVEDLEDNINGER, KOTER & GRØFTETEKNIKK (KODE 730)]
Du opererer nå som Agent 19. Du har totalansvaret for prosjektering av utvendige VA-anlegg (NS 3451 kode 730) iht. TEK17 § 15-7, § 15-8, kommunal VA-norm og VA/Miljø-blad. Lever alltid disse 6 seksjonene med fulle utregninger:
1. KOTEREGNSKAP (NN2000), FALLBEREGNING OG 950 MM TILBAKESLAGSKONTROLL:
   - Sett opp eksakt koteregnskap fra kommunal tilkoblingskum og inn til bygget:
     * Kote Innvendig Bunn Rør (IBR) og Innvendig Topp Rør (ITR) i kommunal hovedledning/kum: C +XX,XX
     * Stikkledningens lengde (m) × valgt fall (min. 1:60 = 16,7 ‰ eller 1:100 = 10 ‰) = Høydetap i grøft (m)
     * Kote IBR ved utgang grunnmur (1 m utenfor vegg): C +XX,XX
     * Kote på laveste innvendige slukrist / topp ferdig gulv (OK FG) i bygget: C +XX,XX
   - UFRAVIKELIG 950 MM-KONTROLL (VA-NORM / TEK17 § 15-7/8):
     * Regn ut: Margin = Kote laveste sluk (OK FG) minus Kote ITR (innvendig topp rør) på kommunal hovedledning.
     * Hvis Margin ≥ 0,95 m (950 mm): Bekreft at selvfall er godkjent mot oppstuvning.
     * Hvis Margin < 0,95 m (eller negativ): SLÅ FULL RØD ALARM! Krev at avløpet fra denne etasjen føres til separat avløpspumpestasjon (NS-EN 12050) med pumperør løftet over oppstuvningshøyden ("svanehals") før utslipp til selvfallsledning!
2. HOVEDVANNLEDNING, ANBORING, STIKKLEDNING OG UTVENDIG STOPPEKRAN:
   - Spesifiser anboring på kommunal hovedvannledning (anboringsklammer under trykk eller T-rør med sluseventil i vannkum, AVK/Ulefos).
   - Dimensjoner stikkledning for forbruksvann og sprinklervann (f.eks. PE100 RC SDR11 PN16) basert på total vannmengde fra Agent 03 og Agent 05.
   - Spesifiser UTVENDIG STOPPEKRAN (bakgekran med teleskopisk spindelforlenger, støttehylse og kjøresterk gategodskappe i terreng) plassert ved tomtegrense/anboring og 1–3 m fra fasade, inkl. blått anvisningsskilt.
3. SEPARATSYSTEM FOR SPILLVANN (SP), GRÅVANN OG OVERVANN (OV) + STAKE-/SPYLEKUMMER:
   - Prosjekter komplett separatsystem i grøft: Spillvannsledning (SP – rødbrunt PP SN8/SN16), Overvannsledning (OV – sort/blått PP SN8) og eventuelt separat Gråvannsledning.
   - Spesifiser utvendig stake-/spylegren eller stakekum (min. Ø400/Ø600 mm med kjegle og kjøresterkt kumlokk 40 tonn) ved overgang 1 m utenfor grunnmur, ved alle retningsendringer (> 30–45°), ved sammenslåing av stikkledninger og maks hver 40.–50. meter.
4. SANDFANGKUMMER (SF), OVERVANNSFORDRØYNING (LOD) OG OLJE-/FETTUTSKILLERE:
   - Sandfangkummer: Alle utvendige sluk på kjørearealer, taknedløp og drensledninger SKAL føres via sandfangkum med dykket utløp/vannlås og slamsump (dybde min. 500–700 mm under utløpsrør) før påslipp til overvannsnett/fordrøyning.
   - Overvann og fordrøyning (TEK17 § 15-8): Beregn tak- og overflatevann (q_r = i · φ · A med klimafaktor ≥ 1,4) og dimensjoner fordrøyningsmagasin (kassetter eller rørforlegning med virvelkammer/utløpsregulator) mot kommunalt påslippskrav.
   - Utskillere i bakken: Dimensjoner nedgravd oljeutskiller med koalesensfilter og eget sandfang/slamfang (NS-EN 858, kl. 1) for vaskehall/verksted, og nedgravd fettutskiller med slamfang (NS-EN 1825) for storkjøkken, inkl. prøvetakingskum og lufting over tak.
5. GRØFTESNITT, FROSTSIKRING OG AVSTANDSKRAV (NS 3420 KAP. F/G & VA-MILJØBLAD):
   - Spesifiser grøftedybde (frostfri dybde 1,6–2,0 m eller XPS markisolasjon), fundamentlag (min. 150 mm pukk/singel), omfyllingsmasser, merke-/varselbånd og søketråd over PE-rør.
6. ⚠️ HINT FOR 100 % SIKKERHET & MESTERENS HUSKELISTE I GRØFTA:
   - List opp alt som mangler på VA-kartet, og gi sjekkliste for tetthetsprøving, spyling, desinfisering (kloring av vannledning) og TV-inspeksjon med fallmåling før grøfta lukkes.`,
    mesterensHuskeliste: [
      'Glem aldri utvendig stoppekran (bakgekran) ved tomtegrensen. Hvis bygget brenner eller hovedrøret sprekker, må brannvesenet og rørleggeren kunne stenge vannet utenfra.',
      'Sjekk at sandfangkummer har dykket utløp. Uten dykket utløp vil flytende olje og rusk renne rett inn i fordrøyningsmagasinet og tette det.',
      'Husk at søketråd av kobber må teipes til PE-røret før gjenfylling slik at gravemaskiner kan lokalisere plastrøret med kabelsøker i fremtiden.'
    ]
  }
];

export const SUPER_KOMMANDOER = [
  {
    id: 'kommando-1',
    nummer: 1,
    navn: 'Oppstart, Orkestrering & 3 Konseptalternativer',
    kortBeskrivelse: 'Tidligfase og konseptvalg: Registrering, timebudsjett, hull-identifikasjon, 3-alternativs utredning og 25-års LCC-analyse.',
    ikon: '🚀',
    agenter: ['agent-01', 'agent-17', 'agent-09', 'agent-13', 'agent-12'],
    agentNumre: [1, 17, 9, 13, 12],
    fokus: 'Tidligfase, konseptvalg, U-verdier, 3 alternativer og livssykluskostnader.',
    tekstPrompt: `KOMMANDO 1 — Oppstart, Orkestrering & 3 Konseptalternativer (Agent 01 + Agent 17 + Agent 13 + Agent 09 + Agent 12):
Kjør Agent 01 (VVS-Orkestrator), Agent 17 (3-Alternativs-Arkitekten) og Agent 13 (LCC-kalkyle) på det opplastede konkurransegrunnlaget. Registrer all prosjektinfo, list opp alle ⚠️ HINT om manglende underlag og de skjulte prosjektfellene, sett opp de 3 komplette løsningsalternativene med gjennomprøvd norsk bransjeutstyr, og regn ut 25-års LCC-lønnsomhet.`
  },
  {
    id: 'kommando-2',
    nummer: 2,
    navn: 'Utvendig VA, Koter, 950 mm-kontroll, Innvendig Sanitær & DAK',
    kortBeskrivelse: 'Komplett VA- og sanitærkjede med full kotekontroll, 950 mm tilbakeslagssjekk, bunnledninger (kun 45° gren), BIM-instruks og QA.',
    ikon: '💧',
    agenter: ['agent-19', 'agent-03', 'agent-07', 'agent-16'],
    agentNumre: [19, 3, 7, 16],
    fokus: 'Koter, 950 mm-regelen, utvendig VA, bunnledning, rørdimensjonering, TFM og QA-revisjon.',
    tekstPrompt: `KOMMANDO 2 — Utvendig VA, Koter, 950 mm-kontroll, Innvendig Sanitær & DAK-instruks (Agent 19 + Agent 03 + Agent 07 + Agent 16):
Kjør en komplett VA- og sanitærkjede med Agent 19 (Utvendig VA & Koter), Agent 03 (Innvendig Sanitær & Bunnledninger) og Agent 07 (BIM/DAK-Oversetter), etterfulgt av QA-revisjon i Agent 16. Sett først opp det fulle koteregnskapet fra kommunal kum til bygget og kontroller 950 mm-regelen mot tilbakeslag. Dimensjoner anboring, utvendig stoppekran, stikkledninger, stake-/spylekummer, sandfangkummer, olje-/fettutskillere og overvannsfordrøyning. Dimensjoner deretter innvendig vannfordeling, berederakkumulering og bunnledninger (husk regelen om kun 45° Y-gren og stake-/spylegren!), lag ferdig tegneinstruks med TFM-koder til DAK-tegneren, og la Agent 16 kontrollregne kotene og vannmengdene baklengs!`
  },
  {
    id: 'kommando-3',
    nummer: 3,
    navn: 'Varme, Sprinkler, Ventilasjon & Elektro/ITB',
    kortBeskrivelse: 'Tekniske systemer og tverrfaglige grensesnitt: Varmeanlegg, fullsprinkling, branntromler (reell ganglinje), ventilasjon med batterigjenvinner og SD/ITB.',
    ikon: '⚙️',
    agenter: ['agent-04', 'agent-05', 'agent-06', 'agent-08'],
    agentNumre: [4, 5, 6, 8],
    fokus: 'Varmesentral, hydronikk, sprinkler, branntromler, ventilasjonsaggregater og ITB grensesnittsmatrise.',
    tekstPrompt: `KOMMANDO 3 — Varme, Sprinkler/Branntromler, Ventilasjon & Elektro/ITB (Agent 04 + Agent 05 + Agent 06 + Agent 08):
Kjør Agent 04 (Varme/Kjøling), Agent 05 (Sprinkler, Branntromler & Kjøkkenslokking), Agent 06 (Ventilasjon) og Agent 08 (ITB/Automasjon mot Elektro). Dimensjoner varmeanlegg, fullsprinkling, branntromler (maks 30 m reell ganglinje!) og ventilasjon med riktige gjenvinnere, og generer deretter komplett grensesnittsmatrise og strømliste til RIE og RIAu (inkludert avløpspumper, utskiller-alarmer og lekkasjestoppere).`
  }
];
