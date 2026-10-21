# Recupera le figure del PDF del collega e ne registra pagina e posizione originali.
from pathlib import Path
import pymupdf as fitz
from PIL import Image, ImageDraw, ImageFont
import json

root=Path('/work/tmp/documentazione-revisione')
fig=root/'figure-collega'
fig.mkdir(exist_ok=True)
pages=root/'pagine-collega'
pages.mkdir(exist_ok=True)
doc=fitz.open(root/'collega.pdf')
manifest=[]
for i,page in enumerate(doc):
    images=page.get_image_info(xrefs=True)
    for j,item in enumerate(images):
        rect=fitz.Rect(item['bbox'])
        if rect.width<20 or rect.height<20: continue
        name=f'p{i+1:02d}-fig{j+1:02d}.png'
        page.get_pixmap(matrix=fitz.Matrix(3,3),clip=rect,alpha=False).save(fig/name)
        native=doc.extract_image(item['xref'])
        (fig/f'native-{name[:-4]}.{native["ext"]}').write_bytes(native['image'])
        manifest.append({'name':name,'page':i+1,'bbox':list(rect),'width':item['width'],'height':item['height'],'xref':item['xref']})
    if i in [0,13,14,30,31,47,48,49,50,51,52,53,54,55,56]:
        page.get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(pages/f'page-{i+1}.png')
(root/'figure-manifest.json').write_text(json.dumps(manifest,indent=2))
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for k in range(0,len(manifest),16):
    sheet=Image.new('RGB',(1200,1200),'#e9edf3')
    draw=ImageDraw.Draw(sheet)
    for j,item in enumerate(manifest[k:k+16]):
        x=(j%4)*300;y=(j//4)*300
        im=Image.open(fig/item['name']);im.thumbnail((282,260))
        sheet.paste(im,(x+(300-im.width)//2,y+28))
        draw.text((x+10,y+7),item['name'],font=font,fill='black')
    sheet.save(root/f'figure-contatti-{k//16+1}.png')
print(json.dumps(manifest,indent=2))
