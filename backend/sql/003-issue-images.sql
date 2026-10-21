-- Aggiunge una immagine facoltativa per issue, senza modificare i dati esistenti.
CREATE TABLE IF NOT EXISTS issue_images (
    issue_id BIGINT PRIMARY KEY REFERENCES issues(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
    data BYTEA NOT NULL CHECK (octet_length(data) BETWEEN 1 AND 5242880)
);
