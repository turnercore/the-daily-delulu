# The Daily Delulu

Your digital, personalized horoscope.

With this plugin, you can reach into the digital cosmos and find your guiding light. It will generate a bespoke horoscope for you to use in your daily notes.

> **PRIVACY NOTE:** This plugin collects personal information to generate a daily horoscope for you and only you. The data stays entirely local, but is sent to OpenAI for the query if you are using their endpoint. If it's important to you that your private information is not sent to OpenAI, please use a custom local endpoint in the Advanced Settings.

## Settings

## General Settings

-   **IMPORTANT API Key:** This is your OpenAI API key, needed if using the OpenAI endpoint.
-   **Daily Notes Location:** The location of the folder that contains your daily notes. For example, if your notes are in the folder 'daily' in the root folder of your vault, then you would put 'daily' here. If your daily notes are in 'journal/daily' you would put 'journal/daily'.
-   **Monthly Notes Location:** Location of monthly notes if you take those. Same rules as above.
-   **Yearly Notes Location:** Location of the yearly notes if you take those. Same rules as above.

### Personalization Settings (all optional)

These are optional settings for customization of your horoscope.

-   **Zodiac Sign:** Represents the position of the sun at your birth and reflects your core identity, personality traits, and preferences, such as Aries (bold, ambitious) or Taurus (reliable, patient).
-   **Date of Birth:** The specific day you were born on, in MM/DD/YYYY format, influencing your zodiac sign and numerological aspects, for example, `04/25` or `12/09`.
-   **Time of Birth:** The precise time you were born, important in astrology to determine your rising sign and other house placements, like `3:45 AM` or `9:30 PM`.
-   **Sun Sign:** Shows your fundamental nature, ego, and the self you present to the world, similar to your zodiac sign, with examples like Leo (creative, passionate) or Virgo (meticulous, analytical).
-   **Moon Sign:** Reflects your emotional inner self, subconscious, and how you deal with feelings, such as Moon in Cancer (sensitive, nurturing) or Moon in Aquarius (independent, unconventional).
-   **Rising Sign** (or Ascendant): Represents your social personality, physical appearance, and how others perceive you, for instance, Rising in Libra (charming, sociable) or Rising in Scorpio (intense, powerful).
-   **Chinese Zodiac Animal:** Based on the Chinese lunar calendar, symbolizes how others perceive you or how you present yourself, including animals like the Dragon (confident, intelligent) or the Snake (wise, graceful).
-   **Element:** In astrology, it represents a group of zodiac signs with similar traits, like Fire signs (Aries, Leo, Sagittarius - passionate, dynamic) or Water signs (Cancer, Scorpio, Pisces - intuitive, emotional).
-   **Numerology Numbers:** Derived from your birthdate, these numbers indicate your life's purpose, challenges, and overall journey, such as Life Path Number 1 (independent, leader) or 7 (intellectual, analytical).

### Behind the Veil (Advanced) Settings

-   **Endpoint:** Custom endpoint for use with other LLMs that operate on OpenAI API specs.
-   **Model:** Model to use for generation.
-   **System Message:** The default message is handcrafted by shamans and digital fae to output the most accurate horoscope for you. If you are testing new system messages or would like Delulu to do something custom for you, you're welcome to change it.

## Contributing

Anyone who feels compelled or drawn to this project is welcome to join the coven and contribute to the plugin.

If you're not a tech-savvy warlock, you can still contribute by testing new system messages to see what you get.

---

## Ideas for New Features and Improvements

Here is a list of some features that could be added to the plugin if there is interest.

-   Different Delulu personalities (perhaps you'd prefer a tarot card reader or a jokester personality).
-   Streaming of the response into the note.
-   More personalization options.
-   Limit generation to 1x a day.
-   Autofill for note location (like in Templater).
-   Improved Thinking feedback.
