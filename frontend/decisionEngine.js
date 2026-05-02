export function decisionEngine(msg) {
    const text = msg.toLowerCase();
  
    // 1. No voter ID
    if (text.includes("no voter id") || text.includes("lost id")) {
      return `
  Step 1: You can still vote.
  Step 2: Carry any valid ID like Aadhaar, Driving License, or Passport.
  Step 3: Go to polling booth and say:
  "My name is ___, please check voter list."
  Step 4: Important: Your name must be in the voter list.
  `;
    }
  
    // 2. No voter slip
    if (text.includes("no slip") || text.includes("didn't get slip")) {
      return `
  Step 1: You do NOT need a voter slip.
  Step 2: Go directly to your polling booth.
  Step 3: Carry a valid ID.
  Step 4: Important: Slip is optional, not required.
  `;
    }
  
    // 3. At polling station confusion
    if (text.includes("polling station") || text.includes("i am at booth")) {
      return `
  Step 1: Join the queue and stay in line.
  Step 2: Keep your ID ready in your hand.
  Step 3: When your turn comes, say:
  "My name is ___, please check my name in the voter list."
  Step 4: Follow the process: verification → ink → vote.
  `;
    }
  
    // 4. Name not found
    if (text.includes("name not found") || text.includes("not in list")) {
      return `
  Step 1: Do not argue at the desk.
  Step 2: Ask the officer if your name is in another nearby booth.
  Step 3: Check the voter list displayed outside.
  Step 4: Important: If your name is not in the voter list, you cannot vote.
  `;
    }
  
    // 5. Find booth
    if (text.includes("find my booth") || text.includes("where to vote")) {
      return {
        reply: `
  Step 1: Go to your assigned polling booth.
  Step 2: Follow the map shown below.
  Step 3: Carry your ID.
  Step 4: Important: Reach early to avoid long queues.
  `,
        map: {
          lat: 17.385,
          lng: 78.4867
        }
      };
    }
  
    // 6. Peak time / crowd
    if (text.includes("crowd") || text.includes("best time")) {
      return `
  Step 1: Avoid early morning and evening rush.
  Step 2: Try going in afternoon.
  Step 3: Stand in queue patiently.
  Step 4: Important: If you are in line before closing time, you can still vote.
  `;
    }
  
    return null;
  }
