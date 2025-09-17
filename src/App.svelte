<script lang="ts">
  import { tick } from 'svelte';

  type Card = {
    id: number;
    category: 'Action' | 'Challenge' | 'Mini Game';
    label: string;
  };

  const rawDeck: Card[] = [
    { id: 1, category: 'Action', label: 'Recall' },
    { id: 2, category: 'Action', label: 'Sit' },
    { id: 3, category: 'Action', label: 'Greet' },
    { id: 4, category: 'Action', label: 'Heel' },
    { id: 5, category: 'Action', label: 'Focus' },
    { id: 6, category: 'Action', label: 'Paw' },
    { id: 7, category: 'Action', label: 'Down' },
    { id: 8, category: 'Action', label: 'Back' },
    { id: 9, category: 'Action', label: 'Stay' },
    { id: 10, category: 'Action', label: 'Place' },

    { id: 11, category: 'Challenge', label: 'Squirrel' },
    { id: 12, category: 'Challenge', label: 'Do it Twice' },
    { id: 13, category: 'Challenge', label: 'Cat Ate Your Tongue' },
    { id: 14, category: 'Challenge', label: 'Pirate Leg' },
    { id: 15, category: 'Challenge', label: 'Hands Behind Your Back' },
    { id: 16, category: 'Challenge', label: 'Long Distance Call' },

    { id: 17, category: 'Mini Game', label: 'Two Ball Fetch' },
    { id: 18, category: 'Mini Game', label: 'Sniff and Choose' },
    { id: 19, category: 'Mini Game', label: 'Hot Potato' },
    { id: 20, category: 'Mini Game', label: 'Hide and Seek' },
    { id: 21, category: 'Mini Game', label: 'The Statue' },
    { id: 22, category: 'Mini Game', label: 'Pawathon' },
    { id: 23, category: 'Mini Game', label: 'Treasure Hunt' },
    { id: 24, category: 'Mini Game', label: 'Dog Roll' },
    { id: 25, category: 'Mini Game', label: 'The Catcher' },
    { id: 26, category: 'Mini Game', label: 'Give Me, Drop it, Leave it!' }
  ];

  let shuffledDeck: Card[] = [];
  let isShuffling = false;
  let activeCard: Card | null = null;
  let timer = 0;
  let timerRunning = false;
  let timerInterval: any = null;
  let player1Cards: Card[] = [];
  let player2Cards: Card[] = [];
  let player3Cards: Card[] = [];
  let flying = false;
  let flyingDirection: 'left' | 'right' | null = null;

  let miniGameReserve: Card[] = [];
  let selectedMiniGames: Card[] = [];

  let miniGameTurn: 1 | 2 | null = null;
  let actionTimerUsed = false;

  let gameOver = false;
  let winner: 1 | 2 | null = null;
  let showTieOverlay = false;

  // Turn tracking
  let currentTurn: 1 | 2 | 3 = 1;

  // Player and dog names
  let player1Name = '';
  let player2Name = '';
  let player3Name = '';
  let dogName = '';
  let email = '';

  // Helper function to get number of players
  function getNumPlayers() {
    return player3Name.trim() ? 3 : 2;
  }

  // Helper function to get next turn
  function getNextTurn(current) {
    const numPlayers = getNumPlayers();
    if (current >= numPlayers) {
      return 1;
    } else {
      return current + 1;
    }
  }

  // --- Global mini-game advantage counter ---
  let globalMiniGameCount = 0;

  // Track advantage cards for each player
  let player1AdvantageCards: { id: string, message: string }[] = [];
  let player2AdvantageCards: { id: string, message: string }[] = [];
  let player3AdvantageCards: { id: string, message: string }[] = [];

  // Mini-game advantage overlay state
  let showAdvantageOverlay = false;
  let currentAdvantageMessage = '';

  // Golden Bone advantage state
  let goldenBoneActive = false;
  let kitchenThiefActive = false;

  // Mini-game explanation overlay state
  let showMiniGameExplanation = false;
  let currentMiniGameExplanation = '';

  // Action card instructions tooltip
  let showActionTooltip = false;
  let actionTooltipContent = '';
  let actionTooltipCard: Card | null = null;

  const actionInstructions: Record<string, string> = {
    'Recall': `Call ${dogName || 'your dog'} from as far as possible into a treat in your extended hand.`,
    'Sit': `With a treat in your hand, grace just above ${dogName || 'your dog'}'s nose until they sit.`,
    'Greet': `Present your fist with a treat inside, if ${dogName || 'your dog'} sniffs, licks or nudges your hand, reward their good manners.`,
    'Heel': `With a treat in your hand, guide ${dogName || 'your dog'} to walk right next to you for at least five steps.`,
    'Focus': `Holding a treat between your index finger and thumb, grace just above ${dogName || 'your dog'}'s nose and then place it between your eyebrows, count out loud for at least three seconds.`,
    'Paw': `With a treat in your hand, grace and hold just below the ear of ${dogName || 'your dog'}, wait for them to use their paw to push off your hand.`,
    'Down': `With a treat in your hand, grace ${dogName || 'your dog'}'s chin and chest as you place your hand flat on the ground in between their front legs, waiting for them to lay down.`,
    'Back': `With ${dogName || 'your dog'} sitting, hold a treat in your hand just above the top of ${dogName || 'your dog'}'s head, putting your foot in between their front paws, move your hand towards their tail, waiting for them to move back.`,
    'Stay': `With ${dogName || 'your dog'} sitting or laying down, show the palm of your hand and slowly take at least three steps backwards, return and reward ${dogName || 'your dog'}'s self-control.`,
    'Place': `With a towel on the floor, guide ${dogName || 'your dog'} near it and drop a treat in the towel the moment they step on it, praise and reward them again.`
  };

  const challengeInstructions: Record<string, string> = {
    'Squirrel': 'Toss a ball to create a distraction',
    'Do it Twice': 'Self explanatory',
    'Cat Ate Your Tongue': 'Guide your dog to perform the Action Card without saying a word',
    'Pirate Leg': 'Guide your dog to perform the Action Card while standing only on one leg',
    'Hands Behind Your Back': 'Guide your dog to perform the Action Card without any gestures',
    'Long Distance Call': `Perform the Action Card at least five steps away from ${dogName || 'your dog'}`
  };
  // Instructions walkthrough state
  const miniGameExplanations: Record<string, string> = {
    'Two Ball Fetch': `
      1. Win by: Getting more balls fetched under 30 seconds.
      2. Set Up: You get the two balls on your turn, the timer starts the moment you toss the first ball.
*to count the throw has to be at least three times the length of ${dogName || 'your dog'}.
*to count the fetch ${dogName || 'your dog'} has to come to where you can pick up the ball without moving one of your feet.
      3. How to Play: While keeping one foot glued where you are standing, throw the first ball, once ${dogName || 'your dog'} brings it back, show the second one, when ${dogName || 'your dog'} drops it, throw the second one.
      4. Tie Breaker: Each player has a ball, standing next to each other you both throw it at the same time, the ball that gets fetched wins.
    `,
    'Sniff and Choose': `
      1. Win by: Having ${dogName || 'your dog'} choose your hand over your opponent's.
      2. Set Up: Each player hides a treat in their closed fist. Both players kneel down facing each other about 3 feet apart.
      3. How to Play: Present both closed fists to ${dogName || 'your dog'} simultaneously. ${dogName || 'Your dog'} will sniff and choose one fist by pawing, licking, or nudging it.
      4. Tie Breaker: N/A
    `,
    'Hot Potato': `
      1. Win by: Not having the ball in your hands when the 30 seconds run out.
      2. Set Up: Players stand on opposite sides of the room you're playing in, one of them holding a ball.
      3. How to Play: The player that's empty handed calls ${dogName || 'your dog'}'s name, only then the player that has the ball passes it, the player receiving the ball lowers it in such a way that ${dogName || 'your dog'} comes closer to take it, only then the player that is now empty handed calls ${dogName || 'your dog'}'s name to continue playing.
      4. Tie Breaker: In the event of the ball being mid air when the timer goes off, the game is repeated.
    `,
    'Hide and Seek': `
      1. Win by: If hiding, not being found, if seeking, having ${dogName || 'your dog'} finding the other player under 30 seconds.
      2. Set Up: "The player that picked the card hides while the other player takes ${dogName || 'your dog'} to a different room and asks them to "Sit" for a count of 10 out loud.
This is when the timer starts. 
      3. How to Play: The player holding ${dogName || 'your dog'} releases them and says "Find (Name of the player)!" ${dogName || 'Your dog'} will search for the hidden player.
      4. Tie Breaker: N/A
    `,
    'The Statue': `
      1. Win by: Keeping ${dogName || 'your dog'} sitting the longest time possible up to 30 seconds.
      2. Set Up: Each player positions ${dogName || 'your dog'} in a "Sit" about 3 feet away from them, the timer starts the moment ${dogName || 'your dog'}'s bottom touches the floor.
      3. How to Play: Each player gets a 30 second turn, in which as ${dogName || 'your dog'} sits you must keep the count out loud.
      4. Tie Breaker: if both players reach the exact same count, take a ball and repeat the game, but this time, as you count you must also bounce the ball.
    `,
    'Pawathon': `
      1. Win by: Being the player to whom ${dogName || 'your dog'} gives the most paws under 30 seconds.
      2. Set Up: Players take turns standing in front of ${dogName || 'your dog'} to offer their hand repeatedly without rewarding until the end of the 30 seconds. *Both players reward at the end of their turn as to not discourage ${dogName || 'your dog'}.
      3. How to Play: ${dogName || 'Your dog'} sits and each player asks for paw repeatedly. *only one paw at a time, double paws or high 10s don't count.
      4. Tie Breaker: Both players stand in front of the sitting dog, they both ask for Paw at the same time. whoever gets the paw wins.
    `,
    'Treasure Hunt': `
      1. Win by: If hiding the treat, not having it found, if hunting, having ${dogName || 'your dog'} finding the treat under 30 seconds.
      2. Set Up: "The player that picked the card hides the treat while the other player takes ${dogName || 'your dog'} to a different room and asks them to Sit for a count of 10 out loud.
This is when the timer starts."
      3. How to Play: Release ${dogName || 'your dog'} and give them the "find it" command. ${dogName || 'Your dog'} will search for the hidden treats.
      4. Tie Breaker: N/A
    `,
    'Dog Roll': `
      1. Win by: Getting ${dogName || 'your dog'} to complete the most rolls in a row under 30 seconds.
      2. Set Up: Each player positions ${dogName || 'your dog'} in the "Down" position on a soft surface like grass or carpet.
      3. How to Play: Players take turns commanding ${dogName || 'your dog'} to "roll over." Count consecutive successful rolls until ${dogName || 'your dog'} stops or gets up.
      4. Tie Breaker: If both dogs achieve the same number of rolls, go into a Roll face off, where you take turns asking ${dogName || 'your dog'} to roll in sudden death format.
    `,
    'The Catcher': `
      1. Win by: Having ${dogName || 'your dog'} catch the most treats out of 5 tosses.
      2. Set Up: Each player stands 2 long steps away from ${dogName || 'your dog'} with 5 small treats. Players take turns.
      3. How to Play: Toss treats one at a time gently toward ${dogName || 'your dog'}'s mouth. Count successful catches. After both players complete their 5 tosses, compare scores.
      4. Tie Breaker: If tied, each player gets 3 additional tosses in sudden death format.
    `,
     'Give Me, Drop it, Leave it!': `
      1. Win by: Collecting the most points from  ${dogName || 'your dog'} giving you, dropping or leaving a toy under 30 seconds.
      2. Set Up: Each player starts by holding the toy in front of ${dogName || 'your dog'}. Players take turns and ask the canine player to "Give me" for 1 point, "Drop it" 2 points and "Leave it" for 3 points.
      3. How to Play: Toss the toy, after each time ${dogName || 'your dog'} performs one of the behaviors, toss it again, Count successful behaviors. After all players complete their turns, compare scores.
      4. Tie Breaker: If tied, each player gets 3 additional tosses in sudden death format.
    `
  };

  let showInstructions = true;
  let currentStep = 1;
  const totalSteps = 8;

  function reviewInstructions() {
    showInstructions = true;
    currentStep = 1;
    // Don't call animateShuffle() - just show instructions without restarting
  }

  function showActionInstruction(card: Card) {
    if (card.category === 'Action' && actionInstructions[card.label]) {
      actionTooltipContent = actionInstructions[card.label];
      actionTooltipCard = card;
      showActionTooltip = true;
    }
  }

  function showChallengeInstruction(card: Card) {
    if (card.category === 'Challenge' && challengeInstructions[card.label]) {
      actionTooltipContent = challengeInstructions[card.label];
      actionTooltipCard = card;
      showActionTooltip = true;
    }
  }
  function hideActionInstruction() {
    if (actionTooltipCard && actionTooltipCard.category === 'Challenge') {
      if (currentTurn === 'player1') {
        player1Cards = [actionTooltipCard, ...player1Cards];
      } else if (currentTurn === 'player2') {
        player2Cards = [actionTooltipCard, ...player2Cards];
      }
      activeCard = null;
      currentTurn = getNextTurn(currentTurn);
    }
    
    showActionTooltip = false;
    actionTooltipContent = '';
    actionTooltipCard = null;
  }

  function showMiniGameInstruction(card: Card) {
    if (card.category === 'Mini Game' && miniGameExplanations[card.label]) {
      currentMiniGameExplanation = miniGameExplanations[card.label];
      showMiniGameExplanation = true;
    }
  }

  function hideMiniGameInstruction() {
    showMiniGameExplanation = false;
    currentMiniGameExplanation = '';
  }

  // --- Challenge card play state ---
  let selectedChallengeCard: Card | null = null;
  let challengeCardPlayer: 1 | 2 | 3 | null = null;

  function activateChallengeCard(card: Card, player: 1 | 2 | 3) {
    if (selectedChallengeCard) return; // Only one active challenge card allowed
    selectedChallengeCard = card;
    challengeCardPlayer = player;

    // Remove challenge card from player's cards immediately
    if (player === 1) {
      player1Cards = player1Cards.filter(c => c.id !== card.id);
    } else if (player === 2) {
      player2Cards = player2Cards.filter(c => c.id !== card.id);
    } else if (player === 3) {
      player3Cards = player3Cards.filter(c => c.id !== card.id);
    }
  }

  function shuffleDeck() {
    const actionAndChallenge = rawDeck.filter(card => card.category !== 'Mini Game');
    const miniGames = rawDeck.filter(card => card.category === 'Mini Game');

    selectedMiniGames = [...miniGames].sort(() => Math.random() - 0.5).slice(0, 3);
    miniGameReserve = miniGames.filter(card => !selectedMiniGames.includes(card));

    shuffledDeck = [...actionAndChallenge, ...selectedMiniGames];

    for (let i = shuffledDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
  }

  async function animateShuffle() {
    isShuffling = true;
    activeCard = null;
    player1Cards = [];
    player2Cards = [];
    player3Cards = [];
    flying = false;
    flyingDirection = null;
    miniGameTurn = null;
    actionTimerUsed = false;
    timerRunning = false;
    clearInterval(timerInterval);
    timer = 0;
    gameOver = false;
    winner = null;
    showTieOverlay = false;

    currentTurn = 1;

    globalMiniGameCount = 0;
    player1AdvantageCards = [];
    player2AdvantageCards = [];
    player3AdvantageCards = [];

    showAdvantageOverlay = false;
    currentAdvantageMessage = '';
    showInstructions = false;

    showActionTooltip = false;
    actionTooltipContent = '';
    actionTooltipCard = null;
    showMiniGameExplanation = false;
    currentMiniGameExplanation = '';

    selectedChallengeCard = null;
    challengeCardPlayer = null;

    currentTurn = 1;

    shuffleDeck();

    await tick();
    await new Promise((r) => setTimeout(r, 100));

    isShuffling = false;
    
    // Ensure we start with Player 1's turn
    currentTurn = 1;
    
    // Force a re-render to update the card back
    await tick();
  }

  function revealNextCard() {
    if (isShuffling || activeCard !== null || shuffledDeck.length === 0 || gameOver) return;

    console.log('Drawing card. Deck before draw:', shuffledDeck.map(c => c.category));
    console.log('Selected challenge card:', selectedChallengeCard);
    
    if (selectedChallengeCard) {
      // Find next Action card in deck
      const actionIndex = shuffledDeck.findIndex(c => c.category === 'Action');
      console.log('Action index found:', actionIndex);
      if (actionIndex === -1) {
        // No action card left: put back challenge card to player's pile and draw next normally
        if (challengeCardPlayer === 1) {
          player1Cards = [selectedChallengeCard, ...player1Cards];
        } else if (challengeCardPlayer === 2) {
          player2Cards = [selectedChallengeCard, ...player2Cards];
        }
        selectedChallengeCard = null;
        challengeCardPlayer = null;

        activeCard = shuffledDeck.pop()!;
        console.log('No action found, drew:', activeCard);
      } else {
        activeCard = shuffledDeck.splice(actionIndex, 1)[0];
        console.log('Drew action card:', activeCard);
      }
    } else {
      activeCard = shuffledDeck.pop()!;
      console.log('Normal draw:', activeCard);
    }

    timerRunning = false;
    clearInterval(timerInterval);
    timer = 0;
    flying = false;
    flyingDirection = null;
    miniGameTurn = null;
    actionTimerUsed = false;
    goldenBoneActive = false;

    // Handle Challenge cards - show them for 3 seconds then move to reserve
    if (activeCard.category === 'Challenge') {
      setTimeout(async () => {
        if (activeCard && activeCard.category === 'Challenge') {
          // Add challenge card to current player's reserve
          if (currentTurn === 1) {
            player1Cards = [activeCard, ...player1Cards];
          } else if (currentTurn === 2) {
            player2Cards = [activeCard, ...player2Cards];
          } else if (currentTurn === 3) {
            player3Cards = [activeCard, ...player3Cards];
          }
          
          // Clear the active card and switch turn
          showChallengeInstruction(activeCard);
        }
      }, 3000);
    }
  }

  function getTimerDuration() {
    if (!activeCard) return 0;
    if (activeCard.category === 'Action') return 10;
    if (activeCard.category === 'Mini Game') return 30;
    return 0;
  }

  function getMiniGameAdvantageMessage(count: number): string {
    switch (count) {
      case 1:
        return "You have won the Golden Bone Advantage, a one-time higher value treat.";
      case 2:
        return "You have won the Rain Coat Advantage, with which you can block and eliminate a Challenge Card used against you.";
      case 3:
        return "You have won the Kitchen Thieve Advantage, which allows you to steal an Action Card from an opponent.";
      default:
        return "";
    }
  }

  function addMiniGameAdvantage(player: 1 | 2 | 3, count: number) {
    const message = getMiniGameAdvantageMessage(count);
    if (message) {
      const advantageCard = {
        id: `advantage-${player}-${count}-${Date.now()}`,
        message: message
      };
      
      if (player === 1) {
        player1AdvantageCards = [...player1AdvantageCards, advantageCard];
      } else if (player === 2) {
        player2AdvantageCards = [...player2AdvantageCards, advantageCard];
      } else if (player === 3) {
        player3AdvantageCards = [...player3AdvantageCards, advantageCard];
      }
    }
  }

  function useAdvantageCard(cardId: string, player: 1 | 2 | 3) {
    // Find the advantage card to determine its type
    const playerAdvantageCards = player === 1 ? player1AdvantageCards : 
                                 player === 2 ? player2AdvantageCards : 
                                 player3AdvantageCards;
    const advantageCard = playerAdvantageCards.find(card => card.id === cardId);
    
    if (advantageCard && advantageCard.message.includes("Golden Bone")) {
      goldenBoneActive = true;
    }
    
    if (advantageCard && advantageCard.message.includes("Rain Coat")) {
      // Remove the active challenge card if there is one
      if (selectedChallengeCard) {
        selectedChallengeCard = null;
        challengeCardPlayer = null;
      }
    }
    
    if (advantageCard && advantageCard.message.includes("Kitchen Thieve")) {
      kitchenThiefActive = true;
      // Steal the last action card from opponent
      // For 3-player game, steal from the next player in turn order
      const numPlayers = getNumPlayers();
      const opponent = numPlayers === 3 ? getNextTurn(player) : (player === 1 ? 2 : 1);
      
      let opponentCards, currentPlayerCards;
      
      if (opponent === 1) {
        opponentCards = player1Cards;
      } else if (opponent === 2) {
        opponentCards = player2Cards;
      } else {
        opponentCards = player3Cards;
      }
      
      if (player === 1) {
        currentPlayerCards = player1Cards;
      } else if (player === 2) {
        currentPlayerCards = player2Cards;
      } else {
        currentPlayerCards = player3Cards;
      }
      
      // Find the last action card in opponent's collection
      const lastActionIndex = opponentCards.findLastIndex(c => c.category === 'Action');
      if (lastActionIndex !== -1) {
        const stolenCard = opponentCards[lastActionIndex];
        // Remove from opponent
        opponentCards.splice(lastActionIndex, 1);
        // Add to current player
        currentPlayerCards.push(stolenCard);
        
        // Update the reactive variables
        if (opponent === 1 && player === 2) {
          player1Cards = [...opponentCards];
          player2Cards = [...currentPlayerCards];
        } else if (opponent === 2 && player === 1) {
          player1Cards = [...currentPlayerCards];
          player2Cards = [...opponentCards];
        } else if (opponent === 1 && player === 3) {
          player1Cards = [...opponentCards];
          player3Cards = [...currentPlayerCards];
        } else if (opponent === 3 && player === 1) {
          player1Cards = [...currentPlayerCards];
          player3Cards = [...opponentCards];
        } else if (opponent === 2 && player === 3) {
          player2Cards = [...opponentCards];
          player3Cards = [...currentPlayerCards];
        } else if (opponent === 3 && player === 2) {
          player2Cards = [...currentPlayerCards];
          player3Cards = [...opponentCards];
        }
      }
    }
    
    if (player === 1) {
      player1AdvantageCards = player1AdvantageCards.filter(card => card.id !== cardId);
    } else if (player === 2) {
      player2AdvantageCards = player2AdvantageCards.filter(card => card.id !== cardId);
    } else if (player === 3) {
      player3AdvantageCards = player3AdvantageCards.filter(card => card.id !== cardId);
    }
  }

  function dismissAdvantageOverlay() {
    showAdvantageOverlay = false;
    currentAdvantageMessage = '';
  }

  function canStartTimer() {
    if (!activeCard) return false;
    if (activeCard.category === 'Challenge') return false;
    if (activeCard.category === 'Action') return !actionTimerUsed && !timerRunning && !flying;
    if (activeCard.category === 'Mini Game') return !timerRunning && !flying;
    return false;
  }

  function startTimer() {
    if (!activeCard || timerRunning) return;

    timer = getTimerDuration();
    timerRunning = true;

    if (activeCard.category === 'Action') {
      actionTimerUsed = true;
    }

    if (activeCard.category === 'Mini Game' && miniGameTurn === null) {
      miniGameTurn = 1;
    }

    timerInterval = setInterval(() => {
      timer--;
      if (timer <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;

        if (activeCard?.category === 'Mini Game' && miniGameTurn === 1) {
          miniGameTurn = 2;
        } else {
          miniGameTurn = null;
        }
      }
    }, 1000);
  }

  async function checkForWinner() {
    const numPlayers = getNumPlayers();
    const winThreshold = numPlayers === 3 ? 4 : 6;
    
    const player1ActionCount = player1Cards.filter(c => c.category === 'Action').length;
    const player2ActionCount = player2Cards.filter(c => c.category === 'Action').length;
    
    if (player1ActionCount >= winThreshold) {
      winner = 1;
      gameOver = true;
    } else if (player2ActionCount >= winThreshold) {
      winner = 2;
      gameOver = true;
    } else if (numPlayers === 3 && player3Cards.filter(c => c.category === 'Action').length >= winThreshold) {
      winner = 3;
      gameOver = true;
    } else {
      // Check for tie
      const tieThreshold = winThreshold - 1;
      if (numPlayers === 2 && player1ActionCount === tieThreshold && player2ActionCount === tieThreshold) {
        showTieOverlay = true;
        return;
      }
    }
  }

  async function playerWins(player: 1 | 2 | 3) {
    if (!activeCard || gameOver) return;

    // Only mini-games use the playerWins function now
    if (activeCard.category === 'Mini Game') {
      globalMiniGameCount++;
      const advantageMessage = getMiniGameAdvantageMessage(globalMiniGameCount);
      showAdvantageOverlay = true;
      currentAdvantageMessage = advantageMessage;
      
      const advantageCard = {
        id: `advantage-${player}-${globalMiniGameCount}-${Date.now()}`,
        message: advantageMessage
      };
      
      if (player === 1) {
        player1AdvantageCards = [...player1AdvantageCards, advantageCard];
      } else if (player === 2) {
        player2AdvantageCards = [...player2AdvantageCards, advantageCard];
      } else if (player === 3) {
        player3AdvantageCards = [...player3AdvantageCards, advantageCard];
      }
    }

    flyingDirection = player === 1 ? 'left' : player === 2 ? 'right' : 'right';
    flying = true;

    await tick();

    setTimeout(async () => {
      flying = false;
      activeCard = null;
      timer = 0;
      timerRunning = false;
      flyingDirection = null;
      miniGameTurn = null;
      actionTimerUsed = false;
      
      // Switch turn after card is resolved
      currentTurn = getNextTurn(currentTurn);

      await checkForWinner();
    }, 800);
  }

  async function actionCompleted() {
    if (!activeCard || activeCard.category !== 'Action' || gameOver) return;

    // Action card goes to current player
    if (currentTurn === 1) {
      player1Cards = [activeCard, ...player1Cards];
    } else if (currentTurn === 2) {
      player2Cards = [activeCard, ...player2Cards];
    } else if (currentTurn === 3) {
      player3Cards = [activeCard, ...player3Cards];
    }

    // If there was a challenge card active, it disappears
    selectedChallengeCard = null;
    challengeCardPlayer = null;

    flyingDirection = currentTurn === 1 ? 'left' : currentTurn === 2 ? 'right' : 'right';
    flying = true;

    await tick();

    setTimeout(async () => {
      flying = false;
      activeCard = null;
      goldenBoneActive = false; // Reset after action is completed
      kitchenThiefActive = false;
      timer = 0;
      timerRunning = false;
      flyingDirection = null;
      miniGameTurn = null;
      actionTimerUsed = false;
      
      // Switch turn after card is resolved
      currentTurn = getNextTurn(currentTurn);

      await checkForWinner();
    }, 800);
  }

  async function actionCardFailed() {
    if (!activeCard || activeCard.category !== 'Action' || gameOver) return;

    // Put the action card at the bottom of the deck
    shuffledDeck = [activeCard, ...shuffledDeck];

    // If there was a challenge card active, put it back in the player's hand
    if (selectedChallengeCard) {
      // Challenge card should be discarded regardless of action outcome
      selectedChallengeCard = null;
      challengeCardPlayer = null;
    }

    // Clear the active card and reset state
    activeCard = null;
    timer = 0;
    timerRunning = false;
    clearInterval(timerInterval);
    flyingDirection = null;
    miniGameTurn = null;
    actionTimerUsed = false;
    
    // Switch turn after failed action
    currentTurn = getNextTurn(currentTurn);

    await tick();
  }
  function startGame() {
    if (currentStep === 2) {
      if (!player1Name.trim() || !player2Name.trim() || !dogName.trim()) {
        alert('Please enter names for Player 1, Player 2, and your dog to continue.');
        return;
      }
    }

    if (currentStep < totalSteps) {
      currentStep++;
    } else {
      showInstructions = false;
      currentStep = 1; // Reset for next time
      // Only auto-start the game if it hasn't been started yet
      if (shuffledDeck.length === 0 && player1Cards.length === 0 && player2Cards.length === 0) {
        animateShuffle();
      }
    }
  }

  function skipInstructions() {
    showInstructions = false;
    currentStep = 1; // Reset for next time
    showTieOverlay = false;
    // Only auto-start the game if it hasn't been started yet
    if (shuffledDeck.length === 0 && player1Cards.length === 0 && player2Cards.length === 0) {
      animateShuffle();
    }
  }

  function getCardBackType() {
    console.log('Getting card back type...');
    console.log('Deck length:', shuffledDeck.length);
    console.log('Selected challenge card:', selectedChallengeCard);
    
    if (shuffledDeck.length === 0) {
      console.log('Deck empty, returning action');
      return null; // Don't show card back if deck is empty
    }
    
    let nextCard;
    
    if (selectedChallengeCard) {
      // Find next Action card in deck
      const actionIndex = shuffledDeck.findIndex(c => c.category === 'Action');
      if (actionIndex === -1) {
        // No action card left, show the last card in deck
        nextCard = shuffledDeck[shuffledDeck.length - 1];
        console.log('No action card found, next card:', nextCard);
      } else {
        console.log('Challenge active, forcing action card');
        return 'action';
      }
    } else {
      nextCard = shuffledDeck[shuffledDeck.length - 1];
      console.log('Normal draw, next card:', nextCard);
    }
    
    const cardType = nextCard?.category?.toLowerCase().replace(' ', '-') || 'action';
    console.log('Returning card type:', cardType);
    return cardType;
  }

  function goBack() {
    if (currentStep > 1) {
      currentStep--;
    }
  }

  function getAdvantageCardId(message: string): number {
    if (message.includes("Golden Bone")) {
      return 27;
    } else if (message.includes("Rain Coat")) {
      return 28;
    } else if (message.includes("Kitchen Thieve")) {
      return 29;
    }
    return 27; // Default fallback
  }
</script>

<style>
  /* Same styles as before, plus container for active cards side-by-side */
  .deck-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 480px;
  }

  button {
    cursor: pointer;
    padding: 0.5rem 1rem;
    font-size: 1rem;
    border-radius: 6px;
    border: 2px solid #333;
    background: #fafafa;
    transition: background 0.2s ease;
    color: black;
  }
  button:hover:not(:disabled) {
    background: #eee;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .deck-container {
    cursor: pointer;
    user-select: none;
  }

  .card {
    width: 140px;
    height: 195px;
    border: 2px solid #333;
    border-radius: 12px;
    background-color: transparent;
    overflow: hidden;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
    position: relative;
    user-select: none;
    transition: transform 0.3s ease-in-out;
  }

  .card.open {
    box-shadow: 0 0 15px rgba(0,0,0,0.4);
  }

  .card-back {
    width: 70px;
    height: 90px;
    border-radius: 12px;
    border: 2px solid #000;
    box-shadow: 0 0 8px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .card-back-logo {
    width: 60px;
    height: 60px;
    object-fit: contain;
    z-index: 2;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }

  .back-action {
    background-color: #fff;
    background-image: repeating-linear-gradient(45deg, #ddd 0 10px, #eee 10px 20px);
    border-color: #bbb;
  }

  .back-challenge {
    background-color: #111;
    background-image: repeating-linear-gradient(45deg, #333 0 10px, #222 10px 20px);
    border-color: #000;
  }

  .back-mini-game {
    background-color: #444; background-image: repeating-linear-gradient(
      45deg,
      red 0 10px,
      green 10px 20px,
      yellow 20px 30px,
      blue 30px 40px
    );
    border-color: #000;
  }
  
  .back-mini-game {
    background: linear-gradient(45deg, 
      #ff6b6b 0%, #4ecdc4 25%, #45b7d1 50%, #96ceb4 75%, #ffeaa7 100%);
    background-size: 400% 400%;
    animation: gradient-shift 3s ease infinite;
  }

  .drawn-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .small-card {
    width: 90px;
    height: 125px;
    overflow: hidden;
  }

  .active-card-container {
    position: relative;
    min-height: 240px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .cards-row {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }
  .flying-left {
    animation: fly-left 0.8s forwards cubic-bezier(0.4, 0, 0.2, 1);
  }
  .flying-right {
    animation: fly-right 0.8s forwards cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes fly-left {
    0% { transform: translateX(0) translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateX(-300px) translateY(-100px) rotate(-30deg); opacity: 0; }
  }
  @keyframes fly-right {
    0% { transform: translateX(0) translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateX(300px) translateY(-100px) rotate(30deg); opacity: 0; }
  }

  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .advantage-message {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ffd700, #ffed4e);
    color: #333;
    padding: 2rem;
    border-radius: 15px;
    border: 3px solid #ff6b35;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
    font-size: 1.2rem;
    font-weight: bold;
    text-align: center;
    z-index: 8888;
    max-width: 1400px;
  }

  @keyframes advantage-glow {
    0% {
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
      transform: translate(-50%, -50%) scale(1);
    }
    100% {
      box-shadow: 0 0 50px rgba(255, 107, 53, 0.9);
      transform: translate(-50%, -50%) scale(1.02);
    }
  }

  .action-tooltip {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #4a90e2, #357abd);
    color: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid #2c5aa0;
    box-shadow: 0 0 25px rgba(74, 144, 226, 0.6);
    font-size: 1.1rem;
    text-align: center;
    z-index: 8000;
    max-width: 400px;
    line-height: 1.4;
  }

  .mini-game-explanation {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #96ceb4, #45b7d1);
    color: white;
    padding: 2rem;
    border-radius: 15px;
    border: 3px solid #4ecdc4;
    box-shadow: 0 0 30px rgba(78, 205, 196, 0.6);
    font-size: 1rem;
    text-align: left;
    z-index: 8000;
    max-width: 800px;
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    line-height: 1.5;
    white-space: pre-line;
  }

  .mini-game-explanation h4 {
    margin: 0 0 1rem 0;
    font-size: 1.4rem;
    color: #ffd700;
    text-align: center;
  }

  .action-tooltip h4 {
    margin: 0 0 1rem 0;
    font-size: 1.3rem;
    color: #ffd700;
  }

  .instructions-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: .5rem;
    box-sizing: border-box;
    animation: instructions-fade-in 1s ease-out;
   overflow-y: auto;
  }

  .instructions-content {
    max-width: 600px;
    text-align: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 2rem;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: instructions-slide-up 1.2s ease-out 0.3s both;
   width: 80%;
   max-height: calc(100vh - 4rem);
   overflow-y: auto;
   display: flex;
   flex-direction: column;
  }

  .overlay-logo {
  padding: .3rem;
    height: 80px;
    object-fit: contain;
    margin: 0 auto 1.5rem auto;
    display: block;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
   flex-shrink: 0;
  }

  .instructions-title {
    font-size: 2.5rem;
    font-weight: bold;
    text-align: center;
    margin-bottom: 2rem;
    color: white;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
   flex-shrink: 0;
  }

  .instructions-section {
    margin-bottom: 1.5rem;
    animation: section-fade-in 0.8s ease-out var(--delay) both;
   flex-grow: 1;
  }

  .instructions-section h3 {
    font-size: 1.4rem;
    color: white;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .instructions-section p {
    margin: 0.5rem 0;
    line-height: 1.6;
    font-size: 1.1rem;
    color: white;
  }

 .instructions-footer {
   flex-shrink: 0;
 }

  @media (max-width: 800px) {
    .mini-game-content {
      width: 95%;
      max-width: 95vw;
      padding: 15px;
    }
  }
  .start-button {
    background: linear-gradient(45deg, #ff6b35, #ffd700);
    color: #333;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.3rem;
    font-weight: bold;
    border-radius: 50px;
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    animation: button-bounce 2s ease-in-out infinite;
  }

  .step-indicator {
    text-align: center;
    margin-bottom: 1rem;
    color: white;
    font-size: 1.1rem;
  }

  .step-dots {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
   margin-bottom: 1rem;
  }

  .step-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transition: background 0.3s ease;
  }

  .step-dot.active {
    background: white;
  }

  .start-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
  }

  .skip-button {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 25px;
    cursor: pointer;
    margin-left: 1rem;
    transition: all 0.3s ease;
  }

  .skip-button:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.05);
  }

  .golden-bone {
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 60px;
    z-index: 10;
    animation: golden-glow 2s ease-in-out infinite alternate;
  }

  @keyframes golden-glow {
    0% {
      filter: drop-shadow(0 0 10px #ffd700) drop-shadow(0 0 20px #ffd700) brightness(1);
      transform: translateX(-50%) scale(1);
    }
    100% {
      filter: drop-shadow(0 0 20px #ffd700) drop-shadow(0 0 30px #ffd700) brightness(1.2);
      transform: translateX(-50%) scale(1.1);
    }
  }

  @keyframes instructions-fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes instructions-slide-up {
    0% { 
      opacity: 0;
      transform: translateY(50px);
    }
    100% { 
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes section-fade-in {
    0% { 
      opacity: 0;
      transform: translateX(-20px);
    }
    100% { 
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes button-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  .edge-action {
    border-color: #000 !important;
    border-width: 5px !important;
  }

  .edge-challenge {
    border-color: #fff !important;
    border-width: 5px !important;
  }

  .edge-mini-game {
    border: 5px solid transparent !important;
    background: linear-gradient(white, white) padding-box, 
                linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7) border-box !important;
  }

  .edge-advantage {
    border: 2.5px solid transparent !important;
    background: linear-gradient(135deg, #ffd700, #ffed4e) padding-box, 
                linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7) border-box !important;
  }


  .winner-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #ff6b35 0%, #ff4757 100%);
    color: white;
    font-size: 3rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }

  .turn-indicator {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 1rem;
    text-align: center;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    color: white;
  }

   .turn-indicator.player1 {
    text-shadow: 
      0 -2px 4px #22c55e,
      0 2px 4px #22c55e,
      0 2px 4px rgba(0,0,0,0.3);
  }

  .turn-indicator.player2 {
    text-shadow: 
     0 -2px 4px #1d4ed8,
     0 2px 4px #1d4ed8,
      0 2px 4px rgba(0,0,0,0.3);
  }

  .turn-indicator.player3 {
    text-shadow: 
      0 -2px 4px #dc2626,
      0 2px 4px #dc2626,
      0 2px 4px rgba(0,0,0,0.3);
  }

  .top-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .tiny-card {
    width: 70px;
    height: 95px;
    border: 2px solid #333;
    border-radius: 12px;
    background: #fefefe;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: black;
    font-size: 0.7rem;
    padding: 0.25rem;
    overflow: hidden;
  }

  .review-button {
    position: fixed;
    top: .25rem;
    right: .25rem;
    padding: 0.13rem 0.25rem;
    font-size: 0.6rem;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    z-index: 100;
    transition: background 0.2s ease;
  }

  .review-button:hover {
    background: rgba(255, 255, 255, 1);
  }

  @media (max-width: 800px) {
    .card { width: 120px; height: 150px; font-size: 1rem; }
    .small-card { width: 75px; height: 100px; }
    .tiny-card { width: 55px; height: 70px; font-size: 0.6rem; }
    .deck-area { min-height: 380px; }
    
    .advantage-message {
      max-width: 90vw;
      padding: 1.5rem;
      font-size: 1rem;
    }
    
    .mini-game-explanation {
      max-width: 90vw;
      padding: 1.5rem;
      font-size: 0.9rem;
    }
    
    .active-card-container {
      min-height: 200px;
    }
    
    .active-card-container + div {
      margin-top: 0.05rem;
    }

    .instructions-overlay {
      padding: 1rem;
    }

    .instructions-content {
      max-width: 95vw;
      padding: 1.5rem;
      margin: 0;
    }

    .overlay-logo {
      width: 60px;
      height: 60px;
      margin-bottom: 1rem;
    }

    .instructions-title {
      font-size: 2rem;
      margin-bottom: 1.5rem;
    }

    .instructions-section {
      margin-bottom: 1rem;
    }

    .instructions-section h3 {
      font-size: 1.2rem;
    }

    .instructions-section p {
      font-size: 1rem;
      line-height: 1.5;
    }

    .start-button {
      padding: 0.75rem 1.5rem;
      font-size: 1.1rem;
    }

    .skip-button {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      margin-left: 0.5rem;
      margin-top: 0.5rem;
    }
  }

</style>

{#if showInstructions}
  <div class="instructions-overlay">
    <div class="instructions-content">
      <img src="/BalanceDog Logo.png" alt="BalanceDog Logo" class="overlay-logo" />
      <div style="text-align: center; font-size: 0.9rem; font-weight: bold; color: white; margin-bottom: 1rem; margin-top: -1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        Balancedog
      </div>
      
      {#if currentStep === 1}
        <h1 class="instructions-title">Ready, Sit, Play!</h1>
        <div class="instructions-section" style="--delay: 0.5s">
          <p>Welcome to Ready, Sit, Play!</p>
          <p>The tail-wagging card game where you and your dog team up for treats, challenges, and non-stop fun!</p>
        </div>
      {/if}

      {#if currentStep === 2}
        <h1 class="instructions-title">Player's Setup</h1>
        <div class="instructions-section" style="--delay: 0.5s">
          <p>Lets get you and your furry friend ready to play!</p>
          <div style="margin-top: 1rem;">
            <label for="player1Name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Human Player 1:</label>
            <input type="text" id="player1Name" bind:value={player1Name} placeholder="Enter Player 1's name" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 1rem; box-sizing: border-box; color: white; background-color: #333;" />

            <label for="player2Name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Human Player 2:</label>
            <input type="text" id="player2Name" bind:value={player2Name} placeholder="Enter Player 2's name" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 1rem; box-sizing: border-box; color: white; background-color: #333;" />

            <label for="player3Name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Human Player 3 (Optional):</label>
            <input type="text" id="player3Name" bind:value={player3Name} placeholder="Enter Player 3's name (optional)" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 1rem; box-sizing: border-box; color: white; background-color: #333;" />

            <label for="dogName" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Canine Player:</label>
            <input type="text" id="dogName" bind:value={dogName} placeholder="Enter your dog's name" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 1rem; box-sizing: border-box; color: white; background-color: #333;" />

            <label for="email" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Email (Optional):</label>
            <input type="email" id="email" bind:value={email} placeholder="Enter your email" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 1rem; box-sizing: border-box; color: white; background-color: #333;" />
          </div>
        </div>
      {/if}

      {#if currentStep === 3}
        <h1 class="instructions-title">How to Play</h1>
        <div class="instructions-section" style="--delay: 0.5s">
          <p>In order to win, be the first player to collect {player3Name.trim() ? 'four' : 'six'} Action Cards by successfully completing dog training tasks.</p>
          <p>Your turn begins by picking up the card facing down at the top of the deck.</p>
        </div>
      {/if}

      {#if currentStep === 4}
        <h1 class="instructions-title">Action Cards</h1>
        <div class="instructions-section" style="--delay: 0.5s">
          <p><strong>Training commands to perform with your dog.</strong></p>
          <div class="card small-card edge-action" style="margin: 1rem auto;">
            <img src="/card-images/6.png" class="card-image" />
          </div>
          <p>Guide {dogName || 'your dog'} to complete the action shown.</p>
          <p><strong>Success:</strong> Reward {dogName || 'your dog'} with a treat and keep the card.</p>
          <p><strong>Fail:</strong> The card is placed at the bottom of the deck.</p>
          <p>Your turn ends.</p>
        </div>
      {/if}

      {#if currentStep === 5}
        <h1 class="instructions-title">Challenge Cards</h1>
        <div class="instructions-section" style="--delay: 0.5s">
           <p><strong>Make Action Cards harder for opponents.</strong></p>
          <div class="card small-card edge-challenge" style="margin: 1rem auto;">
            <img src="/card-images/11.png" class="card-image" />
          </div>
           <div style="text-align: center; font-size: 0.7rem; font-weight: bold; color: white; margin-bottom: 1rem; margin-top: -1rem;">
       "Toss a ball to create a distraction"
      </div>
          <p>Keep it until the right moment.</p>
          <p>Your turn ends.</p>
          <p>Play Challenge Cards from your reserve to make opponents' turns more difficult.</p>
        </div>
      {/if}

      {#if currentStep === 6}
        <h1 class="instructions-title">Mini-Game Cards</h1>
        <div class="instructions-section" style="--delay: 0.5s">
          <p><strong>Competitive challenges that earn special advantages.</strong></p>
           <div class="card small-card edge-mini-game" style="margin: 1rem auto;">
            <img src="/card-images/19.png" class="card-image" />
          </div>
          <p>Play the Mini-Game drawn. The winner earns a special advantage.</p>
          <p>Keep it until the right moment.</p>
          <p>Your turn ends.</p>
          <p>From your reserve, tap on it to trigger its effect.</p>
        </div>
      {/if}

         {#if currentStep === 7}
        <h1 class="instructions-title">Mini-Game Advantages</h1>
        <div class="instructions-section" style="--delay: 0.5s">
           <div class="card tiny-card edge-mini-game" style="margin: 1rem auto;">
            <img src="/card-images/27.png" class="card-image" />
          </div>
          <p><strong>Awarded to the first Mini-Game winner</strong></p>
          <p>A one-time higher value treat.</p>
          <div class="card tiny-card edge-mini-game" style="margin: 1rem auto;">
            <img src="/card-images/28.png" class="card-image" />
          </div>
          <p><strong>Awarded to the second Mini-Game winner</strong></p>
          <p>With which you can block and eliminate a Challenge Card used against you.</p>
          <div class="card tiny-card edge-mini-game" style="margin: 1rem auto;">
            <img src="/card-images/29.png" class="card-image" />
          </div>
          <p><strong>Awarded to the third Mini-Game winner</strong></p>
          <p>Which allows you to steal an Action Card from an opponent.</p>
        </div>
      {/if}
      
      {#if currentStep === 8}
        <h1 class="instructions-title">You're All Set!</h1>
        <div class="instructions-section" style="--delay: 0.5s">
          <p>Remember: The goal is to have fun training with your dog while playing a competitive game.</p>
          <p>Good luck, and may the best trainer win!</p>
          </div>
          <div style="text-align: center; font-size: 3rem; font-weight: bold; color: white; margin-bottom: 1rem; margin-top: -1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        Ready, Sit, Play!
      </div>
         <div style="text-align: center; font-size: 0.7rem; color: white; margin-bottom: 1rem; margin-top: -1rem;">
        Need Help? Use the "Review Instructions" button anytime during the game.
      </div> 
        {/if}
        
      <div class="step-dots">
        {#each Array(totalSteps) as _, i}
          <div class="step-dot {currentStep === i + 1 ? 'active' : ''}"></div>
        {/each}
      </div>

     <div class="instructions-footer" style="text-align: center;">
        {#if currentStep > 1}
          <button class="skip-button" on:click={goBack} style="margin-right: 1rem;">
            Back
          </button>
        {/if}
        {#if currentStep === 2}
          <button class="start-button" on:click={startGame}>
            Next
          </button>
        {:else}
          <button class="start-button" on:click={startGame}>
            {currentStep < totalSteps ? 'Next' : 'Start Playing!'}
          </button>
        {/if}
        <button class="skip-button" on:click={skipInstructions}>
          Skip Instructions
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showTieOverlay}
  <div class="instructions-overlay">
    <div class="instructions-content">
      <img src="/BalanceDog Logo.png" alt="BalanceDog Logo" class="overlay-logo" />
      Balancedog
      <div style="text-align: center; font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 1.5rem; text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);">
        Ready, Sit, Play!
      </div> <h1 class="instructions-title">It's a Tie!</h1>
      <div class="instructions-section" style="--delay: 0.5s">
        <p>Congratulations! You both are amazing at communicating with your dog!</p>
        <p>To settle this game and declare a winner, make sure to be standing at the opposite sides of the room with {dogName || 'your dog'} in the middle, call their name at the same time.</p>
      </div>
      
      <div style="text-align: center;">
        <button class="start-button" on:click={animateShuffle}>
          Restart Game
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="deck-area">
  <button class="review-button" on:click={reviewInstructions} disabled={isShuffling || gameOver}>
    Review Instructions
  </button>

  <!-- Turn indicator above the deck -->
  {#if !gameOver && !isShuffling}
    <div class="turn-indicator player{currentTurn}">
      {#if currentTurn === 1}
        {player1Name || 'Player 1'}'s turn
      {:else if currentTurn === 2}
        {player2Name || 'Player 2'}'s turn
      {:else}
        {player3Name || 'Player 3'}'s turn
      {/if}
    </div>
  {/if}

  <div
    class="deck-container"
    on:click={revealNextCard}
    title="Click to draw the next card"
    style="pointer-events: {isShuffling || activeCard !== null || gameOver ? 'none' : 'auto'}"
  >
    {#if !activeCard}
      {#if shuffledDeck.length > 0}
        <div class="card card-back back-{getCardBackType()}">
          <img src="/BalanceDog Logo.png" alt="BalanceDog Logo" class="card-back-logo" />
        </div>
      {:else}
        <div class="card card-back back-action">
          <img src="/BalanceDog Logo.png" alt="BalanceDog Logo" class="card-back-logo" />
        </div>
      {/if}
    {/if}
  </div>

  {#if activeCard}
    <div class="active-card-container">
      <!-- Show the active card -->
      <div class="cards-row">
        <div class="card open edge-{activeCard.category.toLowerCase().replace(' ', '-')}" 
             class:flying-left={flying && flyingDirection === 'left'}
             class:flying-right={flying && flyingDirection === 'right'}>
          {#if goldenBoneActive && activeCard.category === 'Action'}
            <div class="golden-bone">🦴</div>
          {/if}
          <img src="/card-images/{activeCard.id}.png" alt="Card {activeCard.id}" class="card-image" />
        </div>

        <!-- If challenge card active, show it side by side -->
        {#if selectedChallengeCard}
          <div class="card open edge-challenge">
          <img src="/card-images/{selectedChallengeCard.id}.png" alt="Card {selectedChallengeCard.id}" class="card-image" />
            <div style="font-size: 0.8rem; color: #555; margin-top: 0.25rem;">
              (Challenge Card Active)
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Timer controls below the cards -->
  {#if activeCard}
    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin-top: 0.1rem;">
      {#if canStartTimer()}
        <button on:click={startTimer}>
          Start Timer ({getTimerDuration()}s)
        </button>
      {/if}
      
      {#if activeCard.category === 'Action'}
        <button on:click={() => showActionInstruction(activeCard)} style="font-size: 0.9rem; padding: 0.25rem 0.5rem;">
          Show Instructions
        </button>
        <button on:click={actionCompleted} disabled={flying || gameOver} style="font-size: 0.9rem; padding: 0.25rem 0.5rem; background: #22c55e; color: white;">
          Action Completed
        </button>
        <button on:click={actionCardFailed} disabled={flying || gameOver} style="font-size: 0.9rem; padding: 0.25rem 0.5rem; background: #ff6b6b; color: white;">
          Action Failed
        </button>
      {/if}
      
      {#if selectedChallengeCard}
        <button on:click={() => showChallengeInstruction(selectedChallengeCard)} style="font-size: 0.9rem; padding: 0.25rem 0.5rem;">
          Show Challenge Instructions
        </button>
      {/if}
      
      {#if activeCard.category === 'Mini Game'}
        <button on:click={() => showMiniGameInstruction(activeCard)} style="font-size: 0.9rem; padding: 0.25rem 0.5rem;">
          Show Mini Game Rules
        </button>
      {/if}

      {#if timerRunning}
        <div style="font-weight: bold; font-size: 1.2rem; color: #ff6b35;">
          Timer: {timer}s
        </div>
      {/if}
    </div>
  {/if}
  {/if}

  <div style="display:flex; justify-content: space-around; width: 100%; margin-top: 1rem;">
    <!-- Player 1 Cards -->
    <div>
      {#if activeCard && activeCard.category === 'Mini Game'}
        <button on:click={() => playerWins(1)} disabled={flying || gameOver} style="margin-bottom: 0.5rem;">
          {player1Name || 'Player 1'} Wins This Round
        </button>
      {/if}

      <h3>{player1Name || 'Player 1'}'s Cards ({player1Cards.filter(c => c.category === 'Action').length})</h3>

      <!-- Top row: Challenge and Mini Game cards (non-action) with click for Challenge -->
      <div class="top-row">
        {#each player1Cards.filter(c => c.category === 'Challenge' || c.category === 'Mini Game') as card (card.id)}
          <div
            class="card tiny-card edge-{card.category.toLowerCase()}"
            on:click={() => {
              if (card.category === 'Challenge' && !selectedChallengeCard && !gameOver) {
                activateChallengeCard(card, 1);
              }
            }}
            style="cursor: {card.category === 'Challenge' && !selectedChallengeCard && !gameOver ? 'pointer' : 'default'}"
            title={card.label}
          >
            <img src="/card-images/{card.id}.png" alt={card.label} class="card-image" />
          </div>
        {/each}
        
        <!-- Advantage cards -->
        {#each player1AdvantageCards as advantageCard (advantageCard.id)}
          <div
            class="card tiny-card edge-advantage"
            on:click={() => {
              if (currentTurn === 1) {
                useAdvantageCard(advantageCard.id, 1);
              }
            }}
            style="cursor: {currentTurn === 1 ? 'pointer' : 'default'}; color: #333; opacity: {currentTurn === 1 ? 1 : 0.4};"
            title={advantageCard.message}
          >
            <img src="/card-images/{getAdvantageCardId(advantageCard.message)}.png" alt="Advantage Card" class="card-image" />
          </div>
        {/each}
      </div>

      <!-- Bottom row: Action cards -->
      <div class="drawn-cards" style="margin-top: 0.25rem;">
        {#each player1Cards.filter(c => c.category === 'Action') as card (card.id)}
          <div class="card small-card edge-action">
            <img src="/card-images/{card.id}.png" alt={card.label} class="card-image" />
          </div>
        {/each}
      </div>
    </div>

    <!-- Player 2 Cards -->
    <div>
      {#if activeCard && activeCard.category === 'Mini Game'}
        <button on:click={() => playerWins(2)} disabled={flying || gameOver} style="margin-bottom: 0.5rem;">
          {player2Name || 'Player 2'} Wins This Round
        </button>
      {/if}

      <h3>{player2Name || 'Player 2'}'s Cards ({player2Cards.filter(c => c.category === 'Action').length})</h3>

      <!-- Top row: Challenge and Mini Game cards (non-action) with click for Challenge -->
      <div class="top-row">
        {#each player2Cards.filter(c => c.category === 'Challenge' || c.category === 'Mini Game') as card (card.id)}
          <div
            class="card tiny-card edge-{card.category.toLowerCase()}"
            on:click={() => {
              if (card.category === 'Challenge' && !selectedChallengeCard && !gameOver) {
                activateChallengeCard(card, 2);
              }
            }}
            style="cursor: {card.category === 'Challenge' && !selectedChallengeCard && !gameOver ? 'pointer' : 'default'}"
            title={card.label}
          >
            <img src="/card-images/{card.id}.png" alt={card.label} class="card-image" />
          </div>
        {/each}
        
        <!-- Advantage cards -->
        {#each player2AdvantageCards as advantageCard (advantageCard.id)}
          <div
            class="card tiny-card edge-advantage"
            on:click={() => {
              if (currentTurn === 2) {
                useAdvantageCard(advantageCard.id, 2);
              }
            }}
            style="cursor: {currentTurn === 2 ? 'pointer' : 'default'}; color: #333; opacity: {currentTurn === 2 ? 1 : 0.4};"
            title={advantageCard.message}
          >
            <img src="/card-images/{getAdvantageCardId(advantageCard.message)}.png" alt="Advantage Card" class="card-image" />
          </div>
        {/each}
      </div>

      <!-- Bottom row: Action cards -->
      <div class="drawn-cards" style="margin-top: 0.25rem;">
        {#each player2Cards.filter(c => c.category === 'Action') as card (card.id)}
          <div class="card small-card edge-action">
            <img src="/card-images/{card.id}.png" alt={card.label} class="card-image" />
          </div>
        {/each}
      </div>
    </div>

    <!-- Player 3 Cards (only show if player3Name exists) -->
    {#if player3Name}
      <div>
        {#if activeCard && activeCard.category === 'Mini Game'}
          <button on:click={() => playerWins(3)} disabled={flying || gameOver} style="margin-bottom: 0.5rem;">
            {player3Name} Wins This Round
          </button>
        {/if}

        <h3>{player3Name}'s Cards ({player3Cards.filter(c => c.category === 'Action').length})</h3>

        <!-- Top row: Challenge and Mini Game cards (non-action) with click for Challenge -->
        <div class="top-row">
          {#each player3Cards.filter(c => c.category === 'Challenge' || c.category === 'Mini Game') as card (card.id)}
            <div
              class="card tiny-card edge-{card.category.toLowerCase()}"
              on:click={() => {
                if (card.category === 'Challenge' && !selectedChallengeCard && !gameOver) {
                  activateChallengeCard(card, 3);
                }
              }}
              style="cursor: {card.category === 'Challenge' && !selectedChallengeCard && !gameOver ? 'pointer' : 'default'}"
              title={card.label}
            >
              <img src="/card-images/{card.id}.png" alt={card.label} class="card-image" />
            </div>
          {/each}
          
          <!-- Advantage cards -->
          {#each player3AdvantageCards as advantageCard (advantageCard.id)}
            <div
              class="card tiny-card edge-advantage"
              on:click={() => {
                if (currentTurn === 3) {
                  useAdvantageCard(advantageCard.id, 3);
                }
              }}
              style="cursor: {currentTurn === 3 ? 'pointer' : 'default'}; color: #333; opacity: {currentTurn === 3 ? 1 : 0.4};"
              title={advantageCard.message}
            >
              <img src="/card-images/{getAdvantageCardId(advantageCard.message)}.png" alt="Advantage Card" class="card-image" />
            </div>
          {/each}
        </div>

        <!-- Bottom row: Action cards -->
        <div class="drawn-cards" style="margin-top: 0.25rem;">
          {#each player3Cards.filter(c => c.category === 'Action') as card (card.id)}
            <div class="card small-card edge-action">
              <img src="/card-images/{card.id}.png" alt={card.label} class="card-image" />
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

   {#if gameOver && winner !== null}
    <div
      class="winner-overlay"
      on:click={animateShuffle}
      title="Tap to restart"
    >
      <div class="instructions-content">
        <img src="/BalanceDog Logo.png" alt="BalanceDog Logo" class="overlay-logo" />
        <div style="text-align: center; font-size: 0.9rem; font-weight: bold; color: white; margin-bottom: 1rem; margin-top: -1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          Balancedog
        </div>
         <div style="text-align: center; font-size: 2.5rem; font-weight: bold; color: white; margin-bottom: 1.5rem; text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);">
        Ready, Sit, Play!
      </div>
        <h1 class="instructions-title">🎉 {#if winner === 1}{player1Name || 'Player 1'}{:else if winner === 2}{player2Name || 'Player 2'}{:else}{player3Name || 'Player 3'}{/if} Wins 🎉</h1>
        <div class="instructions-section" style="--delay: 0.5s">
          <p>Congratulations on the amazing teamwork with {dogName || 'your dog'}!</p>
          <p>Tap anywhere to play again.</p>
        </div>
      </div>
    </div>
  {/if}
</div>

{#if showMiniGameExplanation}
<div class="mini-game-explanation" on:click={hideMiniGameInstruction}>
  <h4>{activeCard?.label} Rules</h4>
  <div>{currentMiniGameExplanation}</div>
  <button 
    on:click={hideMiniGameInstruction} 
    style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ffd700; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; display: block; margin-left: auto; margin-right: auto;"
  >
    Got it!
  </button>
</div>
{/if}

{#if showAdvantageOverlay}
  <div class="advantage-message">
    <div>{currentAdvantageMessage}</div>
    <button on:click={dismissAdvantageOverlay} style="margin-top: 1rem; padding: 0.75rem 1.5rem; font-size: 1rem; background: #ff6b35; color: white; border: none; border-radius: 8px; cursor: pointer;">
      Tap to Continue
    </button>
  </div>
{/if}

{#if showActionTooltip && actionTooltipCard}
  <div class="action-tooltip" on:click={hideActionInstruction}>
    <h4>{actionTooltipCard.label}</h4>
    <p>{actionTooltipContent}</p>
    <button 
      on:click={hideActionInstruction} 
      style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ffd700; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;"
    >
      Got it!
    </button>
  </div>
{/if}