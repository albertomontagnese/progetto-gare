import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const OUT = path.join(process.cwd(), 'mock-company-docs');
fs.mkdirSync(OUT, { recursive: true });

function createPdf(filename, buildFn) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const stream = fs.createWriteStream(path.join(OUT, filename));
    doc.pipe(stream);
    buildFn(doc);
    doc.end();
    stream.on('finish', () => { console.log(`  Created: ${filename}`); resolve(); });
  });
}

function h1(doc, text) { doc.fontSize(20).font('Helvetica-Bold').text(text).moveDown(0.5); }
function h2(doc, text) { doc.fontSize(14).font('Helvetica-Bold').text(text).moveDown(0.3); }
function p(doc, text) { doc.fontSize(10).font('Helvetica').text(text, { lineGap: 3 }).moveDown(0.4); }
function bullet(doc, text) { doc.fontSize(10).font('Helvetica').text(`  •  ${text}`, { lineGap: 2 }); }
function sep(doc) { doc.moveDown(0.8); }

// ═══════════════════════════════════════════════
// 1. Company Profile
// ═══════════════════════════════════════════════
await createPdf('01_Profilo_Aziendale_Costruzioni_Meridionali.pdf', (doc) => {
  h1(doc, 'COSTRUZIONI MERIDIONALI S.p.A.');
  h2(doc, 'Profilo Aziendale 2025');
  sep(doc);
  p(doc, 'Costruzioni Meridionali S.p.A. è una società di ingegneria e costruzioni con sede a Napoli, specializzata in infrastrutture ferroviarie, opere civili e impianti per energie rinnovabili. Fondata nel 1998, opera su tutto il territorio nazionale con una forza lavoro di 320 dipendenti.');
  sep(doc);
  h2(doc, 'Dati Societari');
  bullet(doc, 'Ragione sociale: Costruzioni Meridionali S.p.A.');
  bullet(doc, 'P.IVA: 07123456789');
  bullet(doc, 'Sede legale: Via Nuova Marina 45, 80133 Napoli');
  bullet(doc, 'Sede operativa: Centro Direzionale Isola F12, 80143 Napoli');
  bullet(doc, 'Capitale sociale: € 5.000.000 i.v.');
  bullet(doc, 'Anno fondazione: 1998');
  bullet(doc, 'Dipendenti: 320 (di cui 85 ingegneri)');
  bullet(doc, 'Fatturato 2024: € 125.000.000');
  bullet(doc, 'Fatturato medio triennio 2022-2024: € 110.000.000');
  sep(doc);
  h2(doc, 'Settori di Attività');
  bullet(doc, 'Infrastrutture ferroviarie (linee AV, stazioni, gallerie)');
  bullet(doc, 'Opere civili e industriali');
  bullet(doc, 'Impianti per energie rinnovabili (fotovoltaico, eolico)');
  bullet(doc, 'Manutenzione straordinaria infrastrutture');
  bullet(doc, 'Ingegneria dei servizi e project management');
  sep(doc);
  h2(doc, 'Qualificazioni SOA');
  bullet(doc, 'OG1 - Edifici civili e industriali: Classifica VIII (illimitata)');
  bullet(doc, 'OG3 - Strade, autostrade, ferrovie: Classifica VIII (€ 20.658.000+)');
  bullet(doc, 'OG11 - Impianti tecnologici: Classifica V (€ 5.165.000)');
  bullet(doc, 'OS18-A - Componenti strutturali in acciaio: Classifica IV (€ 2.582.000)');
  bullet(doc, 'OS21 - Opere strutturali speciali: Classifica VI (€ 10.329.000)');
});

