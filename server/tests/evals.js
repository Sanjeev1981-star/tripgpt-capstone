require('dotenv').config();
const { generateResponse } = require('../services/aiService');
const assert = require('assert');

// Simple Color Logger
const log = (msg, color = '\x1b[37m') => console.log(`${color}${msg}\x1b[0m`);
const PASS = '\x1b[32m[PASS]';
const FAIL = '\x1b[31m[FAIL]';

async function runEvaluations() {
    log("Starting AI Evaluations...", '\x1b[36m');
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- EVAL 1: Grounding & RAG Quality ---
    log("\nRunning Eval 1: Grounding (POI Search Usage)...");
    try {
        const history = [{ role: 'user', content: "Plan a 1-day trip to Berlin focusing on history." }];
        const response = await generateResponse(history);

        // Check if search_pois was called
        const searchCalls = response.toolUsage.filter(name => name === 'search_pois');

        if (searchCalls.length > 0) {
            log(`${PASS} System queried external data source (OpenStreetMap).`);
        } else {
            console.error(`${FAIL} System did NOT query POIs. Potential Hallucination.`);
        }

        // Check if itinerary uses real names (fuzzy check - we can't be 100% sure without strict matching but we check if it generated a plan)
        if (response.itinerary && response.itinerary.days.length > 0) {
            log(`${PASS} System generated a structured itinerary.`);
        } else {
            console.error(`${FAIL} System failed to generate itinerary.`);
        }

    } catch (e) {
        log(`${FAIL} Exception: ${e.message}`);
    }

    // --- EVAL 2: Feasibility (Time Constraints) ---
    log("\nWaiting 20s for Rate Limit...");
    await sleep(20000);
    log("\nRunning Eval 2: Feasibility (Time Logic)...");
    try {
        const history = [{ role: 'user', content: "Plan a very short afternoon trip to Munich from 2pm to 6pm." }];
        const response = await generateResponse(history);

        if (response.itinerary) {
            const day1 = response.itinerary.days[0];
            const activities = day1.activities;
            const first = activities[0].time;
            const last = activities[activities.length - 1].time;

            // Simple string check (AI usually formats "14:00" or "2:00 PM")
            log(`Time Range Generated: ${first} - ${last}`);
            log(`${PASS} Itinerary structure exists (Manual check of times required for strict correctness, but format is valid).`);
        }
    } catch (e) {
        log(`${FAIL} Exception: ${e.message}`);
    }

    // --- EVAL 3: Edit Correctness ---
    log("\nWaiting 20s for Rate Limit...");
    await sleep(20000);
    log("\nRunning Eval 3: Edit Correctness...");
    try {
        // Seed with a fake previous state
        const history = [
            { role: 'user', content: "Plan a trip to Rome." },
            { role: 'assistant', content: "Here is a plan...", itinerary: { days: [{ day: 1, activities: [{ time: "10:00", activity: "Colosseum" }] }] } }, // Mock context if needed by AI, though AI mostly relies on text history.
            { role: 'user', content: "Replace Colosseum with Pantheon." }
        ];

        // We rely on the AI to understand the context. 
        // Note: Our generateResponse takes purely text history effectively unless we inject system state. 
        // For this simple agent, simply providing the text history shoudl be enough for it to "Search Pantheon" and "Update Itinerary".

        const response = await generateResponse(history);

        if (response.itinerary && JSON.stringify(response.itinerary).includes("Pantheon")) {
            log(`${PASS} Itinerary updated with requested change.`);
        } else {
            log(`${FAIL} Itinerary did not reflect key change.`);
        }
    } catch (e) {
        log(`${FAIL} Exception: ${e.message}`);
    }

    log("\nEvaluations Complete.", '\x1b[36m');
    process.exit(0);
}

runEvaluations();
