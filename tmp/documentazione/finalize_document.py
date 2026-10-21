# Verifica i documenti finali e rende visibili in Word i numeri dell'indice già calcolati nel PDF.
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
import pymupdf
from lxml import etree

root = Path('/work')
out = root / 'output/documentazione'
render = root / 'tmp/documentazione/render-v3'
pdf = pymupdf.open(render / 'Documentazione_BugBoard26.pdf')
ns = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
docx = out / 'Documentazione_BugBoard26.docx'
with ZipFile(docx) as z:
    parts = {name:z.read(name) for name in z.namelist()}
xml = etree.fromstring(parts['word/document.xml'])
fields = xml.xpath('//w:fldSimple[starts-with(@w:instr,"PAGEREF ")]', namespaces=ns)
destinations = []
for page in list(pdf)[1:4]:
    rows = {}
    for link in page.get_links():
        if link['kind']!=pymupdf.LINK_GOTO: continue
        row=round(link['from'].y0,1)
        target=link['page']+1
        if row in rows: assert rows[row]==target
        rows[row]=target
    destinations.extend(rows[row] for row in sorted(rows))
print(json.dumps({'indexFields':len(fields),'indexDestinations':len(destinations)}))
assert len(destinations)==len(fields), 'Indice: destinazioni non coerenti'
for field, number in zip(fields,destinations):
    run=etree.SubElement(field, f'{{{ns["w"]}}}r')
    text=etree.SubElement(run, f'{{{ns["w"]}}}t')
    text.text=str(number)
parts['word/document.xml']=etree.tostring(xml,xml_declaration=True,encoding='UTF-8',standalone=True)
with ZipFile(docx,'w',ZIP_DEFLATED) as z:
    for name, data in parts.items(): z.writestr(name,data)
pages=[]
for i,page in enumerate(pdf):
    text=page.get_text()
    outside=[w[4] for w in page.get_text('words') if w[0]<30 or w[2]>page.rect.width-30 or w[1]<20 or w[3]>page.rect.height-15]
    assert not outside, f'Testo oltre i margini: {i+1}: {outside}'
    assert len(text)>40, f'Pagina vuota: {i+1}'
    assert '\ufffd' not in text, f'Carattere non riconosciuto: {i+1}'
    pages.append({'page':i+1,'chars':len(text)})
images=xml.xpath('//wp:docPr',namespaces=ns)
assert len(images)==17
assert all(im.get('descr') for im in images)
tables=xml.xpath('//w:tbl',namespaces=ns)
assert all(t.xpath('./w:tr[1]/w:trPr/w:tblHeader',namespaces=ns) for t in tables)
assert not xml.xpath('//w:pBdr',namespaces=ns)
pdf.close()
(out/'Documentazione_BugBoard26.pdf').write_bytes((render/'Documentazione_BugBoard26.pdf').read_bytes())
result={'pages':len(pages),'figures':len(images),'tables':len(tables),'indexEntries':len(fields),'geometry':'PASS','altText':'PASS','repeatedTableHeaders':'PASS'}
(root/'tmp/documentazione/qa-final.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