// ═══════════════════════════════════════════════
// 2. Balance Sheet / Financial Summary
// ═══════════════════════════════════════════════
await createPdf('02_Bilancio_Riepilogo_2022_2024.pdf', (doc) => {
  h1(doc, 'Riepilogo Finanziario 2022-2024');
  h2(doc, 'Costruzioni Meridionali S.p.A.');
  sep(doc);

  h2(doc, 'Fatturato');
  bullet(doc, '2024: € 125.000.000 (+13.6% YoY)');
  bullet(doc, '2023: € 110.000.000 (+10.0% YoY)');
  bullet(doc, '2022: € 100.000.000');
  bullet(doc, 'Media triennale: € 111.667.000');
  sep(doc);

  h2(doc, 'Principali Indicatori');
  bullet(doc, 'EBITDA 2024: € 18.750.000 (margine 15%)');
  bullet(doc, 'Utile netto 2024: € 8.125.000');
  bullet(doc, 'Patrimonio netto: € 32.000.000');
  bullet(doc, 'Posizione finanziaria netta: € -5.200.000 (debito contenuto)');
  bullet(doc, 'Indice di liquidità: 1.45');
  bullet(doc, 'Rating Cerved: B1.1 (affidabilità elevata)');
  sep(doc);

  h2(doc, 'Capacità Fidejussoria');
  bullet(doc, 'Plafond fidejussorio disponibile: € 40.000.000');
  bullet(doc, 'Garanzie in essere: € 22.000.000');
  bullet(doc, 'Capacità residua: € 18.000.000');
  sep(doc);

  h2(doc, 'Referenze Bancarie');
  bullet(doc, 'Banca Intesa Sanpaolo - Filiale Corporate Napoli');
  bullet(doc, 'UniCredit - Area Corporate Sud Italia');
  bullet(doc, 'Banco BPM - Divisione Grandi Clienti');
});

// ═══════════════════════════════════════════════
// 3. Certificazioni
// ═══════════════════════════════════════════════
await createPdf('03_Certificazioni_ISO_SOA.pdf', (doc) => {
  h1(doc, 'Certificazioni e Qualificazioni');
  h2(doc, 'Costruzioni Meridionali S.p.A.');
  sep(doc);

  h2(doc, 'Certificazioni di Sistema');
  bullet(doc, 'ISO 9001:2015 - Sistema di Gestione Qualità (cert. n. QMS-IT-2024-1234)');
  bullet(doc, 'ISO 14001:2015 - Sistema di Gestione Ambientale (cert. n. EMS-IT-2024-5678)');
  bullet(doc, 'ISO 45001:2018 - Salute e Sicurezza sul Lavoro (cert. n. OHSMS-IT-2024-9012)');
  bullet(doc, 'ISO 50001:2018 - Sistema di Gestione Energia');
  bullet(doc, 'SA8000:2014 - Responsabilità Sociale');
  sep(doc);

  h2(doc, 'Qualificazioni Settoriali');
  bullet(doc, 'Attestazione SOA: rilasciata da SOA Mediterranea S.p.A., validità fino 02/2027');
  bullet(doc, 'Qualificazione RFI: Fornitore qualificato per lavori su infrastruttura ferroviaria nazionale');
  bullet(doc, 'Iscrizione Albo Fornitori ANAS');
  bullet(doc, 'Iscrizione White List Prefettura di Napoli');
  bullet(doc, 'Rating di Legalità AGCM: ★★+ (due stelle più)');
  sep(doc);

  h2(doc, 'Abilitazioni');
  bullet(doc, 'Abilitazione lavori in presenza di amianto (D.Lgs. 81/2008)');
  bullet(doc, 'Patentino esplosivi per gallerie');
  bullet(doc, 'Autorizzazione Ambientale Integrata');
});

