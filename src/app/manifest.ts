import type { MetadataRoute } from "next";

// Permite "Agregar a pantalla de inicio": se abre como una app, sin la barra del navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finanzas",
    short_name: "Finanzas",
    description: "Cuánto podés gastar sin romper el mes",
    start_url: "/",
    display: "standalone",
    background_color: "#060e1f",
    theme_color: "#060e1f",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
