import { Configuration, OpenAIApi } from "openai";
import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import { NodeHtmlMarkdown } from "node-html-markdown";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function (req, res) {
    if (!configuration.apiKey) {
        res.status(500).json({
            error: {
                message: "OpenAI API key not configured, please follow instructions in README.md",
            }
        });
        return;
    }

    let urls = req.body.urls || [];
    
    // If urls is a string (single URL), convert to an array
    if (typeof urls === "string") {
        urls = [urls];
    }

    // Check if the urls array is valid and non-empty
    if (!Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({
            error: {
                message: "Please provide a valid URL or array of URLs.",
            }
        });
        return;
    }

    try {
        const results = await Promise.all(urls.map(async (url) => {
            if (url.trim().length === 0) {
                throw new Error("Invalid URL provided.");
            }

            const { prompt, title } = await generateChatPrompt(url);

            const chatInput = {
                model: "gpt-3.5-turbo",
                messages: prompt,
                temperature: 0.4,
            };

            const completion = await openai.createChatCompletion(chatInput);
            const { prompt_tokens, completion_tokens, total_tokens } = completion.data.usage;

            return {
                url: url,
                result: completion.data.choices[0].message.content,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                title,
            };
        }));

        res.status(200).json({ results });

    } catch (error) {
        if (error.response) {
            console.error(error.response.status, error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            console.error(`Error with OpenAI API request: ${error.message}`);
            res.status(500).json({
                error: {
                    message: 'An error occurred during your request.',
                }
            });
        }
    }
}

async function generateChatPrompt(url) {
    const resp = await fetch(url);
    const text = await resp.text();

    const virtualConsole = new VirtualConsole();
    const doc = new JSDOM(text, { virtualConsole });

    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    const contentMarkdown = NodeHtmlMarkdown.translate(article.content);

    const markdown = removeLinksFromMarkdown(contentMarkdown);
    const truncatedString = truncateStringToTokenCount(markdown, 1000);

    return {
        prompt: [
            { "role": "system", "content": "You are a helpful assistant." },
            { "role": "user", "content": "Can you help create documentation and sample code of the following url?" },
            { "role": "user", "content": "The documentation is formatted as markdown." },
            { "role": "user", "content": `The title of the article is ${article.title}.` },
            { "role": "user", "content": `The article is as follows: \n${truncatedString}` }
        ],
        title: `${article.title}`,
    };
}

// Function to truncate string based on word boundary
function truncateStringToTokenCount(str, num) {
    return str.split(/\s+/).slice(0, num).join(" ");
}

// Function to remove links from markdown
function removeLinksFromMarkdown(text) {
    const regex = /\[([^\]]+)]\(([^)]+)\)/g;
    return text.replace(regex, "$1");
}
