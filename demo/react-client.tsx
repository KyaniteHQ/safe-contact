import { hydrateRoot } from "react-dom/client";
import { App } from "./react-app.js";

hydrateRoot(document.getElementById("root")!, <App />);
