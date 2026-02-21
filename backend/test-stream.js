const decoder = new TextDecoder();
let buffer = "";

function processChunk(chunkStr) {
    buffer += chunkStr;
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";
    for (const chunk of lines) {
        console.log("PROCESSED: ", chunk);
    }
}

processChunk("data: {\"test\": 1}\n\n");
processChunk("data: {\"test");
processChunk("\": 2}");
processChunk("\n\ndata: {\"test");
processChunk("\": 3}\n");
processChunk("\ndata: {\"test\": 4}\n\n");

console.log("REMAINING:", buffer);
