import { webWorkerHandler } from "language-model-polyfill";

self.onmessage = webWorkerHandler().onmessage;
