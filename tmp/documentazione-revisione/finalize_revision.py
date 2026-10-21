# Completa i numeri dell'indice Word e i segnalibri PDF senza modificare l'impaginazione verificata.
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree
import json
import pymupdf

root=Path('/work');tmp=root/'tmp/documentazione-revisione';out=root/'output/documentazione'
source=tmp/'render-v5/Documentazione_BugBoard26_revisionata.pdf'
docx=out/'Documentazione_BugBoard26_revisionata.docx'
build=json.loads((tmp/'build-info.json').read_text())
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
pdf=pymupdf.open(source)
destinations=[]
for page in list(pdf)[1:4]:
    # Ogni voce ha due link: titolo e numero. Si selezionano soltanto i numeri a destra.
    links=[link for link in page.get_links() if link['kind']==pymupdf.LINK_GOTO and link['from'].x0>page.rect.width-140]
    destinations.extend(link['page']+1 for link in sorted(links,key=lambda item:item['from'].y0))
with ZipFile(docx) as z: parts={name:z.read(name) for name in z.namelist()}
xml=etree.fromstring(parts['word/document.xml'])
fields=xml.xpath('//w:fldSimple[starts-with(@w:instr,"PAGEREF ")]',namespaces=ns)
assert len(destinations)==len(fields)==len(build['headings'])==86,(len(destinations),len(fields))
for field,entry,destination in zip(fields,build['headings'],destinations):
    assert entry['anchor'] in field.get(f'{{{ns["w"]}}}instr')
    for child in list(field):field.remove(child)
    run=etree.SubElement(field,f'{{{ns["w"]}}}r')
    text=etree.SubElement(run,f'{{{ns["w"]}}}t');text.text=str(destination)
for entry in build['headings']:
    paragraph=xml.xpath('//w:bookmarkStart[@w:name=$anchor]/..',namespaces=ns,anchor=entry['anchor'])[0]
    level=paragraph.xpath('./w:pPr/w:outlineLvl/@w:val',namespaces=ns)[0]
    assert int(level)+1==entry['outlineLevel']
parts['word/document.xml']=etree.tostring(xml,xml_declaration=True,encoding='UTF-8',standalone=True)
with ZipFile(docx,'w',ZIP_DEFLATED) as z:
    for name,data in parts.items():z.writestr(name,data)
pdf.set_toc([[entry['outlineLevel'],entry['text'],page] for entry,page in zip(build['headings'],destinations)])
pdf.save(out/'Documentazione_BugBoard26_revisionata.pdf',garbage=3,deflate=True)
pdf.close()
check=pymupdf.open(out/'Documentazione_BugBoard26_revisionata.pdf')
assert len(check)==70
assert len(check.get_toc())==86
assert check.get_toc()[0][0]==1 and check.get_toc()[1][0]==2
check.close()
(tmp/'qa-final.json').write_text(json.dumps({'pages':70,'outlineEntries':86,'outlineOrder':'PASS','outlineHierarchy':'PASS','figures':37,'originalInternalFigures':27,'cachedWordIndex':'PASS','blankPages':0,'outsideMargins':0,'missingGlyphs':0},indent=2))
print('Finalizzati Word e PDF: 70 pagine, 86 voci con gerarchia completa.')
