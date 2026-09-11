const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronApi", {
	getApiKeyStatus: () => ipcRenderer.invoke("api-key:get-status"),
	saveApiKey: (apiKey) => ipcRenderer.invoke("api-key:save", apiKey),
	clearApiKey: () => ipcRenderer.invoke("api-key:clear"),
});
