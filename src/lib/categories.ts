import type { Promotion } from "./types";

export interface PromoCategory {
  id: string;
  label: string;
  keywords: string[];
}

export const PROMO_CATEGORIES: PromoCategory[] = [
  {
    id: "restaurantes",
    label: "Restaurantes",
    keywords: [
      "restaurante",
      "restaurant",
      "gastronom",
      "comida",
      "pizza",
      "burger",
      "hamburg",
      "cafe",
      "cafeteria",
      "starbucks",
      "mcdonald",
      "kfc",
      "wendy",
      "sushi",
      "pollo",
      "helad",
      "bar ",
      "food",
    ],
  },
  {
    id: "supermercados",
    label: "Supermercados",
    keywords: [
      "supermercado",
      "jumbo",
      "nacional",
      "sirena",
      "bravo",
      "pricesmart",
      "carrefour",
      "hipermercados ole",
      "hipermercado",
      "merca jumbo",
      "superlama",
      "plaza lama",
    ],
  },
  {
    id: "viajes",
    label: "Viajes",
    keywords: [
      "viaje",
      "vuelo",
      "aereo",
      "aerolinea",
      "hotel",
      "booking",
      "airbnb",
      "turismo",
      "boleto aereo",
      "falabella viajes",
    ],
  },
  {
    id: "salud",
    label: "Salud",
    keywords: ["farmacia", "farma", "salud", "clinica", "medico", "dental", "carol"],
  },
  {
    id: "hogar",
    label: "Hogar y ferretería",
    keywords: [
      "ferreter",
      "hogar",
      "ikea",
      "mueble",
      "pintura",
      "tono",
      "electro",
      "aire acondicionado",
      "ceramica",
      "construc",
    ],
  },
  {
    id: "moda",
    label: "Moda y tiendas",
    keywords: [
      "moda",
      "ropa",
      "zapato",
      "payless",
      "totto",
      "zara",
      "h&m",
      " almacenes",
    ],
  },
  {
    id: "tecnologia",
    label: "Tecnología",
    keywords: ["samsung", "apple", "laptop", "celular", "tecnolog", "iphone", "electrodom"],
  },
  {
    id: "entretenimiento",
    label: "Entretenimiento",
    keywords: ["cine", "festival", "concierto", "teatro", "boleta", "entreten"],
  },
  {
    id: "educacion",
    label: "Educación",
    keywords: ["colegio", "universidad", "escolar", "educativ", "librer", "escuela"],
  },
  {
    id: "combustible",
    label: "Combustible",
    keywords: [
      "gasolina",
      "estaciones next",
      "estacion next",
      "combustible",
      "propagas",
      "glp",
    ],
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getPromoCategoryId(promo: Promotion): string {
  const text = normalize(
    `${promo.merchant} ${promo.title} ${promo.description} ${promo.tag ?? ""}`,
  );
  for (const category of PROMO_CATEGORIES) {
    if (category.keywords.some((keyword) => text.includes(keyword))) {
      return category.id;
    }
  }
  return "otros";
}

export function categoryLabel(id: string): string {
  return PROMO_CATEGORIES.find((category) => category.id === id)?.label ?? "Otros";
}
