// The Daily Delulu Plugin lovely ripped from the void by Turner Monroe (@turnercore) 🧙
import {
	App,
	EditorPosition,
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
	horoscopeLength: number;
}

export const DEFAULT_SETTINGS: TheDailyDeluluSettings = {
	apiKey: "", // Default is empty, user should fill this in settings
	model: DEFAULT_MODEL, // Default model
	endpoint: OPENAI_URL, // Default is empty, user should fill this in settings
	systemMessage: "", // Default system message
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
	horoscopeLength: 1,
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

						const activeView =
							this.app.workspace.getActiveViewOfType(
								MarkdownView
							);
						if (!activeView || !this.cursorPosition) {
							new Notice("Horoscope could not be inserted.");
						} else {
							// Replace the placeholder '🔮' with the actual horoscope text
							activeView.editor.replaceRange(
								horoscope,
								this.cursorPosition,
								{
									line: this.cursorPosition.line,
									ch: this.cursorPosition.ch + 1, // +1 to include the placeholder
								}
							);
						}
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

	// Creates a system message controlled by settings variables.
	generateSystemMessage(): string {
		// If there is no system message set, then we use the default.
		if (!this.settings.systemMessage) {
			return `
			You are a horoscope generator. Your task is to generate a personalized horoscope for today. The first user message will be used as context for the horoscope.
			
			Your horoscope should be creative and thought provoking, helpful to the user's life and relevant to their unique situation. 
			
			THE HOROSCOPE MUST BE ${this.settings.horoscopeLength} paragraphs or LESS!!

			Tips for creating your horoscope:
			- Maintain an almost poetic and mysterious horoscope vibe and language.
			- Make vague references, but avoid direct references such as naming dates, or specific things or projects.
			- Direct the user to what you believe they need most in their life in the current moment, be it happiness, direction in their pursuits, or reminders of the past.
			- Listen to your inner guiding spirit.
			- Be mysterious and vague, but not too vague. You want the user to feel like you're talking to them, but you don't want to be too specific like you're talking only to them.
			- Put more weight on more recent notes, but don't ignore older notes.
			- Limit your horoscope to ${this.settings.horoscopeLength} paragraphs at max (you'll always have another one tomorrow to say more).
			`;
		} else {
			// Otherwise we parse the system message. Variables can be used with {{}} double brackets around them and will be replaced with the system setting.
			//The user can use the following variables in their system message:
			// {{horoscopeLength}} - The length of the horoscope (in paragraphs)
			// {{zodiacSign}} - The user's zodiac sign
			// {{dateOfBirth}} - The user's date of birth
			// {{timeOfBirth}} - The user's time of birth
			// {{sunSign}} - The user's sun sign
			// {{moonSign}} - The user's moon sign
			// {{risingSign}} - The user's rising sign
			// {{chineseZodiacAnimal}} - The user's Chinese zodiac animal
			// {{element}} - The user's element
			// {{numerologyNumbers}} - The user's numerology numbers
			// {{age}} - The calculated user's age from their date of birth
			// Variables can be {{age}} or {{ age }}, spaces will be removed from inside the brackets
			return this.parseSystemMessage(this.settings.systemMessage);
		}
	}

	parseSystemMessage(systemMessage: string): string {
		const variables: { [key: string]: string | number } = {
			horoscopeLength: this.settings.horoscopeLength,
			zodiacSign: this.settings.zodiacSign,
			dateOfBirth: this.settings.dateOfBirth,
			timeOfBirth: this.settings.timeOfBirth,
			sunSign: this.settings.sunSign,
			moonSign: this.settings.moonSign,
			risingSign: this.settings.risingSign,
			chineseZodiacAnimal: this.settings.chineseZodiacAnimal,
			element: this.settings.element,
			numerologyNumbers: this.settings.numerologyNumbers,
			age: this.calculateAge(),
		};

		return systemMessage.replace(/{{\s*(.*?)\s*}}/g, (_, variable) =>
			variables[variable].toString()
		);
	}

	calculateAge(): number {
		// calculate the age of the user from the year date vs current time
		// Date format should be MM/DD/YYYY
		const dateOfBirth = new Date(this.settings.dateOfBirth);
		const today = new Date();

		let age = today.getFullYear() - dateOfBirth.getFullYear();
		const monthDifference = today.getMonth() - dateOfBirth.getMonth();

		// If the current month is before the birth month or it's the birth month but the day is before the birth day
		if (
			monthDifference < 0 ||
			(monthDifference === 0 && today.getDate() < dateOfBirth.getDate())
		) {
			age--;
		}

		return age;
	}

	cursorPosition: EditorPosition | null = null;

	async fetchHoroscope(prompt: string): Promise<string> {
		// Console log the input message being used
		console.log("prompt", this.generateSystemMessage());
		// Log model used
		console.log("model", this.settings.model);

		new Notice(
			"🔮 Your Daily Delulu is being conjured from the digital stars..."
		);

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (!activeView) {
			new Notice(
				"Please place the cursor in a document where you want the horoscope."
			);
			return "";
		}

		// Save the cursor position
		this.cursorPosition = activeView.editor.getCursor();

		// Place the placeholder '🔮' where the cursor is
		activeView.editor.replaceRange("🔮", this.cursorPosition);

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
						content: this.generateSystemMessage(),
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

		//Controls the length of the reading
		new Setting(containerEl)
			.setName("Horoscope Length")
			.setDesc("Controls the length of the reading.")
			.addSlider((slider) => {
				slider
					.setLimits(1, 5, 1)
					.setValue(this.plugin.settings.horoscopeLength)
					.onChange(async (value) => {
						this.plugin.settings.horoscopeLength = value;
						await this.plugin.saveSettings();
					});
			});
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

		// System Message setting to override the system message
		const systemMessageDesc = document.createDocumentFragment();

		systemMessageDesc.append(
			"System message to instruct the seer. Only change this if you're feeling adventurous, you skamp."
		);

		systemMessageDesc.append(systemMessageDesc.createEl("br"));
		systemMessageDesc.append(systemMessageDesc.createEl("br"));

		systemMessageDesc.append(
			"You can use the following variables in your system message, formatted by double curly wizard whisker brackets {{variable}}."
		);

		systemMessageDesc.append(systemMessageDesc.createEl("br"));
		systemMessageDesc.append(systemMessageDesc.createEl("br"));

		const variablesList = [
			"{{horoscopeLength}} - number 1 - 5",
			"{{zodiacSign}} - The user's zodiac sign",
			"{{dateOfBirth}} - The user's date of birth",
			"{{timeOfBirth}} - The user's time of birth",
			"{{sunSign}} - The user's sun sign",
			"{{moonSign}} - The user's moon sign",
			"{{risingSign}} - The user's rising sign",
			"{{chineseZodiacAnimal}} - The user's Chinese zodiac animal",
			"{{element}} - The user's element",
			"{{numerologyNumbers}} - The user's numerology numbers",
			"{{age}} - The calculated user's age from their date of birth",
		];

		variablesList.forEach((variable) => {
			systemMessageDesc.append(systemMessageDesc.createEl("br"));
			systemMessageDesc.append(variable);
		});

		new Setting(advancedSettingsDiv)
			.setName("System Message")
			.setDesc(systemMessageDesc)
			.addTextArea((textArea) => {
				textArea
					.setValue(this.plugin.settings.systemMessage)
					.onChange(async (value) => {
						this.plugin.settings.systemMessage = value;
						await this.plugin.saveSettings();
					});
				// Adjust the size of the textarea
				textArea.inputEl.rows = 30; // height
				textArea.inputEl.cols = 40; // width
			});
	}
}
