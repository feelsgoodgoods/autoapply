require('dotenv').config();
const axios = require('axios');

const makeRequest = async () => {
    try {
        headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.YOUR_OPENAI_API_KEY}`
        }
        let data = {
            "model": "gpt-4",
            "messages": [{ "role": "user", "content": "Hello" }],
            "temperature": 0, // 0-2 randomness
            "max_tokens": 2000, // Uses @max 2000 of available tokens for response.
            "top_p": 0.1, // 0-1 nucleus sampling 
            "frequency_penalty": 0, // 0-2 decreases word repetition
            "presence_penalty": 0 // 0-2 increases topic diversity. bad for json
        }
        let url = "https://api.openai.com/v1/chat/completions"
        const response = await axios.post(url, data, { headers });
        console.log('ChatGPT:', response.data.usage)
        const chatGPTResponse = response.data.choices[0].message.content;

        return chatGPTResponse;
    }
    catch (error) {
        console.error('There was an error!', error); // Handle the error as needed 
        return false
    }
};

let t = makeRequest();
console.log(t)

/**
// gpt-3.5-turbo-1106 - 16,385 tokens
// gpt-4-vision-preview - 128,000 tokens
// gpt-4-1106-preview - 128,000 tokens


Important: when using JSON mode, you must also instruct the model to produce JSON yourself via a system or user message. Without this, the model may generate an unending stream of whitespace until the generation reaches the token limit, resulting in a long-running and seemingly "stuck" request. Also note that the message content may be partially cut off if finish_reason="length", which indicates the generation exceeded max_tokens or the conversation exceeded the max context length.

gpt-3.5-turbo, gpt-4, and gpt-4-32k point to the latest model version. You can verify this by looking at the response object after sending a request. The response will include the specific model version used (e.g. gpt-3.5-turbo-0613).


"tool_choice": "auto",
"tools" : [
{
    "type": "function",
    "function": {
    "name": "get_current_weather",
    "description": "Get the current weather in a given location",
    "parameters": {
        "type": "object",
        "properties": {
        "location": {
            "type": "string",
            "description": "The city and state, e.g. San Francisco, CA",
        },
        "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
        },
        "required": ["location"],
    },
    }
}
]


{"role": "system", "content": "You are a laconic assistant. You reply with brief, to-the-point answers with no elaboration."},

[
        {"role": "system", "content": "You are a helpful, pattern-following assistant that translates corporate jargon into plain English."},
        {"role": "system", "name":"example_user", "content": "New synergies will help drive top-line growth."},
        {"role": "system", "name": "example_assistant", "content": "Things working well together will increase revenue."},
        {"role": "system", "name":"example_user", "content": "Let's circle back when we have more bandwidth to touch base on opportunities for increased leverage."},
        {"role": "system", "name": "example_assistant", "content": "Let's talk later when we're less busy about how to do better."},
        {"role": "user", "content": "This late pivot means we don't have time to boil the ocean for the client deliverable."},
    ],

*/