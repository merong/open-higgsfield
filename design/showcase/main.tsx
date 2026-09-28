import { createRoot } from "react-dom/client";

import "pretendard/dist/web/variable/pretendardvariable.css";
import "./showcase.scss";

import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
