import { describe, expect, it } from 'vitest';
import { AGENTER, SUPER_KOMMANDOER } from './agentData';
import { PROSJEKT_PRESETS } from '../data/prosjekter';
import { koteRegnskap, OVERHOYDE_DOKUMENTER } from '../engine/va';

describe('19 AI-Agenter Dataintegritet', () => {
  it('skal inneholde nøyaktig 19 spesialiserte agenter', () => {
    expect(AGENTER.length).toBe(19);
  });

  it('hver agent skal ha unikt nummer fra 1 til 19 og gyldig ID', () => {
    const numre = AGENTER.map((a) => a.nummer);
    expect(new Set(numre).size).toBe(19);
    for (let i = 1; i <= 19; i++) {
      expect(numre).toContain(i);
      const agent = AGENTER.find((a) => a.nummer === i);
      expect(agent).toBeDefined();
      expect(agent?.id).toBe(`agent-${i < 10 ? `0${i}` : i}`);
    }
  });

  it('hver agent skal ha 6 standardiserte seksjoner iht. systemmanualen', () => {
    for (const agent of AGENTER) {
      expect(agent.seksjoner.length).toBeGreaterThanOrEqual(4);
      expect(agent.seksjoner[0].tittel).toBeDefined();
      expect(agent.seksjoner[0].innhold.length).toBeGreaterThan(10);
    }
  });

  it('hver agent skal ha konkrete sjekklistepunkter for KS', () => {
    for (const agent of AGENTER) {
      expect(agent.sjekkliste.length).toBeGreaterThanOrEqual(3);
      for (const punkt of agent.sjekkliste) {
        expect(punkt.id).toBeDefined();
        expect(punkt.tekst.length).toBeGreaterThan(5);
      }
    }
  });

  it('hver agent skal ha en komplett master-prompt for NotebookLM/LLM', () => {
    for (const agent of AGENTER) {
      expect(agent.masterPrompt).toContain(`[AKTIVER AGENT ${agent.nummer < 10 ? `0${agent.nummer}` : agent.nummer}`);
      expect(agent.masterPrompt.length).toBeGreaterThan(100);
    }
  });

  it('hver agent skal ha mesterens huskeliste og risikopunkter', () => {
    for (const agent of AGENTER) {
      expect(agent.mesterensHuskeliste.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Super-Kommandoer Integritet', () => {
  it('skal ha 3 definerte super-kommandoer', () => {
    expect(SUPER_KOMMANDOER.length).toBe(3);
  });

  it('hver super-kommando skal referere til eksisterende agent-IDer', () => {
    const gyldigeAgentIder = new Set(AGENTER.map((a) => a.id));
    for (const kommando of SUPER_KOMMANDOER) {
      for (const aId of kommando.agenter) {
        expect(gyldigeAgentIder.has(aId)).toBe(true);
      }
    }
  });
});

describe('Prosjekt Presets & Kote/Tilbakeslagstester', () => {
  it('Forus Teknologipark skal identifisere motfall/pumpekrav i kjeller og selvfall i 1. etg', () => {
    const forus = PROSJEKT_PRESETS.find((p) => p.id === 'forus')!;
    expect(forus).toBeDefined();
    const kjeller = forus.koter.gulv.find((g) => g.navn.includes('Kjeller'))!;
    const etg1 = forus.koter.gulv.find((g) => g.navn.includes('1. etasje'))!;

    // Kjeller kotesjekk
    const kjellerSjekk = koteRegnskap({
      ibrKum: forus.koter.ibrKum!,
      itrKum: forus.koter.itrKum!,
      stikkLengde: forus.koter.stikkLengde!,
      fall: 1 / forus.koter.fallNevner!,
      laveste: kjeller.kote,
      krav: OVERHOYDE_DOKUMENTER,
    });

    expect(kjellerSjekk.margin).toBeCloseTo(-0.80, 2);
    expect(kjellerSjekk.selvfallOk).toBe(false);

    // 1. Etasje kotesjekk
    const etg1Sjekk = koteRegnskap({
      ibrKum: forus.koter.ibrKum!,
      itrKum: forus.koter.itrKum!,
      stikkLengde: forus.koter.stikkLengde!,
      fall: 1 / forus.koter.fallNevner!,
      laveste: etg1.kote,
      krav: OVERHOYDE_DOKUMENTER,
    });

    expect(etg1Sjekk.margin).toBeCloseTo(1.60, 2);
    expect(etg1Sjekk.selvfallOk).toBe(true);
    expect(etg1Sjekk.minKoteUtgang).toBeCloseTo(14.267, 2);
  });
});
