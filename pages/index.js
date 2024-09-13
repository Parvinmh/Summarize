import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";

export default function Home() {
    const [urls, setUrls] = useState([""]);
    const [result, setResult] = useState("Article will be summarized here...");
    const [title, setTitle] = useState("");
    const [prompt_tokens, setPrompt_tokens] = useState("");
    const [completion_tokens, setCompletion_tokens] = useState("");
    const [total_tokens, setTotal_tokens] = useState("");

    function resetState() {
        setTitle("");
        setPrompt_tokens("");
        setCompletion_tokens("");
        setTotal_tokens("");
    }

    const handleUrlChange = (index, event) => {
        const newUrls = [...urls];
        newUrls[index] = event.target.value;
        setUrls(newUrls);
    };

    const handleAddUrl = () => {
        setUrls([...urls, ""]);
    };

    const handleRemoveUrl = (index) => {
        const newUrls = urls.filter((_, i) => i !== index);
        setUrls(newUrls);
    };

    async function onSubmit(event) {
        event.preventDefault();
    
        if (urls.every(url => url === "")) {
            setResult("Please enter at least one valid URL to summarize");
            return;
        }
    
        // Disable the form button
        const submitButton = event.target.querySelector("button[type='submit']");
        if (submitButton) {
            submitButton.setAttribute("disabled", "");
        }
        setResult("Generating...");
        resetState();
    
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ urls }),
            });
    
            const data = await response.json();
    
            if (response.status !== 200) {
                throw new Error(`Request failed with status ${response.status}`);
            }
        
            // Handling multiple results
            setResult(data.results.map(result => result.result).join("\n"));
            setTitle(data.results.map(result => result.title).join(", "));
            setPrompt_tokens(data.results.map(result => result.prompt_tokens).reduce((a, b) => a + b, 0));
            setCompletion_tokens(data.results.map(result => result.completion_tokens).reduce((a, b) => a + b, 0));
            setTotal_tokens(data.results.map(result => result.total_tokens).reduce((a, b) => a + b, 0));
    
            setUrls([""]);
        } catch (error) {
            console.error(error);
            setResult(`Error generating summary. Please try again.\n${error.message}`);
        } finally {
            if (submitButton) {
            submitButton.removeAttribute("disabled");
            }
        }
    }
    

    return (
        <>
            <Head>
                <meta charSet="UTF-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <meta name="description" content="Summarize links using GPT3"/>
                <meta name="keywords" content="GPT3, OpenAI, Summarize, Summarization, AI, Machine Learning"/>
                <meta name="author" content="George Chiramattel"/>

                <title>Summarizer</title>
            </Head>

            <main className={styles.main}>
                <img src="/Logo.png" className={styles.icon} alt={"Summarizer Logo"}/>
                <h3>Summarize one or more links using GPT3</h3>
                <form onSubmit={onSubmit}>
                    <label htmlFor="urlID">Enter URLs to Summarizer</label>
                    {urls.map((url, index) => (
                        <div key={index}>
                            <input
                                type="text"
                                name={`url${index}`}
                                placeholder={`  URL ${index + 1}`}
                                value={url}
                                onChange={(e) => handleUrlChange(index, e)}
                                style={{ marginBottom: "30px", width: "70%" }}
                            />
                            <button type="button" onClick={() => handleRemoveUrl(index)} className={styles.button} disabled={urls.length === 1}>
                                Remove
                            </button>
                            <button type="button" onClick={handleAddUrl} className={styles.button}>
                                Add URL
                            </button>
                        </div>
                    ))}

                    <input type="submit" value="Generate Summaries"/>
                </form>

                <div className={styles.result}>
                    {completion_tokens > 0 &&
                        <label htmlFor="resultID"><b>Article Title:</b> {title}<br/><b>Article Summary</b> 👇</label>
                    }
                    <textarea name="result" id="resultID" rows="25" aria-label="Article summary" disabled
                              value={result}/>

                    <div>
                        {prompt_tokens > 0 && <span><b>Prompt tokens</b>: {prompt_tokens}</span>}
                        {completion_tokens > 0 && <span> |  <b>Completion tokens</b>: {completion_tokens}</span>}
                        {total_tokens > 0 && <span> | <b>Total tokens</b>: {total_tokens} |&nbsp;
                            <b>Total Cost:</b> ${((Number.parseInt(total_tokens) / 1000) * 0.002).toFixed(6)}</span>}
                    </div>
                </div>

                <footer className={styles.footer}><span>
                    
                    This code for this project is available at this &nbsp;<a
                        href="https://github.com/Parvinmh/summarize">Github repository</a>.<br/>
                </span>
                </footer>
            </main>
        </>
    );
}
