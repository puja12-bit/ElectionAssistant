export function decisionEngine(msg) {
    const text = msg.toLowerCase();
  
    // We only keep very specific, critical, non-data-dependent instructions here.
    // Greetings and general help should go to the AI for a personalized experience.

    if (text.includes("practice") && text.includes("vote")) {
        return "You can practice voting by clicking the 'Practice Vote' button on the home screen! It will show you exactly how an EVM machine looks.";
    }

    return null; // Let the AI handle everything else for personal assistance
}
