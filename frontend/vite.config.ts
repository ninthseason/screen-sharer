import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/screen-sharer-page-test/",
  plugins: [solid(), tailwindcss()],
});
