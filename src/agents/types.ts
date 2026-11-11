export type AgentKategori = 'prosjekt' | 'fag' | 'tverrfaglig' | 'kontrakt_qa';

export interface Sjekklistepunkt {
  id: string;
  tekst: string;
  standard?: string;
  kritisk?: boolean;
}

export interface KildeReferanse {
  navn: string;
  type: 'lov' | 'standard' | 'leverandor' | 'veileder';
  kilde: string;
  lenke?: string;
}

export interface AgentDefinisjon {
  id: string;
  nummer: number;
  navn: string;
  kortNavn: string;
  nsKode: string;
  kategori: AgentKategori;
  ikon: string;
  standarder: string[];
  kjernefunksjon: string;
  rolleBeskrivelse: string;
  tilknyttetModulId?: string;
  tilknyttetBeregningNavn?: string;
  seksjoner: {
    tittel: string;
    innhold: string;
  }[];
  sjekkliste: Sjekklistepunkt[];
  kilder: KildeReferanse[];
  masterPrompt: string;
  mesterensHuskeliste: string[];
}
