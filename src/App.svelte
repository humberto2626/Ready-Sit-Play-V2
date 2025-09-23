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
      3. How to Play: Each player guides the canine player to "Roll Over." Count consecutive successful rolls until the canine player stops.
    `
  };