import type { MetadataRoute } from "next";

// Permite "Agregar a pantalla de inicio": se abre como una app, sin la barra del navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finanzas",
    short_name: "Finanzas",
    description: "Cuánto podés gastar sin romper el mes",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#2a9d8f",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
