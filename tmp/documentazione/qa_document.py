# Controlla la geometria del PDF e prepara un elenco delle pagine per la revisione visiva.
from pathlib import Path
import pymupdf
import json

root=Path('/work/tmp/documentazione')
render=root/'render-v1'
doc=pymupdf.open(render/'Documentazione_BugBoard26.pdf')
pages=[]
for i,page in enumerate(doc):
    words=page.get_text('words')
    outside=[w[4] for w in words if w[0]<30 or w[2]>page.rect.width-30 or w[1]<20 or w[3]>page.rect.height-15]
    text=page.get_text()
    pages.append({'page':i+1,'chars':len(text),'first':text.splitlines()[:3],'outside':outside})
(root/'qa-pages-v1.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(pages,ensure_ascii=False))
