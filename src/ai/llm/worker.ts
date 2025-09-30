import { webWorkerHandler } from "./textGeneration";

self.onmessage = webWorkerHandler().onmessage;
