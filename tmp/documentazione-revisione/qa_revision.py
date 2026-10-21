# Verifica geometria, provenienza delle figure e completezza delle sezioni della revisione.
from pathlib import Path
from zipfile import ZipFile
import json,re
import pymupdf
from lxml import etree

root=Path('/work');tmp=root/'tmp/documentazione-revisione'
render=tmp/'render-v5'
doc=pymupdf.open(render/'Documentazione_BugBoard26_revisionata.pdf')
build=json.loads((tmp/'build-info.json').read_text())
pages=[]
for i,page in enumerate(doc):
    text=page.get_text()
    outside=[(w[4],list(w[:4])) for w in page.get_text('words') if w[0]<25 or w[2]>page.rect.width-25 or w[1]<18 or w[3]>page.rect.height-12]
    images=page.get_image_info()
    pages.append({'page':i+1,'chars':len(text),'first':text.splitlines()[1:3],'outside':outside,'images':len(images),'landscape':page.rect.width>page.rect.height})
(tmp/'qa-pages-final.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2))
assert all(len(p.get_text().strip())>30 for p in doc),'Pagina senza contenuto'
assert all('\ufffd' not in p.get_text() for p in doc),'Glifo mancante'
with ZipFile(root/'output/documentazione/Documentazione_BugBoard26_revisionata.docx') as z:
    xml=etree.fromstring(z.read('word/document.xml'))
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
assert len(xml.xpath('//w:fldSimple[starts-with(@w:instr,"PAGEREF ")]',namespaces=ns))==86
assert all(im.get('descr') for im in xml.xpath('//wp:docPr',namespaces=ns))
assert all(t.xpath('./w:tr[1]/w:trPr/w:tblHeader',namespaces=ns) for t in xml.xpath('//w:tbl',namespaces=ns))
assert build['outlineMatch'] and len(build['headings'])==86
print(json.dumps({'pages':len(doc),'outlineEntries':86,'outlineMatch':True,'figures':len(build['figures']),'blankPages':[],'outside':[(p['page'],p['outside']) for p in pages if p['outside']],'landscapePages':[p['page'] for p in pages if p['landscape']]},ensure_ascii=False))

report='''# Confronto e allineamento della documentazione BugBoard26

La revisione segue le **4 parti, 12 capitoli e 86 voci di indice** di BugBoard26_Overleaf.pdf, nello stesso ordine. Nessuna voce del suo indice è stata eliminata. I contenuti sono verificati sui sorgenti correnti; nessuna modifica al codice applicativo è stata effettuata per questa revisione.

## Materiale recuperato

- Tutte le 27 figure interne del collega, oltre al marchio di copertina: personas, casi d’uso, mockup, dominio, DTO, design frontend, Utility/Config/Security e navigazione USER/ADMIN.
- I diagrammi frontend e navigazione sono stati recuperati dalle immagini incorporate nel PDF. Alcuni erano tagliati dalla sua impaginazione; la revisione usa le immagini complete alla risoluzione originale.
- Il diagramma frontend completo è accompagnato da quattro ritagli ingranditi della stessa immagine, senza nuovi disegni sostitutivi.
- Le schermate reali dell’app sono affiancate ai mockup nei flussi principali. Sono distinte dalle proposte progettuali.
- Le specifiche delle quattro funzioni del capitolo 11 e le sottosezioni della valutazione di usabilità sono mantenute.

## Differenze rispetto ai sorgenti attuali

| Sezione | Materiale mantenuto | Allineamento effettuato | Evidenza nel codice |
| --- | --- | --- | --- |
| 4 Requisiti | Identificativi RF1-RF28 e UC1-UC4 | Immagine implementata; solo assegnatario può cambiare stato; membership confermata come regola del progetto | `backend/src/services/issues.js`, `controllers/issues.controller.js`, `services/access.js` |
| 4.1 Use Case Diagram | Figura originale | Collegamento ADMIN al cambio stato valido soltanto se assegnatario; abbandono/eliminazione progetto non implementati | `routes.js`, `changeStatus` |
| 5.4 Tecnologie | Schema originale | Spring/JPA/storage esterno sono progettazione storica; attuali Express/Sequelize/PostgreSQL e allegati BYTEA | package.json, `models/index.js`, `services/images.js` |
| 5.5 Persistenza | Diagramma di dominio | Sette modelli; IssueImage 0..1; CLOSED invece di DONE; CRITICAL e priorità nullable; nessun ISSUE_HISTORY | `backend/src/models/index.js`, SQL 001-003 |
| 6 UI design | Tutte le sottosezioni e figure originali | Palette e font dal CSS; quote 60-30-10 come guida e non misura; nessuna conformità WCAG certificata | `frontend/src/index.css` |
| 7.1.2 DTO | Diagramma Request/Domain/Response | DTO come contratti JSON, non classi Java; mapping di ogni oggetto al formato reale; aggiunti expiresAt, image, errori e aggiornamento assegnatario | `controllers/`, `services/responses.js`, `frontend/src/api/` |
| 7.1.2 DTO | Nomi progettuali di profilo e membership | UpdateProfile non implementato; rimozione membro via parametri URL; nessun ruolo per progetto; attachmentUrl sostituito dal multipart e download privato | `routes.js`, `members.controller.js`, `issuesApi.js` |
| 7.2 Design frontend | Diagramma completo e ingrandimenti | ProtectedRoute corrisponde a RouteGuard; creazione in modale; alcuni componenti sono incorporati nelle pagine; IssueImage è successivo al disegno | `router/AppRouter.jsx`, `components/`, `pages/` |
| 7.2.1 Utility, Config, Security | Diagramma originale | Moduli effettivi, Bearer, localStorage, ripristino sessione e polling; profileApi presente ma senza endpoint operativo | `security/`, `config/`, `context/AuthContext.jsx` |
| 7.3 Navigazione | Diagrammi USER e ADMIN | Percorsi reali, redirect alla modale, profilo placeholder e verifica ADMIN | `routeConfig.js`, `AppRouter.jsx`, `UserManagementPage.jsx` |
| 7.4 Sequenze | Tutte e quattro le sezioni | Passi testuali dei flussi reali; nel PDF di riferimento non ci sono diagrammi di sequenza da estrarre | controller, servizi e adapter API |
| 8 Build | Tutte e tre le sezioni | Dockerfile frontend assente; SQL 001-003 espliciti; comandi verificati rispetto ai file realmente disponibili | Dockerfile, Compose, `schema.js`, package.json |
| 9 Git | Capitolo mantenuto | Remoto e cronologia verificabili nel repository; immagini e nuovi test ancora nel lavoro locale successivo a 1cf16c6 | git log e git status |
| 10 Qualità | 10.1, 10.2 e 10.3 mantenute | Nessun grafico inventato; duplicazione, report statici e coverage percentuale non disponibili | configurazioni attuali |
| 11 Testing | Quattro funzioni, strategie e test plan | 52 test backend e 17 frontend; distinzione test API e specifiche unit di isolamento; nessuna coverage dichiarata | `backend/test/api.test.js`, `frontend/test/` |
| 12 Usabilità | Tutte le sottosezioni | Protocollo, checklist e questionario; risultati e partecipanti da aggiungere dopo le prove | attività sperimentali da svolgere |

## Questioni da completare prima della consegna

1. I diagrammi storici sono conservati e commentati; per far coincidere ogni casella con l’implementazione corrente occorrerà aggiornare i loro sorgenti UML originali. In questa revisione non sono stati ridisegnati.
2. Confermare con il docente il framework ammesso per il requisito xUnit ed eventualmente implementare le specifiche unitarie isolate. I test backend presenti sono prevalentemente integrativi.
3. Inserire misure reali di duplicazione/analisi statica/coverage se richieste tra gli artefatti del corso. Le relative sezioni sono presenti e dichiarano le misure mancanti.
4. Aggiungere nomi degli autori e risultati reali di expert review e sessioni con utenti. Gruppo e matricole provengono dalla copertina del collega.
5. Identificare il commit o lo ZIP finale che includa immagini e nuovi test, attualmente successivi all’ultimo commit indicato nella relazione.

## Controllo delle sezioni

La corrispondenza seguente è verificata automaticamente per titolo, ordine e profondità delle voci. Le pagine cambiano perché la revisione rende completi e leggibili i diagrammi e aggiunge il confronto con il codice.

| Voce del riferimento | Titolo nella revisione | Esito |
| --- | --- | --- |
'''
for source,target in zip(json.loads((tmp/'indice.json').read_text()),build['headings']):
    report+=f'| {source[1]} | {target["text"]} | Presente |\n'
(root/'output/documentazione/Confronto_documentazione.md').write_text(report,encoding='utf8')
