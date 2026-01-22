
/**
 * Updates the itinerary state on the client side.
 * @param {object} itinerary - The structured itinerary object
 * @returns {string} - Confirmation message
 */
async function updateItinerary(itinerary) {
    console.log("Updating Itinerary:", JSON.stringify(itinerary, null, 2));
    // In a real app with WebSocket, we'd push this update. 
    // Here, we'll return it as part of the tool output so the specific "finalContent" logic can pick it up 
    // or we just rely on the AI explaining it. 
    // actually, for this architecture, we want the AI to return this structured data to the frontend.
    return "Itinerary updated successfully. Terminate and show this to user.";
}

module.exports = { updateItinerary };
