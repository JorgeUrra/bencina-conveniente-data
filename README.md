# Catálogo público de Bencina Conveniente

`data/descuentos.json` contiene ofertas referenciales por marca. Cada registro requiere:

- `fuenteUrl`: página oficial de la marca o proveedor que permita comprobarlo.
- `verificadoEl`: día de la última comprobación manual (`YYYY-MM-DD`, horario de Chile).
- `vigenteHasta`: término publicado por el proveedor; dejar vacío si no informa uno.
- `revisarHasta`: fecha máxima hasta la que se permite mostrar la oferta sin otra revisión.
- `canal`, `topeTexto` y `condiciones`: requisitos conocidos, sin inferir elegibilidad para una estación o usuario.

El workflow `Mantener descuentos` valida cada cambio y, todos los días, retira automáticamente los registros vencidos o cuya revisión caducó. **No descubre ofertas nuevas ni confirma cambios de montos**: esos datos requieren una nueva consulta a las fuentes oficiales y la edición del JSON. La app también aplica estas fechas, incluso cuando está sin conexión.

Antes de publicar cambios, ejecuta `node scripts/maintain-discounts.mjs --prune` y luego `node scripts/maintain-discounts.mjs --check`. Al preparar una versión de la app, copia este archivo a `BencinerasCercanas/public/descuentos.json` para renovar el respaldo incluido.