// ═══════════════════════════════════════════════
// 4. Referenze Progetti Simili
// ═══════════════════════════════════════════════
await createPdf('04_Referenze_Progetti_Infrastrutturali.pdf', (doc) => {
  h1(doc, 'Referenze Lavori Analoghi');
  h2(doc, 'Costruzioni Meridionali S.p.A. — Ultimo Quinquennio');
  sep(doc);

  h2(doc, '1. Linea AV/AC Napoli-Bari — Tratta Apice-Hirpinia');
  bullet(doc, 'Committente: RFI S.p.A. (Gruppo FS Italiane)');
  bullet(doc, 'Importo lavori: € 48.500.000');
  bullet(doc, 'Periodo: 2021-2024');
  bullet(doc, 'Descrizione: Realizzazione di 6,2 km di galleria naturale a doppia canna, opere di imbocco, consolidamenti e rivestimenti definitivi. Lavori eseguiti in ambiente con rischio gas radon.');
  bullet(doc, 'Ruolo: Mandataria RTI (quota 60%)');
  sep(doc);

  h2(doc, '2. Stazione Centrale di Taranto — Riqualificazione');
  bullet(doc, 'Committente: RFI S.p.A.');
  bullet(doc, 'Importo lavori: € 22.000.000');
  bullet(doc, 'Periodo: 2022-2024');
  bullet(doc, 'Descrizione: Riqualificazione completa della stazione: rifacimento pensiline, nuovi ascensori, sottopassi, impianto fotovoltaico 200kW su copertura, adeguamento accessibilità.');
  bullet(doc, 'Ruolo: Impresa singola');
  sep(doc);

  h2(doc, '3. Impianto Fotovoltaico Aree Ferroviarie Brindisi');
  bullet(doc, 'Committente: Ministero della Difesa / RFI');
  bullet(doc, 'Importo lavori: € 8.200.000');
  bullet(doc, 'Periodo: 2023-2025 (in corso)');
  bullet(doc, 'Descrizione: Progettazione esecutiva e realizzazione impianto fotovoltaico da 3,5 MW su aree demaniali ferroviarie. Include opere civili, cabine MT/BT, connessione alla rete.');
  bullet(doc, 'Ruolo: Mandataria RTI (quota 70%)');
  sep(doc);

  h2(doc, '4. Manutenzione Straordinaria Linea Jonica');
  bullet(doc, 'Committente: RFI S.p.A.');
  bullet(doc, 'Importo: € 15.800.000');
  bullet(doc, 'Periodo: 2020-2022');
  bullet(doc, 'Descrizione: Manutenzione straordinaria armamento, massicciata, opere d\'arte su 35 km di linea. Lavori notturni in interruzione programmata del traffico.');
  bullet(doc, 'Ruolo: Impresa singola');
  sep(doc);

  h2(doc, '5. Deposito Officina Ferroviaria Lecce');
  bullet(doc, 'Committente: Trenitalia S.p.A.');
  bullet(doc, 'Importo: € 12.500.000');
  bullet(doc, 'Periodo: 2022-2023');
  bullet(doc, 'Descrizione: Costruzione nuovo deposito officina per manutenzione treni regionali. Struttura in acciaio, impianti speciali, binari interni, carroponte 20t.');
  bullet(doc, 'Ruolo: Mandataria RTI (quota 55%)');
});

// ═══════════════════════════════════════════════
// 5. Organigramma e Team Chiave
// ═══════════════════════════════════════════════
await createPdf('05_Organigramma_Team_Chiave.pdf', (doc) => {
  h1(doc, 'Organigramma e Team di Progetto');
  h2(doc, 'Costruzioni Meridionali S.p.A.');
  sep(doc);

  h2(doc, 'Direzione');
  bullet(doc, 'Amministratore Delegato: Ing. Giuseppe Ferrara (35 anni esperienza)');
  bullet(doc, 'Direttore Tecnico: Ing. Maria Rossi (28 anni esperienza, iscritta Ordine Ingegneri NA)');
  bullet(doc, 'Direttore Operativo: Ing. Antonio Esposito (25 anni esperienza)');
  sep(doc);

  h2(doc, 'Figure Chiave per Gare Infrastrutturali');
  bullet(doc, 'Project Manager Senior: Ing. Carlo Bianchi — 20 anni, AV Napoli-Bari, specialista gallerie');
  bullet(doc, 'Direttore dei Lavori: Ing. Francesca Verdi — 18 anni, esperta infrastrutture ferroviarie RFI');
  bullet(doc, 'Responsabile Sicurezza (CSE): Ing. Marco De Luca — 15 anni, abilitato CSE ferrovia');
  bullet(doc, 'Responsabile Qualità: Dott.ssa Anna Colombo — 12 anni, auditor ISO 9001/14001/45001');
  bullet(doc, 'Responsabile Ambientale: Dott. Luigi Martini — 10 anni, VIA/VAS, bonifica amianto');
  bullet(doc, 'BIM Manager: Ing. Sara Ricci — 8 anni, BIM Level 2, Revit/Navisworks');
  bullet(doc, 'Responsabile Impianti FER: Ing. Paolo Romano — 12 anni, fotovoltaico/eolico utility scale');
  sep(doc);

  h2(doc, 'Risorse Operative');
  bullet(doc, 'Ingegneri strutturisti: 12');
  bullet(doc, 'Ingegneri impiantisti: 8');
  bullet(doc, 'Geometri/Periti: 25');
  bullet(doc, 'Operai specializzati: 180');
  bullet(doc, 'Macchinisti/Gruisti abilitati: 35');
});

