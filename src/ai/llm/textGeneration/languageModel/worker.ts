import webWorkerHandler from "./webWorkerHandler";

self.onmessage = webWorkerHandler().onmessage;
