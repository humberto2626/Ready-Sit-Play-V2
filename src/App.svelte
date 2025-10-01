<script lang="ts">
  import { tick } from 'svelte';
  import VideoRecorder from './lib/VideoRecorder.svelte';
  import GameReview from './lib/GameReview.svelte';
  import MenuOverlay from './lib/MenuOverlay.svelte';

  let showVideoRecorder = false;

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

  // State history for undo functionality (limited to last 3 steps)
  let stateHistory: any[] = [];

  // Mini-game explanation overlay state
  let showMiniGameExplanation = false;
  let currentMiniGameExplanation = '';

  // Global 20-minute game timer
  let globalTimer = 1200; // 20 minutes in seconds
  let globalTimerRunning = false;
  let globalTimerInterval: any = null;
  let globalTimerStarted = false;
  let isTimerWarning = false; // Warning state for final 5 minutes (300 seconds)

  // Action card instructions tooltip
  let showActionTooltip = false;
  let actionTooltipContent = '';
  let actionTooltipCard: Card | null = null;
  let isReviewingInstructions = false;

  // Track if instructions are being reviewed (vs automatic game flow)
  const actionInstructions: Record<string, string> = {
   'Recall': `Call the canine player from as far as possible into a treat in your extended hand.`,
    'Sit': `With a treat in your hand, grace just above the canine player nose until they sit.`,
    'Greet': `Present your fist with a treat inside, if the canine player sniffs, licks or nudges your hand, reward their good manners.`,
    'Heel': `With a treat in your hand, guide the canine player to walk right next to you for at least five steps.`,
    'Focus': `Holding a treat between your index finger and thumb, grace just above the canine player nose and then place it between your eyebrows, count out loud for at least three seconds.`,
    'Paw': `With a treat in your hand, grace and hold just below the ear of the canine player, wait for them to use their paw to push off your hand.`,
    'Down': `With a treat in your hand, grace the canine player chin and chest as
  } you place your hand flat on the ground in between their front legs, waiting for them to lay down.`,
    'Back': `With the canine player sitting, hold a treat in your hand just above the top of the canine player head, putting your foot in between their front paws, move your hand towards their tail, waiting for them to move back.`,
    'Stay': `With the canine player sitting or laying down, show the palm of your hand and slowly take at least three steps backwards, return and reward the canine player self-control.`,
    'Place': `With a towel on the floor, guide the canine player near it and drop a treat in the towel, the moment they step on it, praise and reward them again.`

  };

  const challengeInstructions: Record<string, string> = {
    'Squirrel': 'Toss a ball to create a distraction',
    'Do it Twice': 'Self explanatory',
    'Cat Ate Your Tongue': 'Guide the canine player to perform the Action Card without saying a word',
    'Pirate Leg': 'Guide the canine player to perform the Action Card while standing only on one leg',
    'Hands Behind Your Back': 'Guide the canine player to perform the Action Card without any hand gestures',
    'Long Distance Call': `Guide the canine player to perform the Action Card standing at least five steps away from them`
  };
  // Instructions walkthrough state
  const miniGameExplanations: Record<string, string> = {
    'Two Ball Fetch': `
      1. Win by: Getting more balls fetched under 30 seconds.
      2. Set Up: You get the two balls on your turn, the timer starts the moment you toss the first one.
*The throw has to be at least three times the length of the canine player.
*For the fetch to count the canine player has to come to where you can pick up the ball without moving one of your feet.
      3. How to Play: While keeping one foot glued where you are standing, throw the first ball, once the canine player brings it back, show the second one, when the canine player drops the first ball, throw the second one.
      4. Tie Breaker: Each player has a ball, standing next to each other, both throw it at the same time, the ball that gets fetched wins.
    `,
    'Sniff and Choose': `
      1. Win by: Having the canine player choose your hand over your opponent's.
      2. Set Up: Each player hides a treat in their closed fist. Both players kneel down facing each other about 3 feet apart.
      3. How to Play: Present both closed fists to the canine player simultaneously. The canine player will sniff and choose one fist by pawing, licking, or nudging it.
    `,
    'Hot Potato': `
      1. Win by: Not having the ball in your hands when the 30 second timer runs out.
      2. Set Up: Players stand on opposite sides of the room, one of them holding a ball.
      3. How to Play: The player that's empty handed calls the canine player's name, only then the player that has the ball passes it, the player receiving the ball lowers it in such a way that the canine player comes closer to take it, only then the player that is now empty handed calls the canine player's name to continue playing.
      4. Tie Breaker: In the event of the ball being mid air when the timer goes off, the game is repeated.
    `,
    'Hide and Seek': `
      1. Win by: If hiding, not being found, if seeking, having the canine player find the other player under 30 seconds.
      2. Set Up: "The player that picked up the card hides, while the other player takes the canine player to a different room, asks them to "Sit" and counts out loud to 10.
      3. How to Play: The timer begins when the player holding the canine player releases them and says "Find (Name of the hidden player)!" the canine player will search for the hidden player.
    `,
    'The Statue': `
      1. Win by: Keeping the canine player sitting the longest time possible up to 30 seconds.
      2. Set Up: Each player positions the canine player in a "Sit" about 3 feet away from them, the timer starts the moment the canine player's bottom touches the floor.
      3. How to Play: Each player gets a 30 second turn, as the canine player sits the human players count out loud the seconds.
      4. Tie Breaker: if both players reach the exact same count, repeat
  } the game, but this time, the player who is not counting takes a ball and bounces it for each second the canine player remains seated.
    `,
    'Pawathon': `
      1. Win by: Being the player to whom the canine player gives the most paws under 30 seconds.
      2. Set Up: Players take turns standing in front of the canine player to offer their hand repeatedly without reward until the end of the 30 seconds. 
*Both players reward at the end of their turn as to not discourage the canine player.
      3. How to Play: the canine player sits and each player 
  }asks for paw repeatedly. 
*only one paw at a time, double paws or high 10s don't count.
      4. Tie Breaker: Both players stand in front of the seated canina player , they both ask for Paw at the same time. whoever gets the paw wins.
    `,
    'Treasure Hunt': `
      1. Win by: If hiding the treat, not having it found, if hunting, having the canine player find the treat under 30 seconds.
      2. Set Up: "The player that picked the card hides the treat while the other player takes the canine player to a different room, asks them to "Sit" and counts out loud to 10.

      3. How to Play: The timer begins when the player holding the canine player releases them and says "find it" the canine player will search for the hidden treats.
    `,
    'Dog Roll': `
      1. Win by: Getting the canine player to complete the most rolls in a row under 30 seconds.
      2. Set Up: Each player positions the canine player in the "Down" position on a soft surface like grass or carpet.
      3. How to Play: Each player guides the canine player to "Roll Over." Count consecutive successful rolls until the canine player stops or gets up.
      4. Tie Breaker: If both dogs achieve the same number of rolls, go into a "Roll face off", where you take turns guiding the canine player to roll in sudden death format.
    `,
    'The Catcher': `
      1. Win by: Having the canine player catch the most treats out of 5 tosses.
      2. Set Up: Each player stands 2 long steps away from the canine player with 5 small treats. 
      3. How to Play: Toss each treat gently toward the canine player's mouth. Count successful catches. After both players complete their 5 tosses, compare scores.
      4. Tie Breaker: If tied, each player gets 3 additional tosses in sudden death format.
    `,
     'Give Me, Drop it, Leave it!': `
      1. Win by: Collecting the most points from the canine player giving you, dropping or leaving a toy under 30 seconds.
      2. Set Up: Each player starts by holding the toy in front of the canine player. 
      3. How to Play: Toss the toy, after each time the canine player performs one of the behaviors, toss it again. 
Each player asks the canine player to "Give me" for 1 point, "Drop it" 2 points and "Leave it" for 3 points.
      4. Tie Breaker: If tied, each player gets 3 additional tosses in sudden death format.
    `
  };

  let showInstructions = true;
  let currentStep = 1;
  const totalSteps = 8;
  let showMenuOverlay = false;

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

  // Save current state for undo functionality
  function saveCurrentState() {
    const currentState = {
      player1Cards: structuredClone(player1Cards),
      player2Cards: structuredClone(player2Cards),
      player3Cards: structuredClone(player3Cards),
      player1AdvantageCards: structuredClone(player1AdvantageCards),
      player2AdvantageCards: structuredClone(player2AdvantageCards),
      player3AdvantageCards: structuredClone(player3AdvantageCards),
      goldenBoneActive: goldenBoneActive,
      kitchenThiefActive: kitchenThiefActive,
      selectedChallengeCard: selectedChallengeCard,
      challengeCardPlayer: challengeCardPlayer,
      currentTurn: currentTurn,
      globalMiniGameCount: globalMiniGameCount,
      shuffledDeck: structuredClone(shuffledDeck),
      activeCard: activeCard,
      gameOver: gameOver,
      winner: winner
    };
    
    stateHistory.push(currentState);
    
    // Limit history to last 3 steps
    if (stateHistory.length > 3) {
      stateHistory.shift();
    }
  }

  // Undo last step
  function undoLastStep() {
    if (stateHistory.length === 0) return;
    
    const previousState = stateHistory.pop();
    
    // Restore all state variables
    player1Cards = previousState.player1Cards;
    player2Cards = previousState.player2Cards;
    player3Cards = previousState.player3Cards;
    player1AdvantageCards = previousState.player1AdvantageCards;
    player2AdvantageCards = previousState.player2AdvantageCards;
    player3AdvantageCards = previousState.player3AdvantageCards;
    goldenBoneActive = previousState.goldenBoneActive;
    kitchenThiefActive = previousState.kitchenThiefActive;
    selectedChallengeCard = previousState.selectedChallengeCard;
    challengeCardPlayer = previousState.challengeCardPlayer;
    currentTurn = previousState.currentTurn;
    globalMiniGameCount = previousState.globalMiniGameCount;
    shuffledDeck = previousState.shuffledDeck;
    activeCard = previousState.activeCard;
    gameOver = previousState.gameOver;
    winner = previousState.winner;
  }

  function activateChallengeCard(card: Card, player: 1 | 2 | 3) {
    if (selectedChallengeCard) return; // Only one active challenge card allowed
    
    saveCurrentState();
    
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

    // Clear state history when resetting game
    stateHistory = [];

    // Reset global timer
    clearInterval(globalTimerInterval);
    globalTimer = 1200;
    globalTimerRunning = false;
    globalTimerStarted = false;
    isTimerWarning = false;

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

    saveCurrentState();

    // Start global timer on first card draw
    if (!globalTimerStarted && player1Cards.length === 0 && player2Cards.length === 0 && player3Cards.length === 0) {
      globalTimerStarted = true;
      startGlobalTimer();
    }

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
      }, 1000);
    }
  }

  function getTimerDuration() {
    if (!activeCard) return 0;
    if (activeCard.category === 'Action') return 30;
    if (activeCard.category === 'Mini Game') return 30;
    return 0;
  }

  function getMiniGameAdvantageMessage(count: number): string {
    switch (count) {
      case 1:
        return "You have won the Infinite Time Advantage, with which your turn has no time limit.";
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
    saveCurrentState();
    
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

    saveCurrentState();

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
    if (!activeCard || activeCard.category!== 'Action' || gameOver) return;

    saveCurrentState();

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

    saveCurrentState();

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

  function handleRecordedVideo(event) {
    console.log('Video action received:', event.detail);
    
    if (event.detail.status === 'completed') {
      actionCompleted();
    } else if (event.detail.status === 'failed') {
      actionCardFailed();
    }
    
    showVideoRecorder = false;
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
    if (message.includes("Infinite Time")) {
      return 27;
    } else if (message.includes("Rain Coat")) {
      return 28;
    } else if (message.includes("Kitchen Thieve")) {
      return 29;
    }
    return 27; // Default fallback
  }

  function startGlobalTimer() {
    if (globalTimerRunning || gameOver) return;

    globalTimerRunning = true;
    globalTimerInterval = setInterval(() => {
      globalTimer--;

      // Update warning state when 5 minutes (300 seconds) or less remain
      isTimerWarning = globalTimer <= 300;

      if (globalTimer <= 0) {
        clearInterval(globalTimerInterval);
        globalTimerRunning = false;
        endGameByTimer();
      }
    }, 1000);
  }

  function pauseGlobalTimer() {
    if (globalTimerRunning) {
      clearInterval(globalTimerInterval);
      globalTimerRunning = false;
    }
  }

  function resumeGlobalTimer() {
    if (!globalTimerRunning && globalTimerStarted && !gameOver && globalTimer > 0) {
      startGlobalTimer();
    }
  }

  function endGameByTimer() {
    gameOver = true;

    const numPlayers = getNumPlayers();
    const player1ActionCount = player1Cards.filter(c => c.category === 'Action').length;
    const player2ActionCount = player2Cards.filter(c => c.category === 'Action').length;
    const player3ActionCount = numPlayers === 3 ? player3Cards.filter(c => c.category === 'Action').length : 0;

    if (numPlayers === 3) {
      if (player1ActionCount > player2ActionCount && player1ActionCount > player3ActionCount) {
        winner = 1;
      } else if (player2ActionCount > player1ActionCount && player2ActionCount > player3ActionCount) {
        winner = 2;
      } else if (player3ActionCount > player1ActionCount && player3ActionCount > player2ActionCount) {
        winner = 3;
      } else {
        showTieOverlay = true;
      }
    } else {
      if (player1ActionCount > player2ActionCount) {
        winner = 1;
      } else if (player2ActionCount > player1ActionCount) {
        winner = 2;
      } else {
        showTieOverlay = true;
      }
    }
  }

  function formatGlobalTimer(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function toggleMenuOverlay() {
    if (!showMenuOverlay) {
      pauseGlobalTimer();
    } else {
      resumeGlobalTimer();
    }
    showMenuOverlay = !showMenuOverlay;
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
    position: relative;
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
    height: 100px;
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
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
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
    width: 60px;
    height: 85px;
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
    display: fixed;
     width: 185px;
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
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
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

  .card-info-icon {
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.2s ease;
    z-index: 10;
    backdrop-filter: blur(5px);
  }

  .card-info-icon svg {
    width: 35px;
    height: 40px;
     z-index: 1000;
  }

  .instruction-icon:hover {
    background: rgba(100, 108, 255, 1);
    transform: scale(1.1);
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

  .golden-bone-active-illustration {
    display: block;
    margin: -1rem;
    width: 80px;
    height: 80px;
    object-fit: contain ;
    filter: drop-shadow(0 0 6px #ffd700);
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
      0 -1px 2px #22c55e,
      0 1px 2px #22c55e,
      0 2px 4px rgba(0,0,0,0.3);
  }

  .turn-indicator.player2 {
    text-shadow: 
     0 -1px 2px #1d4ed8,
     0 1px 2px #1d4ed8,
      0 2px 4px rgba(0,0,0,0.3);
  }

  .turn-indicator.player3 {
    text-shadow: 
      0 -1px 2px #dc2626,
      0 1px 2px #dc2626,
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
    width: 45px;
    height: 65px;
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

  .menu-icon-btn {
    position: fixed;
    top: .25rem;
    right: .25rem;
    padding: 0.13rem 0.25rem;
    font-size: 0.6rem;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    z-index: 1000;
    transition: background 0.2s ease;
  }

  .menu-icon-btn:hover {
    background: rgba(255, 255, 255, 1);
  }

  .global-timer-display {
    position: fixed;
    top: 45px;
    left: 4px;
    padding: 0.1rem 0.4rem;
    font-size: 0.5rem;
    font-weight: 600;
    color: white;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    z-index: 1000;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.05em;
    text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
    transition: background 0.3s ease, border-color 0.3s ease;
  }

  .global-timer-display.warning {
    background: #DC2626;
    border-color: #991B1B;
    box-shadow: 0 0 8px rgba(220, 38, 38, 0.6);
  }

  .timer-button {
    position: absolute;
    top: 150px;
    left: calc(50% + 130px);
    width: 40px;
    height: 40px;
    background: linear-gradient(45deg, #333, #000);
    color: #ffffff;
    border: none;
    padding: 0;
    font-size: 0.8rem;
    font-weight: bold;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }

  .timer-button:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .timer-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .timer-button svg {
    width: 40px;
    height: 40px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  .action-completed-btn {
    position: absolute;
    top: 200px;
    left: calc(50% + 130px);
    width: 40px;
    height: 40px;
    background: linear-gradient(45deg, #22c55e, #16a34a);
    color: #ffffff;
    border: none;
    padding: 0;
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-completed-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
  }

  .action-completed-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .action-failed-btn {
    position: absolute;
    top: 250px;
    left: calc(50% + 130px);
    width: 40px;
    height: 40px;
    background: linear-gradient(45deg, #ef4444, #dc2626);
    color: #ffffff;
    border: none;
    padding: 0;
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-failed-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  }

  .action-failed-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .player-section {
    border-radius: 12px;
    padding: 0.2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    gap: 0.5rem;
  }
  
   .player-section.player1 {
    border: 0.2px #22c55e;
    line-height: 1;
    background-color: rgba(34, 197, 94, 0.1);
  }

  .player-section.player2 {
    border: 0.2px #1d4ed8;
    background-color: rgba(29, 78, 216, 0.1);
  }
  
  .player-section.player3 {
    border: 0.2px #dc2626;
    background-color: rgba(220, 38, 38.1);
  }

  .player-content {
    display: flex;
    align-items: center;
    gap: 0.1rem;
    width: 100%;
    justify-content: center;
  }

  .player-cards-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .cards-container {
    display: flex;
    flex-wrap: wrap;
    gap: .5rem;
    justify-content: center;
  }

  .advantage-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .mini-game-win-btn {
    border-radius: 8px;
    border: none;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.25s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    white-space: nowrap;
  }

  .mini-game-win-btn-p1 {
    background-color: #22c55e;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }

  .mini-game-win-btn-p1:hover:not(.disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
  }

  .mini-game-win-btn-p2 {
    background-color:  #1d4ed8;
    box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
  }

  .mini-game-win-btn-p2:hover:not(.disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(29, 78, 216, 0.4);
  }

  .mini-game-win-btn-p3 {
    background-color: #dc2626;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }

  .mini-game-win-btn-p3:hover:not(.disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
  }

  .mini-game-win-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    pointer-events: none;
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
        <h1 class="instructions-title">Player Setup</h1>
        <div class="instructions-section" style="--delay: 0.5s">
          <p>Let's get you and your furry friend ready to play!</p>
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
          <p><strong>In order to win, be the first player to collect {player3Name.trim() ? 'four' : 'six'} Action Cards by successfully completing dog training tasks.</strong></p>
          <p>Your turn begins by picking up the card facing down at the top of the deck.</p>
        </div>
      {/if}

      {#if currentStep === 4}
        <h1 class="instructions-title">Action Cards</h1>
        <div class="instructions-section" style="--delay: 0.5s">
          <p><strong>Training commands to perform with your dog</strong></p>
          <div class="card small-card edge-action" style="margin: 1rem auto;">
            <img src="/card-images/6.png" class="card-image" />
          </div>
          <p>Guide {dogName || 'your dog'} to complete the action shown.</p>
          <p><strong>Success:</strong> Reward {dogName || 'your dog'} with a treat and keep the card.</p>
          <p><strong>Fail:</strong> The card is placed at the bottom of the deck.</p>
        </div>
      {/if}

      {#if currentStep === 5}
        <h1 class="instructions-title">Challenge Cards</h1>
        <div class="instructions-section" style="--delay: 0.5s">
           <p><strong>Make Action Cards harder for opponents</strong></p>
          <div class="card small-card edge-challenge" style="margin: 1rem auto;">
            <img src="/card-images/11.png" class="card-image" />
          </div>
         <p>As an opponent reveals an Action Card, you can play your Challenge Card to make their turn more difficult.</p>
           <p>From your reserve, tap on it to trigger its effect.</p>
        </div>
      {/if}

      {#if currentStep === 6}
        <h1 class="instructions-title">Mini-Game Cards</h1>
        <div class="instructions-section" style="--delay: 0.5s">
          <p><strong>Competitive challenges that give you special advantages</strong></p>
           <div class="card small-card edge-mini-game" style="margin: 1rem auto;">
            <img src="/card-images/19.png" class="card-image" />
          </div>
          <p>Once a Mini-Game card is revealed, all players compete following the unique rules of that card. The winner earns a special advantage.</p>
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
          <p>With which your turn has no time limit.</p>
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
          <button class="skip-button" onclick={goBack} style="margin-right: 1rem;">
            Back
          </button>
        {/if}
        {#if currentStep === 2}
          <button class="start-button" onclick={startGame}>
            Next
          </button>
        {:else}
          <button class="start-button" onclick={startGame}>
            {currentStep < totalSteps ? 'Next' : 'Start Playing!'}
          </button>
        {/if}
        <button class="skip-button" onclick={skipInstructions}>
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
        <button class="start-button" onclick={animateShuffle}>
          Restart Game
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="deck-area">
  <!-- Menu Icon Button -->
  <button class="menu-icon-btn" onclick={toggleMenuOverlay}>
    <h3>||</h3>
  </button>

  <!-- Global Timer Display -->
  {#if globalTimerStarted && !gameOver}
    <div class="global-timer-display" class:warning={isTimerWarning}>
      {formatGlobalTimer(globalTimer)}
    </div>
  {/if}

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
    {#if timerRunning}
      <div class="player-turn-countdown">
        {timer}s
      </div>
    {/if}
  {/if}

  <!-- Golden Bone Illustration -->
  {#if goldenBoneActive}
    <div style="text-align: center; margin-bottom: 1rem;">
      <img src="/golden-bone-illustration.png" class="golden-bone-active-illustration" />
    </div>
  {/if}

  <div
    class="deck-container"
    onclick={revealNextCard}
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
             style="cursor: pointer;"
             onclick={() => {
               isReviewingInstructions = true;
               if (activeCard.category === 'Action') {
                 showActionInstruction(activeCard);
               } else if (activeCard.category === 'Challenge') {
                 showChallengeInstruction(activeCard);
               } else if (activeCard.category === 'Mini Game') {
                 showMiniGameInstruction(activeCard);
               }
             }}
             class:flying-left={flying && flyingDirection === 'left'}
             class:flying-right={flying && flyingDirection === 'right'}>
          <img src="/card-images/{activeCard.id}.png" alt="Card {activeCard.id}" class="card-image" />
        </div>

        <!-- If challenge card active, show it side by side -->
        {#if selectedChallengeCard}
          <div class="card open edge-challenge"
               style="cursor: pointer;"
               onclick={() => showChallengeInstruction(selectedChallengeCard)}>
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
      
      {#if activeCard.category === 'Action'}
        <button 
          class="action-completed-btn" 
          onclick={actionCompleted} 
          disabled={flying || gameOver}
        >
          ✓
        </button>
        <button 
          class="action-failed-btn" 
          onclick={actionCardFailed} 
          disabled={flying || gameOver}
        >
          ✗
        </button>
      {/if}
      
      <!-- Video Recording for Action and Mini Game cards -->
      {#if activeCard.category === 'Action' || activeCard.category === 'Mini Game'}
        <VideoRecorder on:videoAction={handleRecordedVideo} />
      {/if}

      <!-- Timer Button positioned below the recording button -->
      {#if canStartTimer()}
        <button class="timer-button" onclick={startTimer} disabled={!canStartTimer()}>
          <svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" viewBox="0,0,172,172" style="enable-background:new 0 0 172 172;" version="1.1">
<defs>
<mask id="mask" mask-type="alpha">
<g>
<path d="M49,27L124,27L124,156L49,156L49,27Z" fill="#000000"/>
</g>
</mask>
<mask id="mask_2" mask-type="alpha">
<g>
<path d="M49.4062,137L122.566,137L122.566,154.707L49.4062,154.707L49.4062,137Z" fill="#000000"/>
</g>
</mask>
<mask id="mask_3" mask-type="alpha">
<g>
<path d="M49.4062,27.793L122.566,27.793L122.566,46L49.4062,46L49.4062,27.793Z" fill="#ffffff"/>
</g>
</mask>
</defs>
<g id="layer0">
<g mask="url(#mask)">
<g mask="url(#mask_2)">
<path d="M53.7891,141.32C53.5,141.32 53.2617,141.555 53.2617,141.848L53.2617,150.332C53.2617,150.621 53.5,150.859 53.7891,150.859L118.195,150.859C118.484,150.859 118.723,150.621 118.723,150.332L118.723,141.848C118.723,141.555 118.484,141.32 118.195,141.32L53.7891,141.32ZM118.195,154.707L53.7891,154.707C51.3789,154.707 49.4141,152.742 49.4141,150.332L49.4141,141.848C49.4141,139.434 51.3789,137.473 53.7891,137.473L118.195,137.473C120.605,137.473 122.57,139.434 122.57,141.848L122.57,150.332C122.57,152.742 120.605,154.707 118.195,154.707L118.195,154.707Z" fill="#ffffff"/>
</g>
<path d="M111.641,141.32C110.578,141.32 109.719,140.461 109.719,139.398L109.719,137.312C109.719,119.094 100.469,102.488 84.9766,92.8867C68.3477,82.5781 58.418,64.7461 58.418,45.1875L58.418,43.1016C58.418,42.043 59.2812,41.1797 60.3438,41.1797C61.4062,41.1797 62.2656,42.043 62.2656,43.1016L62.2656,45.1875C62.2656,63.4062 71.5156,80.0117 87.0078,89.6133C103.637,99.9219 113.566,117.754 113.566,137.312L113.566,139.398C113.566,140.461 112.703,141.32 111.641,141.32L111.641,141.32Z" fill="#ffffff"/>
<path d="M94.4062,86.7422C93.8945,86.7422 93.3789,86.5391 92.9961,86.1328C92.2734,85.3555 92.3164,84.1406 93.0938,83.4141C103.66,73.5625 109.719,59.6289 109.719,45.1875L109.719,43.1016C109.719,42.043 110.578,41.1797 111.641,41.1797C112.703,41.1797 113.566,42.043 113.566,43.1016L113.566,45.1875C113.566,60.6875 107.059,75.6484 95.7188,86.2266C95.3477,86.5742 94.875,86.7422 94.4062,86.7422L94.4062,86.7422Z" fill="#ffffff"/>
<path d="M60.3438,141.32C59.2812,141.32 58.418,140.461 58.418,139.398L58.418,137.312C58.418,121.332 65.2617,106.066 77.1953,95.4297C77.9844,94.7188 79.2031,94.7891 79.9102,95.5859C80.6211,96.375 80.5508,97.5938 79.7539,98.2969C68.6406,108.207 62.2656,122.426 62.2656,137.312L62.2656,139.398C62.2656,140.461 61.4062,141.32 60.3438,141.32L60.3438,141.32Z" fill="#ffffff"/>
<g mask="url(#mask_3)">
<path d="M53.7891,31.6406C53.5,31.6406 53.2617,31.8789 53.2617,32.168L53.2617,40.6523C53.2617,40.9453 53.5,41.1797 53.7891,41.1797L118.195,41.1797C118.484,41.1797 118.723,40.9453 118.723,40.6523L118.723,32.168C118.723,31.8789 118.484,31.6406 118.195,31.6406L53.7891,31.6406ZM118.195,45.0273L53.7891,45.0273C51.3789,45.0273 49.4141,43.0664 49.4141,40.6523L49.4141,32.168C49.4141,29.7578 51.3789,27.793 53.7891,27.793L118.195,27.793C120.605,27.793 122.57,29.7578 122.57,32.168L122.57,40.6523C122.57,43.0664 120.605,45.0273 118.195,45.0273L118.195,45.0273Z" fill="#ffffff"/>
</g>
</g>
</g>
</svg>

        </button>
      {/if}
    </div>
  {/if}
  {/if}

  <div style="display:flex; justify-content: space-around; width: 100%; margin-top: 1rem;">
    <!-- Player 1 Cards -->
    <div class="player-section" class:active-player-p1={currentTurn === 1}>
      {#if activeCard && activeCard.category === 'Mini Game'}
        <div 
          class="mini-game-win-btn mini-game-win-btn-p1" 
          class:disabled={flying || gameOver}
          onclick={() => playerWins(1)}
          title="{player1Name || 'Player 1'} Wins This Round"
        >
         {player1Name || 'Player 1'} Wins
        </div>
      {/if}

   <h3>{player1Name || 'Player 1'}'s Cards</h3>
      <h3>{player1Cards.filter(c => c.category === 'Action').length}</h3>
        
      <div class="player-cards-container" class:compact-display={player1Cards.length > 2}>
        <!-- Top row: Challenge and Mini Game cards (non-action) with click for Challenge -->
        <div class="top-row">
          {#each player1Cards.filter(c => c.category === 'Challenge' || c.category === 'Mini Game') as card (card.id)}
            <div
              class="card tiny-card edge-{card.category.toLowerCase()}"
              onclick={() => {
                if (card.category === 'Challenge' && !selectedChallengeCard && !gameOver && currentTurn !== 1) {
                  activateChallengeCard(card, 1);
                }
              }}
              style="cursor: {card.category === 'Challenge' && !selectedChallengeCard && !gameOver && currentTurn !== 1 ? 'pointer' : 'default'}"
              title={card.label}
            >
              <img src="/card-images/{card.id}.png" alt={card.label} class="card-image" />
            </div>
          {/each}
          
          <!-- Advantage cards -->
          {#each player1AdvantageCards as advantageCard (advantageCard.id)}
            <div
              class="card tiny-card edge-advantage"
              onclick={() => {
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
    </div>

    <!-- Player 2 Cards -->
    <div class="player-section" class:active-player-p2={currentTurn === 2}>
      {#if activeCard && activeCard.category === 'Mini Game'}
        <div 
          class="mini-game-win-btn mini-game-win-btn-p2" 
          class:disabled={flying || gameOver}
          onclick={() => playerWins(2)}
          title="{player2Name || 'Player 2'} Wins This Round"
        >
          {player2Name || 'Player 2'} Wins
        </div>
      {/if}

      <h3>{player2Name || 'Player 2'}'s Cards</h3>
        <h3>{player2Cards.filter(c => c.category === 'Action').length}</h3>

      <div class="player-cards-container" class:compact-display={player2Cards.length > 2}>
        <!-- Top row: Challenge and Mini Game cards (non-action) with click for Challenge -->
        <div class="top-row">
          {#each player2Cards.filter(c => c.category === 'Challenge' || c.category === 'Mini Game') as card (card.id)}
            <div
              class="card tiny-card edge-{card.category.toLowerCase()}"
              onclick={() => {
                if (card.category === 'Challenge' && !selectedChallengeCard && !gameOver && currentTurn !== 2) {
                  activateChallengeCard(card, 2);
                }
              }}
              style="cursor: {card.category === 'Challenge' && !selectedChallengeCard && !gameOver && currentTurn !== 2 ? 'pointer' : 'default'}"
              title={card.label}
            >
              <img src="/card-images/{card.id}.png" alt={card.label} class="card-image" />
            </div>
          {/each}
          
          <!-- Advantage cards -->
          {#each player2AdvantageCards as advantageCard (advantageCard.id)}
            <div
              class="card tiny-card edge-advantage"
              onclick={() => {
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
    </div>

    <!-- Player 3 Cards (only show if player3Name exists) -->
    {#if player3Name}
      <div class="player-section" class:active-player-p3={currentTurn === 3}>
        {#if activeCard && activeCard.category === 'Mini Game'}
          <div 
            class="mini-game-win-btn mini-game-win-btn-p3" 
            class:disabled={flying || gameOver}
            onclick={() => playerWins(3)}
            title="{player3Name} Wins This Round"
          >
            {player3Name || 'Player 3'} Wins
          </div>
        {/if}

        <h3>{player3Name}'s Cards</h3>
          <h3>{player1Cards.filter(c => c.category === 'Action').length}</h3>

        <div class="player-cards-container" class:compact-display={player3Cards.length > 2}>
          <!-- Top row: Challenge and Mini Game cards (non-action) with click for Challenge -->
          <div class="top-row">
            {#each player3Cards.filter(c => c.category === 'Challenge' || c.category === 'Mini Game') as card (card.id)}
              <div
                class="card tiny-card edge-{card.category.toLowerCase()}"
                onclick={() => {
                  if (card.category === 'Challenge' && !selectedChallengeCard && !gameOver && currentTurn !== 3) {
                    activateChallengeCard(card, 3);
                  }
                }}
                style="cursor: {card.category === 'Challenge' && !selectedChallengeCard && !gameOver && currentTurn !== 3 ? 'pointer' : 'default'}"
                title={card.label}
              >
                <img src="/card-images/{card.id}.png" alt={card.label} class="card-image" />
              </div>
            {/each}
            
            <!-- Advantage cards -->
            {#each player3AdvantageCards as advantageCard (advantageCard.id)}
              <div
                class="card tiny-card edge-advantage"
                onclick={() => {
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
      </div>
    {/if}
  </div>

   {#if gameOver && winner !== null}
    <div
      class="winner-overlay"
      onclick={animateShuffle}
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
<div class="mini-game-explanation" onclick={hideMiniGameInstruction}>
  <h4>{activeCard?.label} Rules</h4>
  <div>{currentMiniGameExplanation}</div>
  <button 
    onclick={hideMiniGameInstruction} 
    style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ffd700; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; display: block; margin-left: auto; margin-right: auto;"
  >
    Got it!
  </button>
</div>
{/if}

{#if showAdvantageOverlay}
  <div class="advantage-message">
    <div>{currentAdvantageMessage}</div>
    <button onclick={dismissAdvantageOverlay} style="margin-top: 1rem; padding: 0.75rem 1.5rem; font-size: 1rem; background: #ff6b35; color: white; border: none; border-radius: 8px; cursor: pointer;">
      Tap to Continue
    </button>
  </div>
{/if}

{#if showActionTooltip && actionTooltipCard}
  <div class="action-tooltip" onclick={hideActionInstruction}>
    <h4>{actionTooltipCard.label}</h4>
    <p>{actionTooltipContent}</p>
    <button 
      onclick={hideActionInstruction} 
      style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ffd700; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;"
    >
      Got it!
    </button>
  </div>
{/if}

<!-- Menu Overlay -->
<MenuOverlay
  show={showMenuOverlay}
  onClose={toggleMenuOverlay}
  onUndo={undoLastStep}
  onToggleInstructions={reviewInstructions}
  onOpenGameReview={() => {}}
  timer={globalTimer}
  isTimerWarning={isTimerWarning}
  globalTimerStarted={globalTimerStarted}
/>