// ═══════════════════════════════════════════════
// 6. Policy HSE
// ═══════════════════════════════════════════════
await createPdf('06_Policy_HSE_Sicurezza.pdf', (doc) => {
  h1(doc, 'Policy Salute, Sicurezza e Ambiente');
  h2(doc, 'Costruzioni Meridionali S.p.A. — Rev. 08/2025');
  sep(doc);

  p(doc, 'La Direzione di Costruzioni Meridionali S.p.A. si impegna a garantire i più elevati standard di salute, sicurezza e tutela ambientale in tutti i cantieri e sedi operative, in conformità al D.Lgs. 81/2008, D.Lgs. 152/2006 e alle norme ISO 14001 e ISO 45001.');
  sep(doc);

  h2(doc, 'Obiettivi HSE 2025');
  bullet(doc, 'Zero infortuni mortali e gravi (LTIFR target < 2.0)');
  bullet(doc, 'LTIFR 2024 consuntivo: 1.8 (in miglioramento da 2.5 nel 2022)');
  bullet(doc, 'Riduzione emissioni CO2 cantiere: -15% vs 2023');
  bullet(doc, 'Riciclo materiali da demolizione: target > 90%');
  bullet(doc, 'Formazione sicurezza: min. 24 ore/anno per dipendente');
  sep(doc);

  h2(doc, 'Organizzazione Sicurezza');
  bullet(doc, 'RSPP aziendale: Ing. Marco De Luca');
  bullet(doc, 'Medico Competente: Dott. Andrea Russo');
  bullet(doc, 'RLS: 4 rappresentanti dei lavoratori');
  bullet(doc, 'Addetti primo soccorso: 18 (1 ogni 20 lavoratori)');
  bullet(doc, 'Addetti antincendio: 22');
  sep(doc);

  h2(doc, 'Gestione Emergenze');
  p(doc, 'Piano di emergenza cantiere conforme al D.Lgs. 81/2008. Prove di evacuazione semestrali. Protocollo specifico per lavori in galleria e in presenza di traffico ferroviario. Coordinamento con Comando VV.FF. per cantieri a rischio elevato.');
  sep(doc);

  h2(doc, 'Gestione Ambientale');
  bullet(doc, 'Piano di monitoraggio ambientale per ogni cantiere > € 1M');
  bullet(doc, 'Gestione acque di cantiere con impianto di trattamento mobile');
  bullet(doc, 'Registro rifiuti digitale con tracciabilità SISTRI/RENTRI');
  bullet(doc, 'Valutazione impatto acustico pre-cantiere');
});

// ═══════════════════════════════════════════════
// 7. Procedure Operative Standard
// ═══════════════════════════════════════════════
await createPdf('07_Procedure_Operative_Standard.pdf', (doc) => {
  h1(doc, 'Procedure Operative Standard');
  h2(doc, 'Costruzioni Meridionali S.p.A.');
  sep(doc);

  h2(doc, 'POS-01: Gestione Progettazione');
  p(doc, 'Progettazione in BIM Level 2 per tutti i progetti > € 5M. Review design in 3 fasi: 30%, 60%, 90%. Verifica indipendente ai sensi del DM 17/01/2018. Coordinamento multidisciplinare settimanale con verbale digitale.');
  sep(doc);

  h2(doc, 'POS-02: Approvvigionamenti e Subappalto');
  p(doc, 'Albo fornitori qualificati con revisione annuale. Valutazione fornitori su criteri: qualità, tempi, sicurezza, ambiente. Subappalto max 49% ex art. 119 D.Lgs. 36/2023. Verifica DURC e regolarità contributiva prima di ogni pagamento.');
  sep(doc);

  h2(doc, 'POS-03: Controllo Qualità in Cantiere');
  p(doc, 'Piano di Controllo Qualità (PCQ) per ogni commessa. Ispezioni settimanali documentate. Non conformità gestite con sistema CAPA (Corrective and Preventive Action). Rapporto mensile qualità alla Direzione Lavori.');
  sep(doc);

  h2(doc, 'POS-04: Gestione Programma Lavori');
  p(doc, 'Programmazione con MS Project / Primavera P6. Gantt dettagliato a 4 livelli WBS. Monitoraggio settimanale avanzamento con metodo Earned Value. Report SAL mensile con dashboard KPI: SPI, CPI, previsione completamento.');
  sep(doc);

  h2(doc, 'POS-05: Reporting e Comunicazione');
  p(doc, 'Report settimanale cantiere (avanzamento, sicurezza, qualità, ambiente). Report mensile alla committenza. Sistema documentale digitale con accesso web per tutti gli stakeholder. Riunioni di coordinamento quindicinali con committente.');
});

console.log('\n✅ All mock documents generated in: ' + OUT);
console.log('   Upload these to the Company Workspace in Progetto Gare.\n');
