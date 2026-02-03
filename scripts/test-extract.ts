
function extractReasoning(text: string): { reasoning?: string; cleanText: string } {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
        return {
            reasoning: thinkMatch[1].trim(),
            cleanText: text.replace(/<think>[\s\S]*?<\/think>/, '').trim()
        };
    }
    return { cleanText: text };
}

const test1 = "Here is the answer.";
const test2 = "<think>Calculating...</think> Here is the answer.";
const test3 = "<think>\nMulti-line\nReasoning\n</think>\nResult.";

console.log('Test 1:', extractReasoning(test1));
console.log('Test 2:', extractReasoning(test2));
console.log('Test 3:', extractReasoning(test3));
