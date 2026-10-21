# Estrae testo, indice e campioni di impaginazione dal PDF di riferimento senza modificarlo.
import fitz
import json
from pathlib import Path

root = Path('/work/tmp/documentazione')
doc = fitz.open(root / 'riferimento.pdf')
pages = []
fonts = {}
for i, page in enumerate(doc):
    pages.append(f'\n===== PAGINA {i + 1} =====\n' + page.get_text(sort=True))
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                key = f"{span['font']} {span['size']:.1f} {span['color']}"
                fonts[key] = fonts.get(key, 0) + len(span['text'])
(root / 'reference.txt').write_text(''.join(pages), encoding='utf8')
(root / 'reference-info.json').write_text(json.dumps({'pages': len(doc), 'size': list(doc[0].rect),
    'toc': doc.get_toc(), 'fonts': sorted(fonts.items(), key=lambda p: -p[1])[:20]}, ensure_ascii=False, indent=2), encoding='utf8')
(root / 'reference-render').mkdir(exist_ok=True)
for i in [0, 1, 2, 4, 8, 12, 20, 30, 40, 50, 60]:
    if i < len(doc):
        doc[i].get_pixmap(matrix=fitz.Matrix(1.3, 1.3)).save(root / 'reference-render' / f'page-{i+1}.png')
print(json.dumps({'pages': len(doc), 'toc': doc.get_toc()[:65]}, ensure_ascii=False))
