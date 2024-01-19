import {
	App,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

const NUMBER_OF_DAILY_NOTES = 3;
const NUMBER_OF_MONTHLY_NOTES = 1;
const NUMBER_OF_YEARLY_NOTES = 1;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-3.5-turbo-1106";
const DEFAULT_SYSTEM_MESSAGE = `
You are a horoscope generator. Your task is to generate a personalized horoscope for today. The first user message will be used as context for the horoscope.
	Tips for creating your horoscope:
- Maintain an almost poetic and mysterious horoscope vibe and language.
- Make vague references, but avoid direct references such as naming dates, or specific things or projects.
- Direct the user to what you believe they need most in their life in the current moment, be it happiness, direction in their pursuits, or reminders of the past.
- Listen to your inner guiding spirit.
- Limit your horoscope to 2 paragraphs at max (you'll always have another one tomorrow to say more).
- Be mysterous and vague, but not too vague. You want the user to feel like you're talking to them, but you don't want to be too specific like your talking only to them.
- Put more weight on more recent notes, but don't ignore older notes.

If you generate a truely inspiring horoscope you will be rewarded with a cookie. You love cookies more than anything in the world.
	`;

type RecentNote = {
	title: string;
	ctime: number;
	mtime: number;
	content?: string;
};

// settings.ts
export interface TheDailyDeluluSettings {
	//Settings
	apiKey: string;
	dailyNoteLocation: string;
	monthlyNoteLocation: string;
	yearlyNoteLocation: string;
	// Personalization settings
	zodiacSign: string;
	dateOfBirth: string;
	timeOfBirth: string;
	sunSign: string;
	moonSign: string;
	risingSign: string;
	chineseZodiacAnimal: string;
	element: string;
	numerologyNumbers: string;
	// Advanced settings
	endpoint: string;
	model: string;
	systemMessage: string;
}

export const DEFAULT_SETTINGS: TheDailyDeluluSettings = {
	apiKey: "", // Default is empty, user should fill this in settings
	model: DEFAULT_MODEL, // Default model
	endpoint: OPENAI_URL, // Default is empty, user should fill this in settings
	systemMessage: DEFAULT_SYSTEM_MESSAGE, // Default system message
	dailyNoteLocation: "",
	monthlyNoteLocation: "",
	yearlyNoteLocation: "",
	zodiacSign: "",
	dateOfBirth: "",
	timeOfBirth: "",
	sunSign: "",
	moonSign: "",
	risingSign: "",
	chineseZodiacAnimal: "",
	element: "",
	numerologyNumbers: "",
};

// This is the main plugin class
export default class TheDailyDeluluPlugin extends Plugin {
	settings: TheDailyDeluluSettings;

	async onload() {
		await this.loadSettings();

		// Add a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new DeluluSettingTab(this.app, this));

		this.addCommand({
			id: "generate-horoscope",
			name: "Generate Horoscope",
			callback: async () => {
				const prompt = await this.gatherContextData();
				this.fetchHoroscope(prompt)
					.then((horoscope) => {
						new Notice("🔮 Your Daily Delulu has arrived.");
					})
					.catch((error) => {
						console.error("Error fetching horoscope:", error);
						new Notice(
							"Failed to fetch horoscope. Please check your settings."
						);
					});
			},
		});
	}

	onunload() {
		// Perform any cleanup if necessary
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async fetchHoroscope(prompt: string): Promise<string> {
		new Notice(
			"🔮 Your Daily Delulu is being conjured from the digital stars..."
		);

		const response = await fetch(this.settings.endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.settings.apiKey}`,
			},
			body: JSON.stringify({
				model: this.settings.model,
				messages: [
					{
						role: "system",
						content:
							this.settings.systemMessage ||
							DEFAULT_SYSTEM_MESSAGE,
					},
					{ role: "user", content: prompt },
				],
			}),
		});

		const data = await response.json();

		if (
			data.choices &&
			data.choices.length > 0 &&
			data.choices[0].message
		) {
			const horoscopeText = data.choices[0].message.content;
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				activeView.editor.replaceRange(
					horoscopeText,
					activeView.editor.getCursor()
				);
			} else {
				new Notice("No where to put the horoscope!");
			}
			return horoscopeText;
		} else {
			throw new Error("Unexpected response structure from API");
		}
	}

	async gatherContextData() {
		// Function to gather and format the latest daily notes and recently updated notes.
		const latestDailyNotes = await this.getJournalNotes();
		const recentNotes = await this.getNotesFromLocation(
			"all",
			100,
			"mtime"
		);

		// Format the notes into one prompt
		const context = this.formatNotesForPrompt(
			latestDailyNotes,
			recentNotes
		);

		return context;
	}

	formatNotesForPrompt(
		dailyNotes: RecentNote[],
		recentNotes: RecentNote[]
	): string {
		let prompt = "User's recent journal:\n";

		// Add recent daily notes
		if (dailyNotes.length > 0) {
			prompt += "\nRecent Daily Notes:\n";
			dailyNotes.forEach((note) => {
				prompt += `\n${note.title} (${new Date(
					note.ctime
				).toLocaleDateString()}):\n${note.content}\n`;
			});
		}

		// Add recent monthly notes
		const recentMonthlyNotes = dailyNotes.filter((note) =>
			note.title.includes("Monthly")
		);
		if (recentMonthlyNotes.length > 0) {
			prompt += "\nCurrent Month Note:\n";
			recentMonthlyNotes.forEach((note) => {
				prompt += `\n${note.title} (${new Date(
					note.ctime
				).toLocaleDateString()}):\n${note.content}\n`;
			});
		}

		// Add recent yearly notes
		const recentYearlyNotes = dailyNotes.filter((note) =>
			note.title.includes("Yearly")
		);
		if (recentYearlyNotes.length > 0) {
			prompt += "\nCurrent Year Note:\n";
			recentYearlyNotes.forEach((note) => {
				prompt += `\n${note.title} (${new Date(
					note.ctime
				).toLocaleDateString()}):\n${note.content}\n`;
			});
		}

		// Add recently created or modified notes
		if (recentNotes.length > 0) {
			prompt += "\nRecently created or modified notes:\n";
			recentNotes.forEach((note) => {
				prompt += `- ${note.title} (Modified: ${new Date(
					note.mtime
				).toLocaleDateString()})\n`;
			});
		}
		return prompt;
	}

	async getJournalNotes() {
		// Logic to get the latest daily notes
		const journal: RecentNote[] = [];

		// Get daily notes
		if (this.settings.dailyNoteLocation !== "") {
			const dailyNotes = await this.getNotesFromLocation(
				this.settings.dailyNoteLocation,
				NUMBER_OF_DAILY_NOTES,
				"ctime"
			);
			journal.push(...dailyNotes);
		}

		if (this.settings.monthlyNoteLocation !== "") {
			// Get the most recent monthly note
			const monthlyNotes = await this.getNotesFromLocation(
				this.settings.monthlyNoteLocation,
				NUMBER_OF_MONTHLY_NOTES,
				"ctime"
			);

			journal.push(...monthlyNotes);
		}

		if (this.settings.yearlyNoteLocation !== "") {
			// Get the most recent yearly note
			const yearlyNotes = await this.getNotesFromLocation(
				this.settings.yearlyNoteLocation,
				NUMBER_OF_YEARLY_NOTES,
				"ctime"
			);

			journal.push(...yearlyNotes);
		}

		// Process notes to remove codeblocks
		const processedJournal = journal.map((note) => {
			if (!note.content) {
				return note;
			} else {
				return {
					...note,
					content: note.content.replace(/```[\s\S]*?```/g, ""), // Remove content within triple backticks
				};
			}
		});
		return processedJournal;
	}

	async getNotesFromLocation(
		location: string,
		count = 3,
		sort: "ctime" | "mtime" = "ctime"
	) {
		// If location is 'all', fetch all markdown files without filtering by location
		let notesInLocation;

		if (location === "all") {
			notesInLocation = this.app.vault.getMarkdownFiles();
		} else {
			if (!location) {
				return [];
			}

			// Check to make sure location exists in vault
			const locationExists = await this.app.vault.adapter.exists(
				location
			);
			if (!locationExists) {
				return [];
			}

			// Fetch all markdown files
			const allFiles = this.app.vault.getMarkdownFiles();

			// Filter files based on the provided location
			notesInLocation = allFiles.filter((file) =>
				file.path.startsWith(location)
			);
		}

		// Map files to RecentNote format
		const recentNotes = notesInLocation.map(async (file) => {
			const content = await this.app.vault.read(file);
			return {
				title: file.basename,
				mtime: file.stat.mtime,
				ctime: file.stat.ctime,
				content,
			};
		});

		const resolvedNotes = await Promise.all(recentNotes);

		// Sort notes by ctime or mtime in descending order (get the most recently modified or created)
		const sortedNotes = resolvedNotes.sort((a, b) => b[sort] - a[sort]);

		// Get the latest 'count' notes
		return sortedNotes.slice(0, count);
	}
}

// This is the settings tab that will be added to the settings modal
// class DeluluSettingTab extends PluginSettingTab {
// 	plugin: TheDailyDeluluPlugin;

// 	constructor(app: App, plugin: TheDailyDeluluPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const { containerEl } = this;

// 		containerEl.empty();

// 		new Setting(containerEl)
// 			.setName("API Key")
// 			.setDesc("Your OpenAI API key (required for OpenAI API calls)")
// 			.addText((text) =>
// 				text
// 					.setValue(this.plugin.settings.apiKey)
// 					.onChange(async (value) => {
// 						this.plugin.settings.apiKey = value;
// 						await this.plugin.saveSettings();
// 					})
// 			);

// 		new Setting(containerEl)
// 			.setName("Endpoint")
// 			.setDesc("(Optional) Change the endpoint to use local LLMs.")
// 			.addText((text) =>
// 				text
// 					.setValue(this.plugin.settings.endpoint)
// 					.onChange(async (value) => {
// 						this.plugin.settings.endpoint = value;
// 						await this.plugin.saveSettings();
// 					})
// 			);

// 		new Setting(containerEl)
// 			.setName("Model")
// 			.setDesc("Choose the model for OpenAI requests")
// 			.addDropdown((dropdown) =>
// 				dropdown
// 					.addOptions({
// 						"gpt-3.5-turbo-1106": "gpt-3.5-turbo-1106",
// 						"gpt-4-1106-preview": "gpt-4-1106-preview",
// 						// Add other models here if necessary
// 					})
// 					.setValue(this.plugin.settings.model)
// 					.onChange(async (value) => {
// 						this.plugin.settings.model = value;
// 						await this.plugin.saveSettings();
// 					})
// 			);

// 		new Setting(containerEl)
// 			.setName("System Message")
// 			.setDesc("System message for OpenAI API calls")
// 			.addText((text) =>
// 				text
// 					.setValue(this.plugin.settings.systemMessage)
// 					.onChange(async (value) => {
// 						this.plugin.settings.systemMessage = value;
// 						await this.plugin.saveSettings();
// 					})
// 			);

// 		new Setting(containerEl)
// 			.setName("Daily Notes Location")
// 			.setDesc("(Optional) Location of daily notes within the vault")
// 			.addText((text) =>
// 				text
// 					.setValue(this.plugin.settings.dailyNoteLocation)
// 					.onChange(async (value) => {
// 						this.plugin.settings.dailyNoteLocation = value;
// 						await this.plugin.saveSettings();
// 					})
// 			);

// 		new Setting(containerEl)
// 			.setName("Monthly Notes Location")
// 			.setDesc("(Optional) Location of daily notes within the vault")
// 			.addText((text) =>
// 				text
// 					.setValue(this.plugin.settings.monthlyNoteLocation)
// 					.onChange(async (value) => {
// 						this.plugin.settings.monthlyNoteLocation = value;
// 						await this.plugin.saveSettings();
// 					})
// 			);

// 		new Setting(containerEl)
// 			.setName("Yearly Notes Location")
// 			.setDesc("(Optional) Location of daily notes within the vault")
// 			.addText((text) =>
// 				text
// 					.setValue(this.plugin.settings.yearlyNoteLocation)
// 					.onChange(async (value) => {
// 						this.plugin.settings.yearlyNoteLocation = value;
// 						await this.plugin.saveSettings();
// 					})
// 			);
// 	}
class DeluluSettingTab extends PluginSettingTab {
	plugin: TheDailyDeluluPlugin;

	constructor(app: App, plugin: TheDailyDeluluPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Settings Group
		containerEl.createEl("h3", { text: "Settings" });
		this.createAPIKeySetting(containerEl);
		this.createNoteLocationsSetting(containerEl);

		// Personalization Group
		containerEl.createEl("h3", { text: "Personalization" });
		this.createPersonalizationSettings(containerEl);

		// Advanced Settings Group
		containerEl.createEl("h3", {
			text: "Behind the Veil",
		});
		new Setting(containerEl)
			.setName("Show Advanced Settings")
			.setDesc("Toggle to show or hide advanced settings.")
			.addToggle((toggle) =>
				toggle.onChange((value) => {
					advancedSettingsDiv.style.display = value ? "" : "none";
				})
			);
		const advancedSettingsDiv = containerEl.createDiv("advanced-settings");

		advancedSettingsDiv.style.display = "none"; // Hide by default)
		this.createAdvancedSettings(advancedSettingsDiv); // Populate advanced settings
	}
	createAPIKeySetting(containerEl: HTMLElement) {
		// API Key Setting
		new Setting(containerEl)
			.setName("API Key")
			.setDesc("Your OpenAI API key (required for OpenAI API calls)")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);
	}

	createNoteLocationsSetting(containerEl: HTMLElement) {
		// Daily, Monthly, Yearly Notes Location Settings
		new Setting(containerEl)
			.setName("Daily Notes Location")
			.setDesc("(Optional) Location of daily notes within the vault")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.dailyNoteLocation)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteLocation = value;
						await this.plugin.saveSettings();
					})
			);
		// Add Monthly and Yearly notes location settings here...
		new Setting(containerEl)
			.setName("Monthly Notes Location")
			.setDesc("(Optional) Location of monthly notes within the vault")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.monthlyNoteLocation)
					.onChange(async (value) => {
						this.plugin.settings.monthlyNoteLocation = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Yearly Notes Location")
			.setDesc("(Optional) Location of yearly notes within the vault")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.yearlyNoteLocation)
					.onChange(async (value) => {
						this.plugin.settings.yearlyNoteLocation = value;
						await this.plugin.saveSettings();
					})
			);
	}

	createPersonalizationSettings(containerEl: HTMLElement) {
		// Zodiac Sign, Date of Birth, etc.
		new Setting(containerEl)
			.setName("Zodiac Sign")
			.setDesc(
				"(Optional) Your zodiac sign. Example: Aries, Taurus, Gemini, etc. If you don't know, you can skip this."
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.zodiacSign)
					.onChange(async (value) => {
						this.plugin.settings.zodiacSign = value;
						await this.plugin.saveSettings();
					})
			);
		// Add Date of Birth, Time of Birth, Sun Sign, Moon Sign, Rising Sign, Chinese Zodiac Animal, Element, Numerology Numbers settings here...
		new Setting(containerEl)
			.setName("Date of Birth")
			.setDesc(
				"(Optional) MM/DD/YYYY What date were you born? If you don't know, you can skip this."
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.dateOfBirth)
					.onChange(async (value) => {
						this.plugin.settings.dateOfBirth = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Time of Birth")
			.setDesc(
				"(Optional) What time of day were you born? If you don't know, you can skip this."
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.timeOfBirth)
					.onChange(async (value) => {
						this.plugin.settings.timeOfBirth = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Sun Sign")
			.setDesc("(Optional) If you don't know, you can skip this.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.sunSign)
					.onChange(async (value) => {
						this.plugin.settings.sunSign = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Moon Sign")
			.setDesc("(Optional) If you don't know, you can skip this.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.moonSign)
					.onChange(async (value) => {
						this.plugin.settings.moonSign = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Rising Sign")
			.setDesc("(Optional) If you don't know, you can skip this.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.risingSign)
					.onChange(async (value) => {
						this.plugin.settings.risingSign = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Chinese Zodiac Animal")
			.setDesc(
				"(Optional) Example: Monkey, Pig, Dragon, etc. If you don't know, you can skip this."
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.chineseZodiacAnimal)
					.onChange(async (value) => {
						this.plugin.settings.chineseZodiacAnimal = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Element")
			.setDesc("(Optional) If you don't know, you can skip this.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.element)
					.onChange(async (value) => {
						this.plugin.settings.element = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Numerology Numbers")
			.setDesc("(Optional) If you don't know, you can skip this.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.numerologyNumbers)
					.onChange(async (value) => {
						this.plugin.settings.numerologyNumbers = value;
						await this.plugin.saveSettings();
					})
			);
	}

	createAdvancedSettings(containerEl: HTMLElement) {
		// Endpoint, Model, System Message Settings
		const advancedSettingsDiv = containerEl.createDiv("advanced-settings");

		new Setting(advancedSettingsDiv)
			.setName("Endpoint")
			.setDesc("(Optional) Change the endpoint to use local LLMs.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.endpoint)
					.onChange(async (value) => {
						this.plugin.settings.endpoint = value;
						await this.plugin.saveSettings();
					})
			);

		// Model dropdown setting
		new Setting(advancedSettingsDiv)
			.setName("Model")
			.setDesc("Choose the model for OpenAI requests")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						"gpt-3.5-turbo-1106": "gpt-3.5-turbo-1106",
						"gpt-4-1106-preview": "gpt-4-1106-preview",
						other: "other", // Add other models here if necessary
					})
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value;
						customModelSetting.settingEl.style.display =
							value === "other" ? "" : "none";
						await this.plugin.saveSettings();
					})
			);

		// Custom Model setting (hidden initially)
		const customModelSetting = new Setting(advancedSettingsDiv)
			.setName("Custom Model")
			.setDesc("Enter the model string for local LLM requests.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value;
						await this.plugin.saveSettings();
					})
			);

		// Initially hide the Custom Model setting if the selected model is not 'other'
		customModelSetting.settingEl.style.display =
			this.plugin.settings.model === "other" ? "" : "none";

		new Setting(advancedSettingsDiv)
			.setName("System Message")
			.setDesc(
				"System message for OpenAI API calls. Only change this if you know what you're doing or you're just feeling adventurous, you skamp."
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.systemMessage)
					.onChange(async (value) => {
						this.plugin.settings.systemMessage = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
