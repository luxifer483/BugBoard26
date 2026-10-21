# Prepara gli strumenti isolati per leggere il riferimento e verificare i documenti generati.
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer poppler-utils graphviz fonts-liberation fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir python-docx pymupdf reportlab pdf2image pypdf pillow
WORKDIR /work
