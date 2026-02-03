
import fs from 'fs';
import util from 'util';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const logFile = fs.createWriteStream('test-output.txt', { flags: 'w' });

// Override console.log and console.error
const originalLog = console.log;
const originalError = console.error;

console.log = function (...args) {
    const msg = util.format.apply(null, args);
    logFile.write(msg + '\n');
    originalLog.apply(console, args);
};
console.error = function (...args) {
    const msg = util.format.apply(null, args);
    logFile.write(msg + '\n');
    originalError.apply(console, args);
};

async function run() {
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Service Key Present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { checkRateLimit, incrementUsage } = await import('../lib/rate-limit');
    const { supabase } = await import('../lib/supabase');

    console.log("Starting Rate Limit Test...");

    if (!supabase) {
        console.error("Supabase client not initialized!");
        return;
    }

    const testIp = "127.0.0.1"; // Test with local IP
    const testUser = null; // Anonymous

    // 1. Check Initial Limit
    console.log("\n1. Checking initial limit...");
    const initial = await checkRateLimit(testUser, testIp);
    console.log("Initial State:", JSON.stringify(initial));

    // 2. Increment Usage
    console.log("\n2. Incrementing usage...");
    try {
        await incrementUsage(testUser, testIp);
        console.log("Increment called.");
    } catch (e) {
        console.error("Increment failed:", e);
    }

    // 3. Check Limit Again
    console.log("\n3. Checking limit after increment...");
    const after = await checkRateLimit(testUser, testIp);
    console.log("After State:", JSON.stringify(after));

    if (after.remaining < initial.remaining) {
        console.log("\nSUCCESS: Count decreased.");
    } else {
        console.log("\nFAILURE: Count did not decrease.");
    }
}

run().catch(console.error);
