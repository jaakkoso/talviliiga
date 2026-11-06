// localStorage-kääre (docs/tietomalli.md). Tallennus voi puuttua tai heittää, joten kaikki on suojattu.
export const AVAIN = "ravinto.v1";

export function oletusTila() {
  return { versio: 1, ohjelmat: [], aktiivinenOhjelma: null, valinnat: {}, omatTuotteet: [], ostettu: {}, syoty: {}, asetukset: { teema: "auto" } };
}

export function lataa(varasto) {
  try {
    const raaka = varasto.getItem(AVAIN);
    if (!raaka) return oletusTila();
    const data = JSON.parse(raaka);
    if (data?.versio !== 1) return oletusTila();
    const oletus = oletusTila();
    return { ...oletus, ...data, asetukset: { ...oletus.asetukset, ...data.asetukset } };
  } catch {
    return oletusTila();
  }
}

export function tallenna(varasto, tila) {
  try {
    varasto.setItem(AVAIN, JSON.stringify(tila));
    return true;
  } catch {
    return false;
  }
}

export function tyhjenna(varasto) {
  try {
    varasto.removeItem(AVAIN);
  } catch {
    // Ei tallennusta, ei tyhjennettävää.
  }
}
