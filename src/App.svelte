<script lang="ts">
  import { tick } from 'svelte';
  import VideoRecorder from './lib/VideoRecorder.svelte';

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
    'Down': `With a treat in your hand, grace the canine player chin and chest as you place your hand flat on the ground in between their front legs, waiting for them to lay down.`,
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
*The thro
  }w has to be at least three times the length of the canine player.
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
      4. Tie Breaker: if both players reach the exact same count, repeat the game, but this time, the player who is not counting takes a ball and bounces it for each second the canine player remains seated.
    `,
    'Pawathon': `
      1. Win by: Being the player to whom the canine player gives the most paws under 30 seconds.
      2. Set Up: Players take turns standing in front of the canine player to offer their hand repeatedly without reward until the end of the 30 seconds. 
*Both players reward at the end of their turn as to not discourage the canine player.
      3. How to Play: the canine player sits and each player asks for paw repeatedly. 
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
    if (!activeCard || activeCard.category !== 'Action' || gameOver) return;

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
    width: 28px;
    height: 28px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
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

  .card-info-icon:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.1);
  }

  .card-info-icon svg {
    width: 16px;
    height: 16px;
  }

  .instruction-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(100, 108, 255, 0.9);
    color: white;
    border: none;
    font-size: 0.8rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;
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

  .timer-button {
    position: fixed;
    top: 160px;
    right: 20px;
    width: 60px;
    height: 60px;
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
    width: 24px;
    height: 24px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
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
  <button class="review-button" onclick={reviewInstructions} disabled={isShuffling || gameOver}>
    Review Instructions
  </button>
  
  <button 
    class="undo-btn" 
    onclick={undoLastStep}
    disabled={stateHistory.length === 0 || isShuffling || gameOver}
  >
    Back
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
             class:flying-left={flying && flyingDirection === 'left'}
             class:flying-right={flying && flyingDirection === 'right'}>
          <img src="/card-images/{activeCard.id}.png" alt="Card {activeCard.id}" class="card-image" />
          <button 
            class="card-info-icon"
            onclick={() => {
              isReviewingInstructions = true;
              isReviewingInstructions = true;
              if (activeCard.category === 'Action') {
                showActionInstruction(activeCard);
              } else if (activeCard.category === 'Challenge') {
                showChallengeInstruction(activeCard);
              } else if (activeCard.category === 'Mini Game') {
                showMiniGameInstruction(activeCard);
              }
            }}
            title="Show instructions for this card"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
            </svg>
          </button>
        </div>

        <!-- If challenge card active, show it side by side -->
        {#if selectedChallengeCard}
          <div class="card open edge-challenge">
          <img src="/card-images/{selectedChallengeCard.id}.png" alt="Card {selectedChallengeCard.id}" class="card-image" />
            <button 
              class="card-info-icon"
              onclick={() => showChallengeInstruction(selectedChallengeCard)}
              title="Show instructions for this challenge card"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
              </svg>
            </button>
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
        <button onclick={actionCompleted} disabled={flying || gameOver} style="font-size: 0.9rem; padding: 0.25rem 0.5rem; background: #22c55e; color: white;">
          Action Completed
        </button>
        <button onclick={actionCardFailed} disabled={flying || gameOver} style="font-size: 0.9rem; padding: 0.25rem 0.5rem; background: #ff6b6b; color: white;">
          Action Failed
        </button>
      {/if}
      
      {#if timerRunning}
        <div style="font-weight: bold; font-size: 1.2rem; color: #ff6b35;">
          Timer: {timer}s
        </div>
      {/if}

      <!-- Video Recording for Action and Mini Game cards -->
      {#if activeCard.category === 'Action' || activeCard.category === 'Mini Game'}
        <VideoRecorder />
      {/if}

      <!-- Timer Button positioned below the recording button -->
      {#if canStartTimer()}
        <button class="timer-button" onclick={startTimer} disabled={!canStartTimer()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 2V4H16V2H8Z" fill="currentColor"/>
            <path d="M7 6C7 5.44772 7.44772 5 8 5H16C16.5523 5 17 5.44772 17 6V7C17 7.55228 16.5523 8 16 8H15V9C15 10.1046 14.1046 11 13 11H12.5L16 14.5V16C16 17.1046 15.1046 18 14 18H10C8.89543 18 8 17.1046 8 16V14.5L11.5 11H11C9.89543 11 9 10.1046 9 9V8H8C7.44772 8 7 7.55228 7 7V6Z" fill="currentColor"/>
            <path d="M8 19V20H16V19H8Z" fill="currentColor"/>
            <circle cx="12" cy="14" r="1" fill="currentColor"/>
          </svg>
        </button>
      {/if}
    </div>
  {/if}
  {/if}

  <div style="display:flex; justify-content: space-around; width: 100%; margin-top: 1rem;">
    <!-- Player 1 Cards -->
    <div>
      {#if activeCard && activeCard.category === 'Mini Game'}
        <button onclick={() => playerWins(1)} disabled={flying || gameOver} style="margin-bottom: 0.5rem;">
          {player1Name || 'Player 1'} Wins This Round
        </button>
      {/if}

      <h3>{player1Name || 'Player 1'}'s Cards ({player1Cards.filter(c => c.category === 'Action').length})</h3>

      <!-- Top row: Challenge and Mini Game cards (non-action) with click for Challenge -->
      <div class="top-row">
        {#each player1Cards.filter(c => c.category === 'Challenge' || c.category === 'Mini Game') as card (card.id)}
          <div
            class="card tiny-card edge-{card.category.toLowerCase()}"
            onclick={() => {
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

    <!-- Player 2 Cards -->
    <div>
      {#if activeCard && activeCard.category === 'Mini Game'}
        <button onclick={() => playerWins(2)} disabled={flying || gameOver} style="margin-bottom: 0.5rem;">
          {player2Name || 'Player 2'} Wins This Round
        </button>
      {/if}

      <h3>{player2Name || 'Player 2'}'s Cards ({player2Cards.filter(c => c.category === 'Action').length})</h3>

      <!-- Top row: Challenge and Mini Game cards (non-action) with click for Challenge -->
      <div class="top-row">
        {#each player2Cards.filter(c => c.category === 'Challenge' || c.category === 'Mini Game') as card (card.id)}
          <div
            class="card tiny-card edge-{card.category.toLowerCase()}"
            onclick={() => {
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

    <!-- Player 3 Cards (only show if player3Name exists) -->
    {#if player3Name}
      <div>
        {#if activeCard && activeCard.category === 'Mini Game'}
          <button onclick={() => playerWins(3)} disabled={flying || gameOver} style="margin-bottom: 0.5rem;">
            {player3Name} Wins This Round
          </button>
        {/if}

        <h3>{player3Name}'s Cards ({player3Cards.filter(c => c.category === 'Action').length})</h3>

        <!-- Top row: Challenge and Mini Game cards (non-action) with click for Challenge -->
        <div class="top-row">
          {#each player3Cards.filter(c => c.category === 'Challenge' || c.category === 'Mini Game') as card (card.id)}
            <div
              class="card tiny-card edge-{card.category.toLowerCase()}"
              onclick={() => {
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