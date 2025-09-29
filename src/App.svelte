<script lang="ts">
  import { tick } from 'svelte';
  import VideoRecorder from './lib/VideoRecorder.svelte';
  import GameReview from './lib/GameReview.svelte';

  let showVideoRecorder = false;
  let showGameReview = false;

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

  function openGameReview() {
    showGameReview = true;
  }

  function closeGameReview() {
    showGameReview = false;
  }

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
        } else
      }
    }, 1000);
  }