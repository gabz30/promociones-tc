# PromoTC

Plataforma para consultar promociones de tarjetas de crédito, ordenadas por vigencia.

## Bancos

- [Qik](https://qik.do/promociones/tarjetaqik/) — azul `#003c73`
- [LAFISE](https://www.lafise.com/blrd/banca-personal/promociones/) — rojo `#8b1e2d`
- [BHD](https://bhd.com.do/homepage-personal/products/259) — verde `#54ad4d`

## Cómo funciona

1. El servidor obtiene promociones de cada banco:
   - **Qik:** scrape HTML (`.promo-cards__card`)
   - **LAFISE:** JSON (`/blrd/web-resources/widgets/promociones.json`)
   - **BHD:** API Strapi (`/api/t-3-s/259?populate=deep`)
2. Parsea rangos en español y clasifica por vigencia (zona `America/Santo_Domingo`):
   - **Hoy** — vigentes ahora
   - **Próximas** — aún no empiezan
   - **Pasadas** — ya cerraron

Cache ISR: revalidación cada hora.

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).
