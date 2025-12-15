import { MESSAGES_V2 as MESSAGES } from './messages';

const leftPad = (int: number) => (int >= 10 ? int : "0" + int);

const timeFormatter = (date: Date) =>
    `${leftPad(date.getHours() ? date.getHours() : 0)}:${leftPad(
        date.getMinutes() ? date.getMinutes() : 0
    )}`;

const parseMessage = (template: string, deltaValue: string): string => {
    const text = template.replace('{delta}', deltaValue);

    const parts = text.split('*');

    const htmlParts = parts.map((part, index) => {
        if (part === "") return "";
        if (index % 2 === 0) {
            return `<span class="muted">${part}</span>`;
        } else {
            return `<b>${part}</b>`;
        }
    });

    return htmlParts.join("");
};

const generateSentence = (daylight: any, theme: string, messageIndex?: number) => {
    const minutes =
        theme === "night" ? daylight.tomorrow.minutes : daylight.today.minutes;
    const minuteString = minutes > 1 ? "minutes" : "minute";

    const deltaString = `${minutes} ${minuteString}`;

    const phase = theme === "night" ? "night" : "day";
    const feeling = daylight[theme === "night" ? "tomorrow" : "today"].positive
        ? "positive"
        : "negative";
    const sunLength = minutes >= 1 ? "minutes" : "seconds";

    // @ts-ignore
    let templateArray = MESSAGES[phase][feeling][sunLength];

    if (!templateArray) return "";

    let template;
    if (typeof messageIndex === 'number') {
        template = templateArray[messageIndex % templateArray.length];
    } else {
        template = templateArray[Math.floor(Math.random() * templateArray.length)];
    }

    return parseMessage(template, deltaString);
};

export { timeFormatter, generateSentence };
