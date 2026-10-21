# Raccoglie documenti, confronto e figure recuperate in un archivio destinato al gruppo.
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root=Path('/work');tmp=root/'tmp/documentazione-revisione';out=root/'output/documentazione'
manifest=json.loads((tmp/'figure-manifest.json').read_text())
build=json.loads((tmp/'build-info.json').read_text())
descriptions={1:'marchio-universitario',11:'persona-Giulia-Bianchi',12:'persona-Marco-Ferri',13:'persona-Luca-Lauro',15:'use-case-diagram',21:'mockup-creazione-issue',23:'mockup-cambio-stato',26:'mockup-creazione-utente',31:'stack-progettazione-iniziale',32:'dominio-progettazione-iniziale',36:'regola-cromatica',39:'prossimita',40:'connectedness-o-sidebar',41:'card-progetti-o-righe-issue',42:'form-issue',43:'gestione-utenti',44:'F-pattern',45:'feedback-successo-o-errore',46:'conferma-eliminazione-progetto',47:'conferma-rimozione-membro',49:'DTO',51:'classi-design-frontend',53:'utility-config-security',55:'navigazione-user',56:'navigazione-admin'}
archive=out/'Materiali_documentazione_BugBoard26.zip'
with ZipFile(archive,'w',ZIP_DEFLATED) as z:
    for name in ['Documentazione_BugBoard26_revisionata.docx','Documentazione_BugBoard26_revisionata.pdf','Confronto_documentazione.md']:
        z.write(out/name,name)
    assets=[]
    for item in manifest:
        source=next((tmp/'figure-collega').glob('native-'+item['name'][:-4]+'.*'))
        if item['page']==1:source=tmp/'figure-collega/p01-fig01.png'
        target=f'figure-originali/p{item["page"]:02d}-{descriptions[item["page"]]}-{item["name"][-6:-4]}{source.suffix}'
        z.write(source,target)
        assets.append({'file':target,'pagina_pdf_collega':item['page'],'posizione':item['bbox']})
    for i in range(1,5):z.write(tmp/f'frontend-dettaglio-{i}.png',f'figure-dettaglio/frontend-{i}.png')
    for source in sorted((root/'tmp/documentazione/screens').glob('0*.png')):
        z.write(source,'schermate-app/'+source.name)
    z.writestr('provenienza-figure.json',json.dumps(assets,ensure_ascii=False,indent=2))
    z.writestr('LEGGIMI.txt','''Documentazione BugBoard26 - revisione del 21 ottobre 2026

La relazione segue tutte le 86 voci del PDF del collega: 4 parti e 12 capitoli.
Confronto_documentazione.md elenca le differenze con il codice corrente.

figure-originali contiene le 27 figure interne e il marchio recuperati da
BugBoard26_Overleaf.pdf. p49 contiene i DTO; p51 il design frontend; p53
Utility/Config/Security; p55 e p56 la navigazione. Le figure sono immagini
estratte: non sono sorgenti UML modificabili. I diagrammi storici non sono
stati ridisegnati e le differenze sono descritte nella relazione.

figure-dettaglio contiene i quattro ritagli sovrapposti del diagramma frontend.
schermate-app contiene otto schermate reali con dati dimostrativi.

Restano da aggiungere nomi degli autori e risultati reali di usabilita.
Le sezioni su duplicazione, analisi statica e coverage dichiarano le misure
ancora mancanti. Nessun risultato sperimentale e stato inventato.
''')
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.startswith('figure-originali/')])==28
    assert not any('/.env' in n or 'node_modules' in n for n in z.namelist())
    print(f'Archivio verificato: {len(z.namelist())} file, {archive.stat().st_size} byte.')
