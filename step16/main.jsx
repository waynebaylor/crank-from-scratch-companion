import {createElement, Renderer} from "./crank.js";
const renderer = new Renderer();
const app = document.getElementById("app");
renderer.render(
  <div>Hello <span style="color: red;">world</span></div>,
  app,
);
  