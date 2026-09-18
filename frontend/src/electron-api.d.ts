export type ApiKeyStatus = {
	hasStoredApiKey: boolean;
};

export type ElectronApi = {
	getApiKeyStatus: () => Promise<ApiKeyStatus>;
	saveApiKey: (apiKey: string) => Promise<ApiKeyStatus>;
	clearApiKey: () => Promise<ApiKeyStatus>;
};

declare global {
	interface Window {
		electronApi?: ElectronApi;
	}
}

export {};
