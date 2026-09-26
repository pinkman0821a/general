UPDATE memorias
SET
    entidad_id = (
        SELECT
            e.id
        FROM
            entidades e
        WHERE
            e.estado = 'activa'
            AND LOWER(TRIM(e.tipo)) = LOWER(TRIM(memorias.tipo))
            AND LOWER(TRIM(e.nombre_base)) = LOWER(TRIM(COALESCE(memorias.entidad, '')))
    )
WHERE
    entidad_id IS NULL
    AND entidad IS NOT NULL
    AND (
        SELECT
            COUNT(*)
        FROM
            entidades e
        WHERE
            e.estado = 'activa'
            AND LOWER(TRIM(e.tipo)) = LOWER(TRIM(memorias.tipo))
            AND LOWER(TRIM(e.nombre_base)) = LOWER(TRIM(COALESCE(memorias.entidad, '')))
    ) = 1;

UPDATE memorias
SET
    estado = 'reemplazada',
    actualizada_en = CURRENT_TIMESTAMP
WHERE
    estado = 'activa'
    AND entidad_id IS NOT NULL
    AND EXISTS (
        SELECT
            1
        FROM
            memorias nueva
        WHERE
            nueva.estado = 'activa'
            AND nueva.entidad_id = memorias.entidad_id
            AND LOWER(TRIM(nueva.clave)) = LOWER(TRIM(memorias.clave))
            AND LOWER(TRIM(nueva.valor)) = LOWER(TRIM(memorias.valor))
            AND nueva.id > memorias.id
    );